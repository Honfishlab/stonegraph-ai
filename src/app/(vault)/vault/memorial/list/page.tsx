import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";

export const dynamic = "force-dynamic";

export default async function MemorialListPage() {
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

  const memorialRepo = new SupabaseMemorialRepository();
  const memorialService = new MemorialService(memorialRepo);
  const memorials = await memorialService.listByFamily(family.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Memorials</h1>
          <p className="text-stone-600 mt-1">
            Tribute pages that preserve memories permanently
          </p>
        </div>
        <a
          href="/vault/memorial/create"
          className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
        >
          Create Memorial
        </a>
      </div>

      {memorials.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-12 text-center">
          <p className="text-4xl mb-4">🕯️</p>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            No memorials yet
          </h2>
          <p className="text-stone-600 mb-6">
            Create a memorial to honor someone special with curated memories and stories.
          </p>
          <a
            href="/vault/memorial/create"
            className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Create Your First Memorial
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {memorials.map((memorial) => (
            <a
              key={memorial.id}
              href={`/vault/memorial/${memorial.id}`}
              className="block bg-white border border-stone-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold text-stone-900">
                      {memorial.name}
                    </h3>
                    {memorial.is_published && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Published
                      </span>
                    )}
                  </div>
                  {memorial.bio && (
                    <p className="text-stone-600 mb-3 line-clamp-2">
                      {memorial.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    {memorial.born_on && (
                      <span>
                        Born: {new Date(memorial.born_on).toLocaleDateString()}
                      </span>
                    )}
                    {memorial.passed_on && (
                      <span>
                        Passed: {new Date(memorial.passed_on).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Created: {new Date(memorial.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {memorial.cover_photo_arweave_tx && (
                  <div className="w-24 h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={`https://arweave.net/${memorial.cover_photo_arweave_tx}`}
                      alt={memorial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
