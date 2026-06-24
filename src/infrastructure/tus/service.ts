import { createAdminClient } from "@/infrastructure/database/admin";
import { arweaveService } from "@/infrastructure/arweave/service";
import { addMemoryToAO } from "@/infrastructure/ao/service";

export class TusService {
  /**
   * Parse TUS Upload-Metadata header
   * Format: key1 value1,key2 value2,...
   */
  static parseUploadMetadata(metadataHeader: string | null): Record<string, string> {
    if (!metadataHeader) return {};

    const metadata: Record<string, string> = {};
    const pairs = metadataHeader.split(",");

    for (const pair of pairs) {
      const [key, valueBase64] = pair.trim().split(" ");
      if (key && valueBase64) {
        try {
          metadata[key] = Buffer.from(valueBase64, "base64").toString("utf-8");
        } catch {
          metadata[key] = "";
        }
      }
    }

    return metadata;
  }

  /**
   * Finalize TUS upload - move file to permanent location and create memory record
   */
  async finalizeUpload(uploadId: string) {
    const admin = createAdminClient();

    const { data: upload, error: dbError } = await admin
      .from("tus_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (dbError || !upload) {
      console.error("[tus] Finalize: upload not found", uploadId);
      return;
    }

    try {
      // Move file from tus-uploads to memories
      const sourcePath = `tus-uploads/${upload.user_id}/${uploadId}/data`;
      const destPath = `${upload.family_id}/${upload.user_id}/${Date.now()}-${upload.file_name}`;

      // Copy file
      const { error: copyError } = await admin.storage
        .from("memories")
        .copy(sourcePath, destPath);

      if (copyError) {
        throw new Error(`Copy failed: ${copyError.message}`);
      }

      // Delete temporary tus files
      await admin.storage.from("memories").remove([
        `tus-uploads/${upload.user_id}/${uploadId}/data`,
        `tus-uploads/${upload.user_id}/${uploadId}/.tus-meta`,
      ]);

      // Create memory record
      const { data: memory, error: memoryError } = await admin
        .from("memories")
        .insert({
          family_id: upload.family_id,
          uploaded_by: upload.user_id,
          type: upload.memory_type,
          title: upload.title,
          description: upload.description,
          file_name: upload.file_name,
          file_size: upload.file_size,
          file_type: upload.file_type,
          storage_path: destPath,
          storage_status: "stored",
          is_public: false,
        })
        .select()
        .single();

      if (memoryError) {
        throw new Error(`Memory creation failed: ${memoryError.message}`);
      }

      // Upload to Arweave
      const { data: fileData, error: downloadError } = await admin.storage
        .from("memories")
        .download(destPath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      const buffer = await fileData.arrayBuffer();

      const txId = await arweaveService.uploadFile(
        Buffer.from(buffer),
        upload.file_type,
        {
          fileName: upload.file_name,
          userId: upload.user_id,
        }
      );

      // Update memory with Arweave tx
      await admin
        .from("memories")
        .update({
          arweave_tx_id: txId,
          arweave_upload_status: "success",
          storage_status: "permanent",
        })
        .eq("id", memory.id);

      // Update tus_uploads record
      await admin
        .from("tus_uploads")
        .update({
          status: "finalized",
          memory_id: memory.id,
        })
        .eq("id", uploadId);

      console.log(`[tus] Finalized upload ${uploadId} -> memory ${memory.id}`);
    } catch (error) {
      console.error(`[tus] Finalize error for ${uploadId}:`, error);
      await admin
        .from("tus_uploads")
        .update({
          status: "error",
        })
        .eq("id", uploadId);
    }
  }

  /**
   * Cancel upload and clean up
   */
  async cancelUpload(uploadId: string) {
    const admin = createAdminClient();

    const { data: upload, error: dbError } = await admin
      .from("tus_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (dbError || !upload) {
      return;
    }

    // Delete tus files from storage
    await admin.storage.from("memories").remove([
      `tus-uploads/${upload.user_id}/${uploadId}/data`,
      `tus-uploads/${upload.user_id}/${uploadId}/.tus-meta`,
    ]);

    // Delete upload record
    await admin.from("tus_uploads").delete().eq("id", uploadId);
  }
}
