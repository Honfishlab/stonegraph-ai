/**
 * User purchase entity — subscription/billing records.
 * Note: subscription data lives on user_purchases, NOT on families table.
 */

import { z } from "zod";

export const PurchaseTierSchema = z.enum(["essential", "family", "vault"]);
export type PurchaseTier = z.infer<typeof PurchaseTierSchema>;

export const PurchaseStatusSchema = z.enum(["active", "refunded", "canceled"]);
export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;

export const UserPurchaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tier: PurchaseTierSchema,
  amount_paid_cents: z.number(),
  stripe_payment_intent: z.string().nullable(),
  stripe_session_id: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  status: PurchaseStatusSchema.default("active"),
  purchased_at: z.string().datetime(),
  refunded_at: z.string().datetime().nullable(),
  canceled_at: z.string().datetime().nullable(),
  metadata: z.record(z.unknown()).nullable(),
});
export type UserPurchase = z.infer<typeof UserPurchaseSchema>;

export const CreateUserPurchaseSchema = UserPurchaseSchema.pick({
  user_id: true,
  tier: true,
  amount_paid_cents: true,
  stripe_payment_intent: true,
  stripe_session_id: true,
  stripe_customer_id: true,
  stripe_subscription_id: true,
  status: true,
  metadata: true,
}).partial({
  stripe_payment_intent: true,
  stripe_session_id: true,
  stripe_customer_id: true,
  stripe_subscription_id: true,
  status: true,
  metadata: true,
});
export type CreateUserPurchase = z.infer<typeof CreateUserPurchaseSchema>;

export const UpdateUserPurchaseSchema = z.object({
  status: PurchaseStatusSchema.optional(),
  refunded_at: z.string().datetime().optional().nullable(),
  canceled_at: z.string().datetime().optional().nullable(),
});
export type UpdateUserPurchase = z.infer<typeof UpdateUserPurchaseSchema>;
