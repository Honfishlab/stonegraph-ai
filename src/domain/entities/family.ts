/**
 * Family, FamilyMember, Invitation entities.
 */

import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const MemberRoleSchema = z.enum(["owner", "admin", "member", "heir"]);
export type MemberRole = z.infer<typeof MemberRoleSchema>;

export const SubscriptionStatusSchema = z.enum([
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// ── Family ───────────────────────────────────────────────────────────────────

export const FamilySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  created_by: z.string().uuid(),
  description: z.string().nullable(),
  cover_memory_id: z.string().uuid().nullable(),
  subscription_tier: z.enum(["free", "essential", "family", "vault"]),
  subscription_status: SubscriptionStatusSchema.default("active"),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  myslate_tx_id: z.string().nullable(), // Arweave TX for MySlate manifest
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Family = z.infer<typeof FamilySchema>;

// ── FamilyMember ─────────────────────────────────────────────────────────────

export const FamilyMemberSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: MemberRoleSchema,
  display_name: z.string(),
  joined_at: z.string().datetime(),
});
export type FamilyMember = z.infer<typeof FamilyMemberSchema>;

// ── Invitation ───────────────────────────────────────────────────────────────

export const InvitationSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  invited_by: z.string().uuid(),
  email: z.string().email(),
  role: MemberRoleSchema.default("member"),
  token: z.string(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

// ── Create / Update ──────────────────────────────────────────────────────────

export const CreateFamilySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
});
export type CreateFamily = z.infer<typeof CreateFamilySchema>;

export const UpdateFamilySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  cover_memory_id: z.string().uuid().optional().nullable(),
  subscription_tier: z.enum(["free", "essential", "family", "vault"]).optional(),
  subscription_status: SubscriptionStatusSchema.optional(),
  stripe_customer_id: z.string().optional().nullable(),
  stripe_subscription_id: z.string().optional().nullable(),
  myslate_tx_id: z.string().optional().nullable(),
});
export type UpdateFamily = z.infer<typeof UpdateFamilySchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: MemberRoleSchema.default("member"),
});
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;
