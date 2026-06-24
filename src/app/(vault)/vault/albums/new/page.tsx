"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Memory } from "@/domain/entities";

export default function NewAlbumPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    is_public: false,
  });
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/family")
      .then((res) => res.json())
      .then((data) => {
        if (data?.family) {
          setFamilyId(data.family.id);
          return fetch(`/api/memories?familyId=${data.family.id}`);
        }
      })
      .then((res) => res?.json())
      .then((data) => {
        if (data?.memories) setMemories(data.memories);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !familyId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_id: familyId,
          title: form.title,
          description: form.description || null,
          is_public: form.is_public,
          memory_ids: selectedMemories,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create album");
      router.push(`/vault/albums/${data.album.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const toggleMemory = (id: string) => {
    setSelectedMemories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <a href="/vault/albums" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to albums
      </a>
      <div>
        <h1 className="text-3xl font-bold text-stone-900">New Album</h1>
        <p className="text-stone-600 mt-1">
          Create a custom collection of memories
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Album Title
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            placeholder="e.g., Summer 2024"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            placeholder="What's this album about?"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            className="rounded border-stone-300"
          />
          <span className="text-sm text-stone-700">
            Make this album public (visible to family members)
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-stone-700">
              Memories ({selectedMemories.length} selected)
            </label>
            {selectedMemories.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedMemories([])}
                className="text-xs text-stone-600 hover:text-stone-900"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto border border-stone-200 rounded-lg p-3">
            {memories.map((memory) => {
              const isSelected = selectedMemories.includes(memory.id);
              const thumb = memory.arweave_tx_id
                ? `https://arweave.net/${memory.arweave_tx_id}`
                : null;

              return (
                <button
                  key={memory.id}
                  type="button"
                  onClick={() => toggleMemory(memory.id)}
                  className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-stone-900 ring-2 ring-stone-900/20"
                      : "border-transparent hover:border-stone-400"
                  }`}
                >
                  {thumb ? (
                    <img src={thumb} alt={memory.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-2xl">
                      {memory.type === "video" ? "🎬" : "📄"}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
            {memories.length === 0 && (
              <p className="col-span-full text-center text-sm text-stone-500 py-8">
                No memories available yet. Upload some first.
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !form.title}
          className="w-full bg-stone-900 text-white py-3 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Creating..." : "Create Album"}
        </button>
      </form>
    </div>
  );
}
