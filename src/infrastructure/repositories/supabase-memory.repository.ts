import type { Memory, UpdateMemory } from "@/domain/entities/memory";
import type { MemoryRepository, ListMemoriesOptions } from "@/domain/repositories";
import { createAdminClient } from "@/infrastructure/database/admin";

export class SupabaseMemoryRepository implements MemoryRepository {
  async getById(id: string): Promise<Memory | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memories")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async list(options: ListMemoriesOptions): Promise<Memory[]> {
    const sb = createAdminClient();
    let query = sb.from("memories").select("*").eq("family_id", options.familyId);

    if (options.type) query = query.eq("type", options.type);
    if (options.tag) query = query.contains("tags", [options.tag]);
    if (options.isPublic !== undefined) query = query.eq("is_public", options.isPublic);
    if (options.hasArweaveTx) query = query.not("arweave_tx_id", "is", null);

    const orderCol = options.orderBy ?? "created_at";
    const ascending = options.orderDesc ?? false;
    query = query.order(orderCol, { ascending });

    if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 100) - 1);
    else if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async create(
    memory: Omit<Memory, "id" | "created_at" | "updated_at">
  ): Promise<Memory> {
    const sb = createAdminClient();
    const { data, error } = await sb.from("memories").insert({
      family_id: memory.family_id,
      uploaded_by: memory.uploaded_by,
      type: memory.type,
      title: memory.title,
      description: memory.description,
      file_name: memory.file_name,
      file_size: memory.file_size,
      file_type: memory.file_type,
      storage_path: memory.storage_path,
      arweave_tx_id: memory.arweave_tx_id,
      storage_status: memory.storage_status,
      taken_at: memory.taken_at,
      is_featured: memory.is_featured,
      tags: memory.tags,
      is_public: memory.is_public,
      ai_subjects: memory.ai_subjects,
      ai_tags: memory.ai_tags,
      ai_caption: memory.ai_caption,
      ai_scene_type: memory.ai_scene_type,
      ai_faces_detected: memory.ai_faces_detected,
      ai_face_labels: memory.ai_face_labels,
      ai_time_of_day: memory.ai_time_of_day,
      ai_inferred_year: memory.ai_inferred_year,
      exif_taken_at: memory.exif_taken_at,
      exif_location: memory.exif_location,
      ai_analyzed_at: memory.ai_analyzed_at,
      dinov2_vector: memory.dinov2_vector,
      clip_vector: memory.clip_vector,
      composite_vector: memory.composite_vector,
      cluster_id: memory.cluster_id,
      cluster_name: memory.cluster_name,
      umap_x: memory.umap_x,
      umap_y: memory.umap_y,
      embedded_at: memory.embedded_at,
      mux_asset_id: memory.mux_asset_id,
      mux_playback_id: memory.mux_playback_id,
      transcode_status: memory.transcode_status,
    }).select().single();

    if (error) throw error;
    return this.mapRow(data);
  }

  async update(id: string, updates: UpdateMemory): Promise<Memory> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memories")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb.from("memories").delete().eq("id", id);
    if (error) throw error;
  }

  async getFamilyStorageUsage(familyId: string): Promise<number> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memories")
      .select("file_size")
      .eq("family_id", familyId);

    if (error) throw error;
    return (data || []).reduce((sum, m) => sum + (m.file_size || 0), 0);
  }

  async getFamilyMemoryCount(familyId: string): Promise<number> {
    const sb = createAdminClient();
    const { count, error } = await sb
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId);

    if (error) throw error;
    return count || 0;
  }

  async findRecentByFileName(
    fileName: string,
    uploadedBy: string,
    withinHours = 24
  ): Promise<Memory | null> {
    const sb = createAdminClient();
    const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("memories")
      .select("*")
      .eq("file_name", fileName)
      .eq("uploaded_by", uploadedBy)
      .gte("created_at", cutoff)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? this.mapRow(data[0]) : null;
  }

  async getPendingArweaveUploads(limit = 50): Promise<Memory[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memories")
      .select("*")
      .eq("storage_status", "stored")
      .is("arweave_tx_id", null)
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  async getUnanalyzedPhotos(familyId?: string, limit = 100): Promise<Memory[]> {
    const sb = createAdminClient();
    let query = sb
      .from("memories")
      .select("*")
      .eq("type", "photo")
      .is("ai_analyzed_at", null);

    if (familyId) query = query.eq("family_id", familyId);
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapRow);
  }

  // ── Row mapping ──────────────────────────────────────────────────────

  private mapRow(row: Record<string, unknown>): Memory {
    return {
      id: row.id as string,
      family_id: row.family_id as string,
      uploaded_by: row.uploaded_by as string,
      type: row.type as Memory["type"],
      title: row.title as string,
      description: (row.description as string) ?? null,
      file_name: (row.file_name as string) ?? null,
      file_size: (row.file_size as number) ?? null,
      file_type: (row.file_type as string) ?? null,
      storage_path: (row.storage_path as string) ?? null,
      arweave_tx_id: (row.arweave_tx_id as string) ?? null,
      storage_status: row.storage_status as Memory["storage_status"],
      taken_at: (row.taken_at as string) ?? null,
      is_featured: (row.is_featured as boolean) ?? false,
      tags: (row.tags as string[]) ?? [],
      is_public: (row.is_public as boolean) ?? false,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      ai_subjects: (row.ai_subjects as string[]) ?? null,
      ai_tags: (row.ai_tags as string[]) ?? null,
      ai_caption: (row.ai_caption as string) ?? null,
      ai_scene_type: (row.ai_scene_type as string) ?? null,
      ai_faces_detected: (row.ai_faces_detected as number) ?? null,
      ai_face_labels: (row.ai_face_labels as string[]) ?? null,
      ai_time_of_day: (row.ai_time_of_day as string) ?? null,
      ai_inferred_year: (row.ai_inferred_year as number) ?? null,
      exif_taken_at: (row.exif_taken_at as string) ?? null,
      exif_location: (row.exif_location as string) ?? null,
      ai_analyzed_at: (row.ai_analyzed_at as string) ?? null,
      dinov2_vector: (row.dinov2_vector as number[]) ?? null,
      clip_vector: (row.clip_vector as number[]) ?? null,
      composite_vector: (row.composite_vector as number[]) ?? null,
      cluster_id: (row.cluster_id as number) ?? null,
      cluster_name: (row.cluster_name as string) ?? null,
      umap_x: (row.umap_x as number) ?? null,
      umap_y: (row.umap_y as number) ?? null,
      embedded_at: (row.embedded_at as string) ?? null,
      mux_asset_id: (row.mux_asset_id as string) ?? null,
      mux_playback_id: (row.mux_playback_id as string) ?? null,
      transcode_status: (row.transcode_status as Memory["transcode_status"]) ?? null,
    };
  }
}
