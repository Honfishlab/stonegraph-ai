import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { createServerSupabaseClient } from "@/infrastructure/database/server";

/**
 * POST /api/upload/tus
 * Creates a new upload session and returns the upload ID.
 * Implements the TUS 1.0.0 Creation protocol.
 */
export async function POST(req: NextRequest) {
  try {
    // Create server-side Supabase client (reads request cookies for auth)
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = authData.user;
    const admin = createAdminClient();

    // Parse standard TUS headers
    const uploadLength = req.headers.get("upload-length");
    const uploadMetadataHeader = req.headers.get("upload-metadata");

    if (!uploadLength) {
      return NextResponse.json(
        { error: "Missing Upload-Length header" },
        { status: 400 }
      );
    }

    // Parse the Upload-Metadata header (TUS spec: key base64value pairs)
    const metadata = parseTusMetadata(uploadMetadataHeader);

    const fileName = metadata.filename || "file";
    const fileType = metadata.fileType || metadata.file_type || "application/octet-stream";
    const title = metadata.title || fileName.replace(/\.[^/.]+$/, "");
    const description = metadata.description || "";
    const memoryType = (metadata.type || metadata.memoryType || "photo") as string;

    // Resolve family_id: client may pass it, otherwise look up user's family
    let familyId = metadata.familyId || metadata.family_id;

    if (!familyId) {
      // Find the user's first family membership
      const { data: membership } = await admin
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "You must belong to a family to upload files. Create one first." },
          { status: 400 }
        );
      }
      familyId = membership.family_id;
    }

    // Generate unique upload ID
    const uploadId = crypto.randomUUID();

    // Create the upload record
    const { data: upload, error } = await admin
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
        description: description || null,
        memory_type: memoryType,
        status: "uploading",
      })
      .select()
      .single();

    if (error) {
      console.error("[TUS] Failed to create upload:", error);
      return NextResponse.json(
        { error: "Failed to create upload" },
        { status: 500 }
      );
    }

    // Return the TUS Location header pointing at this specific upload
    const locationUrl = `${req.nextUrl.origin}/api/upload/tus/${uploadId}`;

    return new NextResponse(null, {
      status: 201,
      headers: {
        "Tus-Resumable": "1.0.0",
        Location: locationUrl,
        "Upload-Expires": new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(),
      },
    });
  } catch (err) {
    console.error("[TUS] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 }
    );
  }
}

/**
 * Parse the TUS Upload-Metadata header.
 * Format: "key1 base64value1,key2 base64value2,..."
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
      // Browser env: atob; Node env: Buffer
      const decoded =
        typeof atob === "function"
          ? atob(b64Value)
          : Buffer.from(b64Value, "base64").toString("utf8");
      result[key] = decoded;
    } catch {
      result[key] = b64Value;
    }
  }

  return result;
}
