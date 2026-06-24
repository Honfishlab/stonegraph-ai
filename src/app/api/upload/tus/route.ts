import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { TusService } from "@/infrastructure/tus/service";

/**
 * POST /api/upload/tus
 * Create new TUS upload
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle TUS POST (creation of new upload)
    const tusResumable = request.headers.get("tus-resumable");
    if (tusResumable !== "1.0.0") {
      return NextResponse.json(
        { error: "Invalid TUS version" },
        { status: 412 }
      );
    }

    const uploadLength = request.headers.get("upload-length");
    const uploadMetadata = request.headers.get("upload-metadata");

    if (!uploadLength) {
      return NextResponse.json(
        { error: "Missing upload-length header" },
        { status: 400 }
      );
    }

    const fileSize = parseInt(uploadLength, 10);
    const metadata = TusService.parseUploadMetadata(uploadMetadata);

    // Create upload record in database
    const admin = createAdminClient();
    const uploadId = crypto.randomUUID();

    const { error: dbError } = await admin.from("tus_uploads").insert({
      id: uploadId,
      user_id: user.id,
      file_name: metadata.filename || "unknown",
      file_size: fileSize,
      bytes_uploaded: 0,
      file_type: metadata.filetype || "application/octet-stream",
      title: metadata.title || metadata.filename || "Untitled",
      description: metadata.description || null,
      memory_type: metadata.type || "photo",
      family_id: metadata.family_id,
      metadata: metadata,
      status: "uploading",
    });

    if (dbError) {
      console.error("[tus] Create upload error:", dbError);
      return NextResponse.json({ error: "Failed to create upload" }, { status: 500 });
    }

    // Create upload folder in storage
    const storagePath = `tus-uploads/${user.id}/${uploadId}`;
    const { error: storageError } = await admin.storage
      .from("memories")
      .upload(`${storagePath}/.tus-meta`, JSON.stringify(metadata), {
        contentType: "application/json",
        upsert: false,
      });

    if (storageError) {
      console.error("[tus] Create storage folder error:", storageError);
      return NextResponse.json({ error: "Failed to create upload" }, { status: 500 });
    }

    // Return 201 Created with Location header
    const locationUrl = `/api/upload/tus/${uploadId}`;
    return new NextResponse(null, {
      status: 201,
      headers: {
        Location: locationUrl,
        "Tus-Resumable": "1.0.0",
        "Tus-Version": "1.0.0",
        "Tus-Extension": "creation,termination",
      },
    });
  } catch (error) {
    console.error("[tus] POST error:", error);
    return NextResponse.json({ error: "Upload creation failed" }, { status: 500 });
  }
}
