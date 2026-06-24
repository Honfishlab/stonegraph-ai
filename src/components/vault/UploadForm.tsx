"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"photo" | "video" | "document" | "heirloom">("photo");
  const [tags, setTags] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setUploading(true);
    setError("");
    setUploadProgress("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("family_id", familyId);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("type", type);
      formData.append("tags", tags);
      formData.append("taken_at", takenAt);
      formData.append("is_public", isPublic.toString());

      const res = await fetch("/api/memories/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress("Upload complete! Redirecting...");
      setTimeout(() => router.push("/vault/memories"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File input */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          File
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-900 file:text-white hover:file:bg-stone-800 transition-colors"
          disabled={uploading}
        />
        {file && (
          <p className="text-xs text-stone-500 mt-1">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="Give your memory a title"
          required
          disabled={uploading}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Type
        </label>
        <select
          value={type}
          onChange={(e) =>
            setType(
              e.target.value as "photo" | "video" | "document" | "heirloom"
            )
          }
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          disabled={uploading}
        >
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
          <option value="heirloom">Heirloom</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="Add context or stories about this memory"
          disabled={uploading}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Tags (comma-separated, optional)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="family, vacation, 2024"
          disabled={uploading}
        />
      </div>

      {/* Date taken */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Date taken (optional)
        </label>
        <input
          type="date"
          value={takenAt}
          onChange={(e) => setTakenAt(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
          disabled={uploading}
        />
      </div>

      {/* Public toggle */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-stone-300"
            disabled={uploading}
          />
          <span className="text-sm text-stone-700">Make this memory public</span>
        </label>
        <p className="text-xs text-stone-500 mt-1">
          Public memories can be viewed by anyone with the link
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Progress */}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">{uploadProgress}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-stone-900 text-white py-3 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {uploading ? "Uploading..." : "Upload Memory"}
      </button>

      <p className="text-xs text-stone-500 text-center">
        Your file will be uploaded to Supabase Storage, then permanently stored
        on the Arweave blockchain
      </p>
    </form>
  );
}
