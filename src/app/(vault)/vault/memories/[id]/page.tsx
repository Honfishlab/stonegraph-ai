import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect, notFound } from "next/navigation";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { formatBytes } from "@/domain/entities";

export const dynamic = "force-dynamic";

export default async function MemoryDetailPage({
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

  const memoryRepo = new SupabaseMemoryRepository();
  const memory = await memoryRepo.getById(id);

  if (!memory) {
    notFound();
  }

  const isPermanent = memory.storage_status === "permanent";
  const isPhoto = memory.type === "photo";
  const fullUrl = memory.arweave_tx_id
    ? `https://arweave.net/${memory.arweave_tx_id}`
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <a
        href="/vault/memories"
        className="text-sm text-stone-600 hover:text-stone-900"
      >
        ← Back to memories
      </a>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">{memory.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm text-stone-500">
            {new Date(memory.created_at).toLocaleDateString()}
          </span>
          {isPermanent ? (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              ∞ Permanent on Arweave
            </span>
          ) : (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
              Uploading...
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isPhoto && fullUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullUrl}
          alt={memory.title}
          className="w-full rounded-lg shadow-sm border border-stone-200"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
          <div className="text-6xl mb-3">
            {memory.type === "video"
              ? "🎬"
              : memory.type === "document"
              ? "📄"
              : memory.type === "heirloom"
              ? "📦"
              : "📷"}
          </div>
          <p className="text-stone-600">{memory.file_name}</p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-700 mb-1">Type</h3>
          <p className="text-stone-900 capitalize">{memory.type}</p>
        </div>

        {memory.file_size && (
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-1">Size</h3>
            <p className="text-stone-900">{formatBytes(memory.file_size)}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-700 mb-1">
            Storage
          </h3>
          <p className="text-stone-900 capitalize">
            {memory.storage_status === "permanent"
              ? "Permanent"
              : memory.storage_status}
          </p>
        </div>

        {memory.taken_at && (
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-1">Taken</h3>
            <p className="text-stone-900">
              {new Date(memory.taken_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      {memory.description && (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h3 className="text-sm font-medium text-stone-700 mb-2">
            Description
          </h3>
          <p className="text-stone-900">{memory.description}</p>
        </div>
      )}

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h3 className="text-sm font-medium text-stone-700 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {memory.ai_subjects && memory.ai_subjects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h3 className="text-sm font-medium text-stone-700 mb-2">
            AI Analysis
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-stone-500">Subjects:</span>
              <p className="text-sm text-stone-900">
                {memory.ai_subjects.join(", ")}
              </p>
            </div>
            <div>
              <span className="text-xs text-stone-500">Tags:</span>
              <p className="text-sm text-stone-900">
                {memory.ai_tags?.join(", ")}
              </p>
            </div>
            {memory.ai_caption && (
              <div>
                <span className="text-xs text-stone-500">Caption:</span>
                <p className="text-sm text-stone-900">{memory.ai_caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Arweave link */}
      {fullUrl && (
        <div className="bg-stone-100 rounded-lg border border-stone-200 p-6">
          <h3 className="text-sm font-medium text-stone-700 mb-2">
            Permanent Link
          </h3>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-900 hover:underline break-all"
          >
            {fullUrl}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 bg-stone-900 text-white py-2 rounded-lg hover:bg-stone-800 transition-colors">
          Edit
        </button>
        <button className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
