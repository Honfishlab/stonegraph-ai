import type { Memory } from "@/domain/entities";
import { ArweaveBadge } from "@/components/memories/ArweaveBadge";

export interface MemoryCardProps {
  memory: Memory;
}

export default function MemoryCard({ memory }: MemoryCardProps) {
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
            <a
              href={memory.arweave_tx_id ? `https://arweave.net/${memory.arweave_tx_id}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full hover:bg-green-700 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>∞</span>
              <span>Permanent</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
              Uploading...
            </span>
          )}
        </div>

        {/* Arweave Badge */}
        {isPermanent && memory.arweave_tx_id && (
          <div className="absolute bottom-2 left-2">
            <ArweaveBadge arweaveTxId={memory.arweave_tx_id} />
          </div>
        )}
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
