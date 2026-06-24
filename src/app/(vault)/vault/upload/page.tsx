import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { TIERS, type Tier } from "@/domain/entities";
import UploadForm from "@/components/vault/UploadForm";

export default async function UploadPage() {
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

  const tier = TIERS[family.subscription_tier as Tier];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Upload Memory</h1>
        <p className="text-stone-600 mt-1">
          Preserve your memory permanently on the Arweave blockchain
        </p>
      </div>

      {/* Plan info */}
      <div className="bg-stone-100 rounded-lg border border-stone-200 p-4">
        <p className="text-sm text-stone-700">
          <span className="font-medium">{tier.name} Plan</span> ·{" "}
          {tier.description}
        </p>
      </div>

      {/* Upload form */}
      <UploadForm familyId={family.id} />
    </div>
  );
}
