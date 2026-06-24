import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { type MemoryType } from "@/domain/entities";

const TYPE_CONFIG: Record<MemoryType, { icon: string; label: string }> = {
  photo: { icon: "📷", label: "Photos" },
  video: { icon: "🎬", label: "Videos" },
  text: { icon: "📝", label: "Text" },
  document: { icon: "📄", label: "Documents" },
  heirloom: { icon: "📦", label: "Heirlooms" },
};

export default async function VaultStats({
  familyId,
}: {
  familyId: string;
}) {
  const repo = new SupabaseMemoryRepository();
  const memories = await repo.list({ familyId, limit: 1000 });

  const counts: Record<MemoryType, number> = {
    photo: 0,
    video: 0,
    text: 0,
    document: 0,
    heirloom: 0,
  };

  for (const m of memories) {
    if (m.type in counts) {
      counts[m.type as MemoryType]++;
    }
  }

  const permanent = memories.filter((m) => m.storage_status === "permanent").length;
  const pending = memories.filter((m) => m.storage_status !== "permanent").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(TYPE_CONFIG).map(([type, config]) => (
        <div
          key={type}
          className="bg-white rounded-lg shadow-sm border border-stone-200 p-4"
        >
          <div className="text-2xl mb-1">{config.icon}</div>
          <div className="text-2xl font-bold text-stone-900">
            {counts[type as MemoryType]}
          </div>
          <div className="text-sm text-stone-600">{config.label}</div>
        </div>
      ))}

      <div className="bg-stone-100 rounded-lg border border-stone-200 p-4">
        <div className="text-2xl mb-1">∞</div>
        <div className="text-2xl font-bold text-stone-900">{permanent}</div>
        <div className="text-sm text-stone-600">Permanent on Arweave</div>
      </div>

      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <div className="text-2xl mb-1">⏳</div>
        <div className="text-2xl font-bold text-stone-900">{pending}</div>
        <div className="text-sm text-stone-600">Upload pending</div>
      </div>
    </div>
  );
}
