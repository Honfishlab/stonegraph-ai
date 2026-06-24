/**
 * Billing entities — subscription tiers + entitlement checks.
 * Ported from the original entitlements.ts with Zod validation.
 */

import { z } from "zod";

// ── Tier definitions ─────────────────────────────────────────────────────────

export const TierSchema = z.enum(["free", "essential", "family", "vault"]);
export type Tier = z.infer<typeof TierSchema>;

export const TIER_ORDER: Tier[] = ["free", "essential", "family", "vault"];

export interface TierConfig {
  id: Tier;
  name: string;
  monthlyPriceCents: number; // USD cents (e.g., 900 = $9.00)
  storageLimitBytes: number;
  allowedFileTypes: ("photo" | "video" | "document" | "audio")[];
  maxMembers: number; // -1 = unlimited
  maxFamilyUnits: number; // -1 = unlimited
  features: {
    memorials: boolean;
    multiFamilyAccess: boolean;
    inheritanceControls: boolean;
    legalDocVault: boolean;
    estateExecutorAccess: boolean;
    priorityArweave: boolean;
    continuousScan: boolean;
    permanentViewerSlate: boolean;
  };
  description: string;
  tagline: string;
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPriceCents: 0,
    storageLimitBytes: 100 * 1024 * 1024, // 100 MB
    allowedFileTypes: ["photo"],
    maxMembers: 1,
    maxFamilyUnits: 1,
    features: {
      memorials: false,
      multiFamilyAccess: false,
      inheritanceControls: false,
      legalDocVault: false,
      estateExecutorAccess: false,
      priorityArweave: false,
      continuousScan: false,
      permanentViewerSlate: false,
    },
    description: "100 MB · Photos only · 1 member",
    tagline: "Try the vault",
  },
  essential: {
    id: "essential",
    name: "Essential",
    monthlyPriceCents: 900, // $9/mo
    storageLimitBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    allowedFileTypes: ["photo", "video", "document", "audio"],
    maxMembers: 1,
    maxFamilyUnits: 1,
    features: {
      memorials: false,
      multiFamilyAccess: false,
      inheritanceControls: false,
      legalDocVault: false,
      estateExecutorAccess: false,
      priorityArweave: false,
      continuousScan: true,
      permanentViewerSlate: true,
    },
    description: "5 GB · All file types · 1 member · Continuous scan",
    tagline: "For individuals who take the long view",
  },
  family: {
    id: "family",
    name: "Family",
    monthlyPriceCents: 1900, // $19/mo
    storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    allowedFileTypes: ["photo", "video", "document", "audio"],
    maxMembers: 10,
    maxFamilyUnits: 3,
    features: {
      memorials: true,
      multiFamilyAccess: true,
      inheritanceControls: true,
      legalDocVault: false,
      estateExecutorAccess: false,
      priorityArweave: false,
      continuousScan: true,
      permanentViewerSlate: true,
    },
    description:
      "50 GB · All file types · Up to 10 members · Memorial features",
    tagline: "For families preserving shared history",
  },
  vault: {
    id: "vault",
    name: "Vault",
    monthlyPriceCents: 2900, // $29/mo
    storageLimitBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    allowedFileTypes: ["photo", "video", "document", "audio"],
    maxMembers: -1, // unlimited
    maxFamilyUnits: -1,
    features: {
      memorials: true,
      multiFamilyAccess: true,
      inheritanceControls: true,
      legalDocVault: true,
      estateExecutorAccess: true,
      priorityArweave: true,
      continuousScan: true,
      permanentViewerSlate: true,
    },
    description:
      "500 GB · All file types · Unlimited members · Full inheritance suite",
    tagline: "For estates and multi-generational archives",
  },
};

// ── Entitlement checks ───────────────────────────────────────────────────────

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
}

export function checkFileType(
  tier: Tier,
  fileType: "photo" | "video" | "document" | "audio"
): EntitlementResult {
  const config = TIERS[tier];
  if (config.allowedFileTypes.includes(fileType)) return { allowed: true };
  return {
    allowed: false,
    reason: `Your ${config.name} plan does not include ${fileType} uploads. Upgrade to Essential or higher.`,
  };
}

export function checkStorage(
  tier: Tier,
  currentBytes: number,
  addBytes: number
): EntitlementResult {
  const config = TIERS[tier];
  const afterBytes = currentBytes + addBytes;
  if (afterBytes <= config.storageLimitBytes) return { allowed: true };
  return {
    allowed: false,
    reason: `Uploading this file would exceed your ${config.name} plan storage limit of ${formatBytes(config.storageLimitBytes)}.`,
  };
}

export function checkMemberLimit(
  tier: Tier,
  currentMembers: number
): EntitlementResult {
  const config = TIERS[tier];
  if (config.maxMembers === -1) return { allowed: true };
  if (currentMembers < config.maxMembers) return { allowed: true };
  return {
    allowed: false,
    reason: `Your ${config.name} plan supports up to ${config.maxMembers} member(s). Upgrade to add more.`,
  };
}

export function canUpgradeTo(from: Tier, to: Tier): boolean {
  return TIER_ORDER.indexOf(to) > TIER_ORDER.indexOf(from);
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
}

export function storagePercent(
  usedBytes: number,
  limitBytes: number
): number {
  if (limitBytes === 0) return 100;
  return Math.min(100, Math.round((usedBytes / limitBytes) * 100));
}

// ── Stripe price IDs (set per environment) ───────────────────────────────────

export const STRIPE_PRICE_IDS: Record<Exclude<Tier, "free">, string> = {
  essential: process.env.STRIPE_PRICE_ESSENTIAL ?? "",
  family: process.env.STRIPE_PRICE_FAMILY ?? "",
  vault: process.env.STRIPE_PRICE_VAULT ?? "",
};
