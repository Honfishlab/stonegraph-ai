import { redirect, notFound } from "next/navigation";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";
import { MemoryService } from "@/domain/services/memory-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { formatBytes } from "@/domain/entities";

type RouteParams = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function PublicMemorialPage({ params }: RouteParams) {
  const { slug } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memorialRepo = new SupabaseMemorialRepository();
  const memorialService = new MemorialService(memorialRepo);
  const memorial = await memorialService.getBySlug(slug);

  if (!memorial) {
    notFound();
  }

  // Check access: must be published or owned by current user
  const isOwner = user && user.id === memorial.created_by;

  if (!memorial.is_published && !isOwner) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center max-w-md">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            Memorial Not Found
          </h1>
          <p className="text-stone-600">
            This memorial is private or does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Get memorial items
  const items = await memorialService.listItems(slug);

  // Get memory details
  const memoryRepo = new SupabaseMemoryRepository();
  const memoryService = new MemoryService(memoryRepo);

  const memoriesWithDetails = await Promise.all(
    items.map(async (item) => {
      const memory = await memoryService.getById(item.memory_id);
      return {
        sort_order: item.sort_order,
        memory,
      };
    })
  );

  const sortedMemories = memoriesWithDetails
    .filter((m) => m.memory !== null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => m.memory!);

  // Generate metadata
  const title = `${memorial.name} — Memorial`;
  const description = memorial.bio || `A memorial tribute for ${memorial.name}`;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-stone-900">
                {memorial.name}
              </h1>
              <p className="text-sm text-stone-500">Memorial Tribute</p>
            </div>
            {isOwner && !memorial.is_published && (
              <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                Private (only you can see)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Memorial info */}
        <div className="bg-white border border-stone-200 rounded-lg p-8">
          <div className="flex items-start gap-6">
            {memorial.cover_photo_arweave_tx && (
              <div className="w-40 h-40 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={`https://arweave.net/${memorial.cover_photo_arweave_tx}`}
                  alt={memorial.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-stone-900 mb-3">
                {memorial.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-stone-600 mb-4">
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
              </div>
              {memorial.bio && (
                <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {memorial.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Memories */}
        <div className="bg-white border border-stone-200 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-stone-900 mb-6">
            Memories ({sortedMemories.length})
          </h3>

          {sortedMemories.length === 0 ? (
            <p className="text-stone-600 text-center py-8">
              No memories have been curated yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sortedMemories.map((memory) => (
                <a
                  key={memory.id}
                  href={
                    memory.arweave_tx_id
                      ? `https://arweave.net/${memory.arweave_tx_id}`
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-stone-50 border border-stone-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {memory.type === "photo" && memory.arweave_tx_id ? (
                    <div className="aspect-square bg-stone-100">
                      <img
                        src={`https://arweave.net/${memory.arweave_tx_id}`}
                        alt={memory.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-stone-100 flex items-center justify-center text-4xl">
                      {memory.type === "video"
                        ? "🎬"
                        : memory.type === "document"
                        ? "📄"
                        : "📦"}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-medium text-stone-900 text-sm truncate">
                      {memory.title}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {memory.file_size && (
                        <span>{formatBytes(memory.file_size)}</span>
                      )}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-stone-500">
          Powered by Stonegraph AI — Permanent memory storage on Arweave
        </div>
      </div>
    </div>
  );
}
