import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resolve the authenticated user from either:
 *   1. Next.js request cookies (SSR cookie auth)
 *   2. `Authorization: Bearer <token>` header (JWT)
 *
 * This makes the endpoint work from a Next.js API route
 * (cookies) AND from a same-origin fetch (cookies) AND
 * from the TusUploader which explicitly sends a Bearer token.
 */
async function resolveUser(req: NextRequest) {
  // 1) Try cookie-based auth first (standard Next.js SSR flow)
  const supabase = await createServerSupabaseClient();
  const { data: cookieAuth, error: cookieErr } =
    await supabase.auth.getUser();
  if (!cookieErr && cookieAuth?.user) return cookieAuth.user;

  // 2) Try Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Verify the JWT using the public anon key
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
    const { data: headerAuth, error: headerErr } =
      await verifier.auth.getUser(token);
    if (!headerErr && headerAuth?.user) return headerAuth.user;
  }

  return null;
}

/**
 * POST /api/upload/tus — TUS 1.0.0 Creation handler.
 * Creates an upload session and returns a Location header
 * pointing at /api/upload/tus/<uploadId>.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Read standard TUS headers
    const tusResumable = req.headers.get("tus-resumable");
    if (tusResumable && tusResumable !== "1.0.0") {
      return NextResponse.json(
        { error: "Unsupported TUS version" },
        { status: 412 }
      );
    }

    const uploadLength = req.headers.get("upload-length");
    if (!uploadLength) {
      return NextResponse.json(
        { error: "Missing Upload-Length" },
        { status: 400 }
      );
    }

    const uploadMetadataHeader = req.headers.get("upload-metadata");
    const metadata = parseTusMetadata(uploadMetadataHeader);

    const fileName = metadata.filename || "file";
    const fileType = metadata.fileType || metadata.file_type || "application/octet-stream";
    const title = metadata.title || fileName.replace(/\.[^/.]+$/, "");
    const description = metadata.description || null;
    const memoryType = metadata.type || metadata.memoryType || "photo";

    // Resolve family_id — use client-supplied value or look up from DB
    let familyId = metadata.familyId || metadata.family_id;

    if (!familyId) {
      const { data: membership } = await admin
        .from("families")
        .select("id")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        familyId = membership.id;
      } else {
        // Fall back to first family the user is a member of
        const { data: memberships } = await admin
          .from("family_members")
          .select("family_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (memberships) familyId = memberships.family_id;
      }

      if (!familyId) {
        return NextResponse.json(
          { error: "You must create or join a family before uploading." },
          { status: 400 }
        );
      }
    }

    const uploadId = crypto.randomUUID();

    const { error: insertError } = await admin
      .from("tus_uploads")
      .insert({
        id: uploadId,
        user_id: user.id,
        family_id: familyId,
        file_name: fileName,
        file_type: fileType,
        file_size: parseInt(uploadLength, 10),
        bytes_uploaded: 0,
        title,
        description,
        memory_type: memoryType,
        status: "uploading",
      });

    if (insertError) {
      console.error("[TUS] create upload error:", insertError);
      return NextResponse.json(
        { error: "Failed to create upload" },
        { status: 500 }
      );
    }

    // TUS Location header must point at /api/upload/tus/<uploadId>
    const locationUrl = `${req.nextUrl.origin}/api/upload/tus/${uploadId}`;

    return new NextResponse(null, {
      status: 201,
      headers: {
        "Tus-Resumable": "1.0.0",
        Location: locationUrl,
        "Upload-Expires": new Date(Date.now() + 24 * 3600 * 1000).toUTCString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TUS] POST error:", err);
    return NextResponse.json(
      { error: "Upload creation failed" },
      { status: 500 }
    );
  }
}

/**
 * Parse a TUS Upload-Metadata header.
 * Format: `key1 base64val1,key2 base64val2,...`
 */
function parseTusMetadata(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;

  for (const pair of header.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx === -1) continue;

    const key = trimmed.slice(0, spaceIdx);
    const b64Value = trimmed.slice(spaceIdx + 1);
    try {
      result[key] = Buffer.from(b64Value, "base64").toString("utf8");
    } catch {
      result[key] = b64Value;
    }
  }
  return result;
}
