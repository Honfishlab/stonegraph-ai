import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { TusService } from "@/infrastructure/tus/service";

/**
 * HEAD /api/upload/tus/[uploadId]
 * Get upload status (bytes uploaded vs total)
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;
    const admin = createAdminClient();

    const { data: upload, error } = await admin
      .from("tus_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (error || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Upload-Offset": upload.bytes_uploaded.toString(),
        "Upload-Length": upload.file_size.toString(),
        "Tus-Resumable": "1.0.0",
      },
    });
  } catch (error) {
    console.error("[tus] HEAD error:", error);
    return NextResponse.json({ error: "Upload check failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/upload/tus/[uploadId]
 * Append chunk to upload
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;
    const tus = new TusService();

    const uploadOffset = parseInt(request.headers.get("upload-offset") || "0", 10);
    const tusResumable = request.headers.get("tus-resumable");

    if (tusResumable !== "1.0.0") {
      return NextResponse.json({ error: "Invalid TUS version" }, { status: 412 });
    }

    // Get upload record
    const admin = createAdminClient();
    const { data: upload, error: dbError } = await admin
      .from("tus_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (dbError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (uploadOffset !== upload.bytes_uploaded) {
      return NextResponse.json(
        { error: "Offset mismatch" },
        { status: 409 }
      );
    }

    // Read chunk from request body
    const chunk = await request.arrayBuffer();
    const chunkSize = chunk.byteLength;

    // Append chunk to file in storage
    const storagePath = `tus-uploads/${upload.user_id}/${uploadId}/data`;
    const { error: storageError } = await admin.storage
      .from("memories")
      .upload(storagePath, Buffer.from(chunk), {
        contentType: upload.file_type,
        upsert: true,
      });

    if (storageError) {
      console.error("[tus] PATCH upload error:", storageError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Update upload record
    const newOffset = uploadOffset + chunkSize;
    const isComplete = newOffset >= upload.file_size;

    const { error: updateError } = await admin
      .from("tus_uploads")
      .update({
        bytes_uploaded: newOffset,
        status: isComplete ? "complete" : "uploading",
      })
      .eq("id", uploadId);

    if (updateError) {
      console.error("[tus] PATCH update error:", updateError);
      return NextResponse.json({ error: "Upload update failed" }, { status: 500 });
    }

    // If complete, trigger finalization
    if (isComplete) {
      await tus.finalizeUpload(uploadId);
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Upload-Offset": newOffset.toString(),
        "Tus-Resumable": "1.0.0",
      },
    });
  } catch (error) {
    console.error("[tus] PATCH error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/upload/tus/[uploadId]
 * Cancel and remove upload
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;
    const tus = new TusService();

    await tus.cancelUpload(uploadId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[tus] DELETE error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
