import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import MemoryCard from "@/components/vault/MemoryCard";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
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

  if (!family) {
    redirect("/vault");
  }

  // TODO: pagination params
  const memories = await memoryRepo.list({ familyId: family.id, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">All Memories</h1>
        <p className="text-stone-600 mt-1">
          {memories.length} memor{memories.length === 1 ? "y" : "ies"} in your vault
        </p>
      </div>

      {memories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-stone-600 mb-4">No memories yet</p>
          <a
            href="/vault/upload"
            className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Upload your first memory
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </div>
  );
}
