/**
 * Image cluster entity — AI-generated smart albums.
 */

import { z } from "zod";

export const ImageClusterSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  cluster_id: z.number(), // HDBSCAN label (-1 = noise)
  name: z.string().default("Photo Album"),
  cover_memory_id: z.string().uuid().nullable(),
  member_count: z.number().default(0),
  medoid_ids: z.array(z.string().uuid()).default([]),
  custom_name: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ImageCluster = z.infer<typeof ImageClusterSchema>;

export const CreateImageClusterSchema = ImageClusterSchema.pick({
  family_id: true,
  cluster_id: true,
  name: true,
  cover_memory_id: true,
  member_count: true,
  medoid_ids: true,
  custom_name: true,
}).partial({
  name: true,
  cover_memory_id: true,
  member_count: true,
  medoid_ids: true,
  custom_name: true,
});
export type CreateImageCluster = z.infer<typeof CreateImageClusterSchema>;

export const UpdateImageClusterSchema = z.object({
  name: z.string().optional(),
  custom_name: z.string().optional().nullable(),
  cover_memory_id: z.string().uuid().optional().nullable(),
  member_count: z.number().optional(),
  medoid_ids: z.array(z.string().uuid()).optional(),
});
export type UpdateImageCluster = z.infer<typeof UpdateImageClusterSchema>;
