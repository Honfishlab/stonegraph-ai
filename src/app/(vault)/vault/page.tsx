import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { formatBytes, TIERS, type Tier } from "@/domain/entities";
import VaultStats from "@/components/vault/VaultStats";
import RecentMemories from "@/components/vault/RecentMemories";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const familyRepo = new SupabaseFamilyRepository();
  const memoryRepo = new SupabaseMemoryRepository();

  const family = await familyRepo.getUserFamily(user.id);

  // New user — no vault yet
  if (!family) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Welcome</h1>
        <p className="text-stone-600 mb-6">
          You don't have a vault yet. Create one to start preserving memories.
        </p>
        <form action="/api/family/create" method="POST">
          <button
            type="submit"
            className="bg-stone-900 text-white px-6 py-3 rounded-lg hover:bg-stone-800 transition-colors font-medium"
          >
            Create Your Vault
          </button>
        </form>
      </div>
    );
  }

  // Fetch stats
  const [memories, storageUsage] = await Promise.all([
    memoryRepo.list({ familyId: family.id, limit: 8 }),
    memoryRepo.getFamilyStorageUsage(family.id),
  ]);

  const tier = TIERS[family.subscription_tier as Tier];
  const storagePercent = Math.min(
    100,
    Math.round((storageUsage / tier.storageLimitBytes) * 100)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">
          {family.name}
        </h1>
        <p className="text-stone-600 mt-1">
          Everything you preserve here is permanent.
        </p>
      </div>

      {/* Storage meter */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-stone-700">Storage</span>
          <span className="text-sm text-stone-500">{tier.name} Plan</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-stone-900">
            {formatBytes(storageUsage)}
          </span>
          <span className="text-stone-500">/</span>
          <span className="text-stone-600">
            {formatBytes(tier.storageLimitBytes)}
          </span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className="bg-stone-900 h-2 rounded-full transition-all duration-500"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-2">{storagePercent}% used</p>
      </div>

      {/* Stats grid */}
      <VaultStats familyId={family.id} />

      {/* Recent memories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-stone-900">
            Recent memories
          </h2>
          <a
            href="/vault/memories"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            View all →
          </a>
        </div>
        <RecentMemories memories={memories} />
      </div>
    </div>
  );
}
