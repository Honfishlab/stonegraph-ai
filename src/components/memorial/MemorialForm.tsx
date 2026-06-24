"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MemorialForm({
  familyId,
  userId,
  initialData,
  mode = "create",
}: {
  familyId: string;
  userId: string;
  initialData?: {
    name: string;
    slug: string;
    bio: string | null;
    born_on: string | null;
    passed_on: string | null;
    arrangement: string;
  };
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [bornOn, setBornOn] = useState(initialData?.born_on || "");
  const [passedOn, setPassedOn] = useState(initialData?.passed_on || "");
  const [arrangement, setArrangement] = useState(
    initialData?.arrangement || "timeline"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    if (mode === "create") {
      // Auto-generate slug from name
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint =
        mode === "create" ? "/api/memorials" : `/api/memorials/${initialData!.slug}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body = {
        name,
        slug,
        bio: bio.trim() || null,
        born_on: bornOn || null,
        passed_on: passedOn || null,
        arrangement,
        family_id: familyId,
        created_by: userId,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save memorial");
      }

      router.push("/vault/memorial/list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-lg p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="Full name"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          URL Slug *
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="[a-z0-9-]+"
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="e.g., john-doe"
          disabled={loading}
        />
        <p className="text-xs text-stone-500 mt-1">
          URL will be: /memorial/{slug || "your-slug"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Born on
          </label>
          <input
            type="date"
            value={bornOn}
            onChange={(e) => setBornOn(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Passed on
          </label>
          <input
            type="date"
            value={passedOn}
            onChange={(e) => setPassedOn(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Biography
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="Share their story..."
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Arrangement Style
        </label>
        <select
          value={arrangement}
          onChange={(e) => setArrangement(e.target.value)}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          disabled={loading}
        >
          <option value="timeline">Timeline (Chronological)</option>
          <option value="by_type">By Type (Photos, Videos, Documents)</option>
          <option value="by_person">By Person (Family Members)</option>
          <option value="ai_story">AI-Generated Story</option>
        </select>
        <p className="text-xs text-stone-500 mt-1">
          How memories will be organized on the memorial page
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-stone-900 text-white py-3 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : mode === "create"
            ? "Create Memorial"
            : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
