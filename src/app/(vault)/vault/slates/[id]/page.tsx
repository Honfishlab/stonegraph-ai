import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect, notFound } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export const dynamic = "force-dynamic";

export default async function SlateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: slate } = await supabase
    .from("slates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!slate) {
    notFound();
  }

  const familyRepo = new SupabaseFamilyRepository();
  const family = await familyRepo.getUserFamily(user.id);
  if (!family) {
    redirect("/vault");
  }

  let memories = [];
  if (slate.memory_ids && slate.memory_ids.length > 0) {
    const { data } = await supabase
      .from("memories")
      .select("*")
      .in("id", slate.memory_ids);
    memories = data || [];
  }

  const reorder = slate.memory_ids.map((mid: string) => {
    const mem = memories.find((m: any) => m.id === mid);
    return mem ? { ...mem, position: slate.memory_ids.indexOf(mid) } : null;
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      <a href="/vault/slates" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to slates
      </a>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{slate.title}</h1>
          {slate.description && (
            <p className="text-stone-600 mt-1">{slate.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm text-stone-500">
            <span>{slate.type}</span>
            {slate.year && <span>• {slate.year}</span>}
            <span>• {memories.length} memories</span>
            {slate.is_public && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                Public
              </span>
            )}
          </div>
        </div>
      </div>

      {reorder.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-stone-600 mb-4">
            This slate is empty. Add memories from your vault.
          </p>
          <a
            href="/vault/memories"
            className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Browse memories
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reorder.map((memory: any) => {
            const isPhoto = memory.type === "photo";
            const thumbnailUrl = memory.arweave_tx_id
              ? `https://arweave.net/${memory.arweave_tx_id}`
              : null;

            return (
              <a
                key={memory.id}
                href={`/vault/memories/${memory.id}`}
                className="group block bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-stone-100 relative">
                  {isPhoto && thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={memory.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {memory.type === "video"
                        ? "🎬"
                        : memory.type === "document"
                        ? "📄"
                        : memory.type === "heirloom"
                        ? "📦"
                        : "📷"}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 text-xs bg-white/90 text-stone-700 px-2 py-0.5 rounded">
                    #{memory.position + 1}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-stone-900 text-sm truncate">
                    {memory.title}
                  </h3>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
