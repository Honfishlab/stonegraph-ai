import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import MemorialForm from "@/components/memorial/MemorialForm";

export const dynamic = "force-dynamic";

export default async function CreateMemorialPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const familyRepo = new SupabaseFamilyRepository();
  const familyService = new FamilyService(familyRepo);
  const family = await familyService.getUserFamily(user.id);

  if (!family) {
    redirect("/vault");
  }

  // Check tier eligibility
  const tier = family.subscription_tier;
  if (tier === "free" || tier === "essential") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-amber-900 mb-3">
            Upgrade Required
          </h1>
          <p className="text-amber-800 mb-6">
            Memorial pages are available on Family and Vault plans.
          </p>
          <a
            href="/vault/billing"
            className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Upgrade Now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a
          href="/vault/memorial/list"
          className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block"
        >
          ← Back to memorials
        </a>
        <h1 className="text-3xl font-bold text-stone-900">Create Memorial</h1>
        <p className="text-stone-600 mt-1">
          Honor someone special with a permanent tribute page
        </p>
      </div>
      <MemorialForm familyId={family.id} userId={user.id} />
    </div>
  );
}
