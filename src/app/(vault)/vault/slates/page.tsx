import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export const dynamic = "force-dynamic";

const SLATE_TYPE_CONFIG = {
  personal: { icon: "👤", label: "Personal" },
  family: { icon: "👨‍👩‍👧‍👦", label: "Family" },
  travel: { icon: "✈️", label: "Travel" },
  milestones: { icon: "🎉", label: "Milestones" },
  custom: { icon: "📋", label: "Custom" },
};

export default async function SlatesPage() {
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

  const { data: slates } = await supabase
    .from("slates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Slates</h1>
          <p className="text-stone-600 mt-1">
            Your curated collections of featured memories
          </p>
        </div>
        <a
          href="/vault/slates/new"
          className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
        >
          + Create Slate
        </a>
      </div>

      {slates && slates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(slates || []).map((slate) => {
            const typeConfig = SLATE_TYPE_CONFIG[slate.type as keyof typeof SLATE_TYPE_CONFIG] || SLATE_TYPE_CONFIG.custom;
            const memoryCount = slate.memory_ids?.length || 0;
            
            return (
              <a
                key={slate.id}
                href={`/vault/slates/${slate.id}`}
                className="group block bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {slate.cover_memory_id ? (
                  <div className="aspect-video bg-stone-100 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {typeConfig.icon}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                    <div className="text-6xl opacity-30">{typeConfig.icon}</div>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-stone-900 group-hover:text-stone-700">
                      {slate.title}
                    </h3>
                    {slate.is_public && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Public
                      </span>
                    )}
                  </div>
                  
                  {slate.description && (
                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                      {slate.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-stone-500">
                    <span className="flex items-center gap-1">
                      {typeConfig.icon} {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
                    </span>
                    <span>
                      {new Date(slate.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-stone-600 mb-4">No slates yet</p>
          <a
            href="/vault/slates/new"
            className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Create your first slate
          </a>
        </div>
      )}
    </div>
  );
}
