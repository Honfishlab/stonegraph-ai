import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { TIERS, formatBytes, type Tier } from "@/domain/entities";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const familyRepo = new SupabaseFamilyRepository();
  const family = await familyRepo.getUserFamily(user.id);

  if (!family) {
    redirect("/vault");
  }

  const currentTier = TIERS[family.subscription_tier as Tier];
  const nextTier =
    family.subscription_tier === "free"
      ? "essential"
      : family.subscription_tier === "essential"
      ? "family"
      : "vault";

  const nextTierConfig = TIERS[nextTier];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Billing</h1>
        <p className="text-stone-600 mt-1">
          Manage your subscription and vault limits
        </p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          Current Plan
        </h2>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900">
              {currentTier.name}
            </span>
            <span className="text-3xl font-bold text-stone-900">
              ${currentTier.monthlyPriceCents / 100}
              <span className="text-sm font-normal text-stone-500">/mo</span>
            </span>
          </div>
          <p className="text-stone-600">{currentTier.description}</p>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Usage</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                Storage
              </span>
              <span className="text-sm text-stone-500">
                {formatBytes(0)} / {formatBytes(currentTier.storageLimitBytes)}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div className="bg-stone-900 h-2 rounded-full w-0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
            <div>
              <p className="text-sm text-stone-500">Members</p>
              <p className="text-xl font-semibold text-stone-900">1</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Storage Limit</p>
              <p className="text-xl font-semibold text-stone-900">
                {formatBytes(currentTier.storageLimitBytes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade */}
      {family.subscription_tier !== "vault" && (
        <div className="bg-stone-100 rounded-lg border border-stone-200 p-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            Upgrade to {nextTierConfig.name}
          </h2>
          <p className="text-stone-600 mb-4">{nextTierConfig.description}</p>
          <button className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors">
            Upgrade for ${nextTierConfig.monthlyPriceCents / 100}/mo
          </button>
        </div>
      )}

      {/* Billing history */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          Billing History
        </h2>
        <p className="text-sm text-stone-500">No billing history yet</p>
      </div>
    </div>
  );
}
