/**
 * MemoryService — orchestrates memory operations.
 *
 * This is the domain layer — no HTTP, no framework concerns.
 * All data access goes through MemoryRepository (injected).
 */

import type {
  Memory,
  CreateMemory,
  UpdateMemory,
  MemoryType,
} from "@/domain/entities";
import { CreateMemorySchema, UpdateMemorySchema } from "@/domain/entities";
import type { MemoryRepository, ListMemoriesOptions } from "@/domain/repositories";

export class MemoryService {
  constructor(private readonly repo: MemoryRepository) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Memory | null> {
    return this.repo.getById(id);
  }

  async list(options: ListMemoriesOptions): Promise<Memory[]> {
    return this.repo.list(options);
  }

  async getStorageUsage(familyId: string): Promise<number> {
    return this.repo.getFamilyStorageUsage(familyId);
  }

  async getCount(familyId: string): Promise<number> {
    return this.repo.getFamilyMemoryCount(familyId);
  }

  async findRecentByFileName(
    fileName: string,
    userId: string,
    withinHours = 24
  ): Promise<Memory | null> {
    return this.repo.findRecentByFileName(fileName, userId, withinHours);
  }

  async getPendingArweaveUploads(limit = 50): Promise<Memory[]> {
    return this.repo.getPendingArweaveUploads(limit);
  }

  async getUnanalyzedPhotos(familyId?: string, limit = 100): Promise<Memory[]> {
    return this.repo.getUnanalyzedPhotos(familyId, limit);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  async create(input: CreateMemory & { uploaded_by: string }): Promise<Memory> {
    const validated = CreateMemorySchema.parse(input);

    return this.repo.create({
      family_id: validated.family_id,
      uploaded_by: input.uploaded_by,
      type: validated.type,
      title: validated.title,
      description: validated.description ?? null,
      file_name: validated.file_name ?? null,
      file_size: validated.file_size ?? null,
      file_type: validated.file_type ?? null,
      storage_path: null,
      arweave_tx_id: null,
      storage_status: "pending",
      taken_at: null,
      is_featured: false,
      tags: validated.tags ?? [],
      is_public: false,
      ai_subjects: null,
      ai_tags: null,
      ai_caption: null,
      ai_scene_type: null,
      ai_faces_detected: null,
      ai_face_labels: null,
      ai_time_of_day: null,
      ai_inferred_year: null,
      exif_taken_at: null,
      exif_location: null,
      ai_analyzed_at: null,
      dinov2_vector: null,
      clip_vector: null,
      composite_vector: null,
      cluster_id: null,
      cluster_name: null,
      umap_x: null,
      umap_y: null,
      embedded_at: null,
      mux_asset_id: null,
      mux_playback_id: null,
      transcode_status: null,
    });
  }

  async update(id: string, updates: UpdateMemory): Promise<Memory> {
    const validated = UpdateMemorySchema.parse(updates);
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Memory not found: ${id}`);

    return this.repo.update(id, validated);
  }

  async markAsStored(id: string, storagePath: string): Promise<Memory> {
    return this.repo.update(id, {
      storage_path: storagePath,
      storage_status: "stored",
    });
  }

  async markAsPermanent(id: string, arweaveTxId: string): Promise<Memory> {
    return this.repo.update(id, {
      arweave_tx_id: arweaveTxId,
      storage_status: "permanent",
    });
  }

  async markAsFailed(id: string): Promise<Memory> {
    return this.repo.update(id, {
      storage_status: "failed",
    });
  }

  async updateAIAnalysis(
    id: string,
    analysis: {
      subjects?: string[];
      tags?: string[];
      caption?: string;
      sceneType?: string;
    }
  ): Promise<Memory> {
    return this.repo.update(id, {
      ai_subjects: analysis.subjects ?? null,
      ai_tags: analysis.tags ?? null,
      ai_caption: analysis.caption ?? null,
      ai_scene_type: analysis.sceneType ?? null,
      ai_analyzed_at: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Memory not found: ${id}`);
    await this.repo.delete(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Group memories by type for dashboard stats */
  async getStatsByType(familyId: string) {
    const all = await this.repo.list({ familyId, limit: 10000 });
    const stats: Record<MemoryType, number> = {
      photo: 0,
      video: 0,
      text: 0,
      document: 0,
      heirloom: 0,
    };
    for (const m of all) {
      stats[m.type]++;
    }
    return stats;
  }
}
