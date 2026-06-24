import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect, notFound } from "next/navigation";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import MemoryCard from "@/components/vault/MemoryCard";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .single();

  if (!album) notFound();

  let memories = [];
  if (album.memory_ids && album.memory_ids.length > 0) {
    const memRepo = new SupabaseMemoryRepository();
    const allMemories = await Promise.all(
      album.memory_ids.map((mid: string) => memRepo.getById(mid))
    );
    memories = allMemories.filter(Boolean);
  }

  return (
    <div className="space-y-6">
      <a href="/vault/albums" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to albums
      </a>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-stone-900">{album.title}</h1>
            {album.is_public && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Public
              </span>
            )}
          </div>
          {album.description && (
            <p className="text-stone-600 mt-1">{album.description}</p>
          )}
          <p className="text-sm text-stone-500 mt-2">
            {memories.length} {memories.length === 1 ? "memory" : "memories"}
            {" • "}
            Created {new Date(album.created_at).toLocaleDateString()}
          </p>
        </div>
        <a
          href={`/vault/albums/${id}/edit`}
          className="text-sm text-stone-600 hover:text-stone-900 border border-stone-300 px-3 py-1.5 rounded-lg hover:bg-stone-50"
        >
          Edit album
        </a>
      </div>

      {memories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-3">📸</div>
          <p className="text-stone-600 mb-4">
            This album is empty. Add memories from your vault.
          </p>
          <a
            href={`/vault/albums/${id}/edit`}
            className="inline-block bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Add memories
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory as any} />
          ))}
        </div>
      )}
    </div>
  );
}
