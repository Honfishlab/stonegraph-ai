/**
 * Memorial entities — tribute pages that survive the app.
 */

import { z } from "zod";

export const MemorialArrangementSchema = z.enum([
  "timeline",
  "by_type",
  "by_person",
  "ai_story",
]);
export type MemorialArrangement = z.infer<typeof MemorialArrangementSchema>;

export const MemorialSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  created_by: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  born_on: z.string().nullable(), // ISO date
  passed_on: z.string().nullable(), // ISO date
  bio: z.string().nullable(),
  cover_photo_arweave_tx: z.string().nullable(),
  arrangement: MemorialArrangementSchema.default("timeline"),
  is_published: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Memorial = z.infer<typeof MemorialSchema>;

export const MemorialItemSchema = z.object({
  id: z.string().uuid(),
  memorial_id: z.string().uuid(),
  memory_id: z.string().uuid(),
  sort_order: z.number().default(0),
  added_at: z.string().datetime(),
});
export type MemorialItem = z.infer<typeof MemorialItemSchema>;

// ── Create / Update ──────────────────────────────────────────────────────────

export const CreateMemorialSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  bio: z.string().optional().nullable(),
  born_on: z.string().optional().nullable(),
  passed_on: z.string().optional().nullable(),
  arrangement: MemorialArrangementSchema.optional(),
});
export type CreateMemorial = z.infer<typeof CreateMemorialSchema>;

export const UpdateMemorialSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  bio: z.string().optional().nullable(),
  born_on: z.string().optional().nullable(),
  passed_on: z.string().optional().nullable(),
  cover_photo_arweave_tx: z.string().optional().nullable(),
  arrangement: MemorialArrangementSchema.optional(),
  is_published: z.boolean().optional(),
});
export type UpdateMemorial = z.infer<typeof UpdateMemorialSchema>;
