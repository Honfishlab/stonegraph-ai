import type { Memory } from "@/domain/entities";
import MemoryCard from "@/components/vault/MemoryCard";

export default function RecentMemories({
  memories,
}: {
  memories: Memory[];
}) {
  if (memories.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}
