import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { createServerSupabaseClient } from "@/infrastructure/database/server";

/**
 * POST /api/upload/tus
 * Creates a new upload session and returns the upload ID
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse headers from tus-js-client
    const uploadLength = req.headers.get("upload-length");
    const uploadMetadata = req.headers.get("upload-metadata");

    const fileSize = parseInt(uploadLength || "0");

    // Parse metadata (base64 encoded)
    let filename = "file";
    let filetype = "application/octet-stream";
    let familyId = user.id;
    let type = "photo";
    let title = "";
    let description = "";

    if (uploadMetadata) {
      uploadMetadata.split(",").forEach((item: string) => {
        const [key, value] = item.trim().split(" ");
        if (key && value) {
          const decoded = atob(value);
          if (key === "filename") filename = decoded;
          if (key === "filetype") filetype = decoded;
          if (key === "familyId") familyId = decoded;
          if (key === "type") type = decoded;
          if (key === "title") title = decoded;
          if (key === "description") description = decoded;
        }
      });
    }

    if (!title) {
      title = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    }

    // Create upload record
    const supabaseAdmin = createAdminClient();
    
    const { data: upload, error } = await supabaseAdmin
      .from("tus_uploads")
      .insert({
        user_id: user.id,
        status: "uploading",
      })
      .select()
      .single();

    if (error || !upload) {
      console.error("[TUS] Failed to create upload:", error);
      return NextResponse.json(
        { error: "Failed to create upload" },
        { status: 500 }
      );
    }

    // Return upload ID in Location header
    const uploadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/upload/tus/${upload.id}`;

    return new NextResponse(null, {
      status: 201,
      headers: {
        Location: uploadUrl,
        "Tus-Resumable": "1.0.0",
        "Upload-Expires": new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(),
      },
    });
  } catch (err) {
    console.error("[TUS] Unexpected error:", err);
    return NextResponse.json({ error: "Failed to create upload" }, { status: 500 });
  }
}
