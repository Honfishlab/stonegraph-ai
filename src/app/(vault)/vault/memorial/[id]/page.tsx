import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect, notFound } from "next/navigation";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";
import { MemoryService } from "@/domain/services/memory-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { formatBytes } from "@/domain/entities";

type RouteParams = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function MemorialDetailPage({ params }: RouteParams) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const memorialRepo = new SupabaseMemorialRepository();
  const memorialService = new MemorialService(memorialRepo);
  const memorial = await memorialService.getById(id);

  if (!memorial) {
    notFound();
  }

  // Get memorial items (curated memories)
  const items = await memorialService.listItems(id);

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

  // Get all vault memories for curation
  const allMemories = await memoryRepo.list({ familyId: memorial.family_id, limit: 1000 });
  const memoryIds = new Set(sortedMemories.map((m) => m.id));
  const availableMemories = allMemories.filter((m) => !memoryIds.has(m.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <a
          href="/vault/memorial/list"
          className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block"
        >
          ← Back to memorials
        </a>
      </div>

      {/* Memorial header */}
      <div className="bg-white border border-stone-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-stone-900">
                {memorial.name}
              </h1>
              {memorial.is_published && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Published
                </span>
              )}
            </div>
            {memorial.bio && (
              <p className="text-stone-600 mb-3 whitespace-pre-wrap">
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
            </div>
            <div className="mt-2 text-sm text-stone-500">
              Arrangement:{" "}
              <span className="capitalize">{memorial.arrangement}</span>
            </div>
          </div>
          {memorial.cover_photo_arweave_tx && (
            <div className="w-32 h-32 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={`https://arweave.net/${memorial.cover_photo_arweave_tx}`}
                alt={memorial.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-stone-200">
          <a
            href={`/vault/memorial/${id}/edit`}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm"
          >
            Edit
          </a>
          {memorial.is_published ? (
            <form
              action={`/api/memorials/${id}`}
              method="POST"
              className="inline"
            >
              <input type="hidden" name="_method" value="PATCH" />
              <input type="hidden" name="is_published" value="false" />
              <button
                type="submit"
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form
              action={`/api/memorials/${id}`}
              method="POST"
              className="inline"
            >
              <input type="hidden" name="_method" value="PATCH" />
              <input type="hidden" name="is_published" value="true" />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Publish
              </button>
            </form>
          )}
          {memorial.is_published && (
            <a
              href={`/memorial/${memorial.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm"
            >
              View Public
            </a>
          )}
          <a
            href={`/vault/memorial/${id}/delete`}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm ml-auto"
          >
            Delete
          </a>
        </div>
      </div>

      {/* Curated memories */}
      <div className="bg-white border border-stone-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          Curated Memories ({sortedMemories.length})
        </h2>

        {sortedMemories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-600 mb-4">
              No memories curated yet. Add memories from your vault.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMemories.map((memory) => (
              <div
                key={memory.id}
                className="flex items-center gap-4 p-3 border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{memory.title}</p>
                  <p className="text-sm text-stone-600">
                    {memory.storage_status === "permanent" ? (
                      <span className="text-green-600">∞ Permanent</span>
                    ) : (
                      <span className="text-amber-600">Uploading...</span>
                    )}
                    {memory.file_size && (
                      <span className="ml-2 text-stone-500">
                        ({formatBytes(memory.file_size)})
                      </span>
                    )}
                  </p>
                </div>
                <form
                  action={`/api/memorials/${id}/items/${memory.id}`}
                  method="POST"
                  className="inline"
                >
                  <input type="hidden" name="_method" value="DELETE" />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add memories */}
      <div className="bg-white border border-stone-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          Add Memories from Vault
        </h2>

        {availableMemories.length === 0 ? (
          <p className="text-stone-600">
            All vault memories are already curated.
          </p>
        ) : (
          <div className="space-y-3">
            {availableMemories.slice(0, 20).map((memory) => (
              <div
                key={memory.id}
                className="flex items-center justify-between gap-4 p-3 border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-stone-900">{memory.title}</p>
                  <p className="text-sm text-stone-600">
                    {memory.storage_status === "permanent" ? (
                      <span className="text-green-600">∞ Permanent</span>
                    ) : (
                      <span className="text-amber-600">Uploading...</span>
                    )}
                    {memory.file_size && (
                      <span className="ml-2 text-stone-500">
                        ({formatBytes(memory.file_size)})
                      </span>
                    )}
                  </p>
                </div>
                <form
                  action={`/api/memorials/${id}/items`}
                  method="POST"
                  className="inline"
                >
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-800 transition-colors text-sm"
                  >
                    Add
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
