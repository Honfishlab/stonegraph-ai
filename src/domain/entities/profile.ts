/**
 * Profile entity — extended user profile (1:1 with auth.users).
 */

import { z } from "zod";

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const CreateProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  email: z.string().email(),
});
export type CreateProfile = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = z.object({
  display_name: z.string().optional(),
  avatar_url: z.string().optional().nullable(),
});
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
