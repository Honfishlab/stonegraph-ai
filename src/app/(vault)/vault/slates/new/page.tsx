"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function NewSlatePage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "personal",
    year: "",
    is_public: false,
    cover_memory_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/family")
      .then((res) => res.json())
      .then((family) => {
        if (family?.family) setFamilyId(family.family.id);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !familyId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/slates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_id: familyId,
          ...form,
          year: form.year ? parseInt(form.year) : null,
          memory_ids: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create slate");
      router.push(`/vault/slates/${data.slate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <a href="/vault/slates" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to slates
      </a>
      <div>
        <h1 className="text-3xl font-bold text-stone-900">New slate</h1>
        <p className="text-stone-600 mt-1">A curated collection of your best memories</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            placeholder="Summer 2025"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            placeholder="What makes this collection special..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            >
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="travel">Travel</option>
              <option value="milestones">Milestones</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Year (optional)</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2025"
              min="2020"
              max={new Date().getFullYear()}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            className="rounded border-stone-300"
          />
          <span className="text-sm text-stone-700">Make this slate public (visible to family members)</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving || !form.title}
          className="w-full bg-stone-900 text-white py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Creating..." : "Create slate"}
        </button>
      </form>
    </div>
  );
}
