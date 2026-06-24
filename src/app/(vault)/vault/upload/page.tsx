import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { TIERS, type Tier } from "@/domain/entities";
import TusUploader from "@/components/vault/TusUploader";

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Upload Memories</h1>
        <p className="text-stone-600 mt-1">
          Upload files up to your storage limit with resumable uploads
        </p>
      </div>

      {/* Plan info */}
      <div className="bg-stone-100 rounded-lg border border-stone-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-700">
              {tier.name} Plan
            </p>
            <p className="text-xs text-stone-600 mt-1">{tier.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-stone-900">
              {(tier.storageLimitBytes / 1024 / 1024 / 1024).toFixed(0)} GB
            </p>
            <p className="text-xs text-stone-600">Storage limit</p>
          </div>
        </div>
      </div>

      {/* TUS Uploader */}
      <TusUploader familyId={family.id} />
    </div>
  );
}
