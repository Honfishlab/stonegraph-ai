import type { Memory } from "@/domain/entities";

export default function MemoryCard({ memory }: { memory: Memory }) {
  const isPermanent = memory.storage_status === "permanent";
  const isPhoto = memory.type === "photo";
  const thumbnailUrl = memory.arweave_tx_id
    ? `https://arweave.net/${memory.arweave_tx_id}`
    : null;

  return (
    <a
      href={`/vault/memories/${memory.id}`}
      className="group block bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-stone-100 relative overflow-hidden">
        {isPhoto && thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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

        {/* Storage status badge */}
        <div className="absolute top-2 right-2">
          {isPermanent ? (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              ∞ Permanent
            </span>
          ) : (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
              Uploading...
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-stone-900 text-sm truncate">
          {memory.title}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {new Date(memory.created_at).toLocaleDateString()}
        </p>
      </div>
    </a>
  );
}
