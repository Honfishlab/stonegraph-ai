/**
 * Memory entity — the core content unit.
 * Zod schemas are the source of truth for shapes + validation.
 */

import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const MemoryTypeSchema = z.enum([
  "photo",
  "video",
  "text",
  "document",
  "heirloom",
]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const StorageStatusSchema = z.enum([
  "pending",
  "uploading",
  "stored",
  "permanent",
  "failed",
]);
export type StorageStatus = z.infer<typeof StorageStatusSchema>;

// ── Core Memory ──────────────────────────────────────────────────────────────

export const MemorySchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  uploaded_by: z.string().uuid(),
  type: MemoryTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().nullable(), // bytes
  file_type: z.string().nullable(), // MIME type
  storage_path: z.string().nullable(), // Supabase Storage path
  arweave_tx_id: z.string().nullable(), // null until permanently stored
  storage_status: StorageStatusSchema,
  taken_at: z.string().nullable(), // ISO date string
  is_featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),

  // AI analysis (GPT-4o-mini vision)
  ai_subjects: z.array(z.string()).nullable(),
  ai_tags: z.array(z.string()).nullable(),
  ai_caption: z.string().nullable(),
  ai_scene_type: z.string().nullable(),
  ai_faces_detected: z.number().nullable(),
  ai_face_labels: z.array(z.string()).nullable(),
  ai_time_of_day: z.string().nullable(),
  ai_inferred_year: z.number().nullable(),
  exif_taken_at: z.string().datetime().nullable(),
  exif_location: z.string().nullable(),
  ai_analyzed_at: z.string().datetime().nullable(),

  // ML embeddings (DINOv2 1024-dim, CLIP 768-dim, composite 1792-dim)
  dinov2_vector: z.array(z.number()).nullable(),
  clip_vector: z.array(z.number()).nullable(),
  composite_vector: z.array(z.number()).nullable(),
  cluster_id: z.number().nullable(),
  cluster_name: z.string().nullable(),
  umap_x: z.number().nullable(),
  umap_y: z.number().nullable(),
  embedded_at: z.string().datetime().nullable(),

  // Video transcoding (Mux)
  mux_asset_id: z.string().nullable(),
  mux_playback_id: z.string().nullable(),
  transcode_status: z.enum(["pending", "processing", "done", "failed"]).nullable(),
});
export type Memory = z.infer<typeof MemorySchema>;

// ── Create / Update schemas ──────────────────────────────────────────────────

export const CreateMemorySchema = MemorySchema.pick({
  family_id: true,
  type: true,
  title: true,
  description: true,
  file_name: true,
  file_size: true,
  file_type: true,
  tags: true,
}).partial({
  description: true,
  file_name: true,
  file_size: true,
  file_type: true,
  tags: true,
});
export type CreateMemory = z.infer<typeof CreateMemorySchema>;

export const UpdateMemorySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  is_featured: z.boolean().optional(),
  is_public: z.boolean().optional(),
  storage_path: z.string().optional().nullable(),
  arweave_tx_id: z.string().optional().nullable(),
  storage_status: StorageStatusSchema.optional(),
  taken_at: z.string().optional().nullable(),
  // AI fields
  ai_subjects: z.array(z.string()).optional().nullable(),
  ai_tags: z.array(z.string()).optional().nullable(),
  ai_caption: z.string().optional().nullable(),
  ai_scene_type: z.string().optional().nullable(),
  ai_analyzed_at: z.string().datetime().optional().nullable(),
  // ML fields
  composite_vector: z.array(z.number()).optional().nullable(),
  cluster_id: z.number().optional().nullable(),
  cluster_name: z.string().optional().nullable(),
});
export type UpdateMemory = z.infer<typeof UpdateMemorySchema>;
