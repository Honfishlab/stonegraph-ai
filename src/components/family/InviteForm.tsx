"use client";

import { useState } from "react";

export default function InviteForm({ familyId }: { familyId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "heir">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setSuccess(`Invitation sent to ${email}`);
      setEmail("");
      setRole("member");

      // Reload in 1.5s to refresh the list
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-stone-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            placeholder="name@example.com"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-600 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "admin" | "heir")}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            disabled={loading}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="heir">Heir</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Invitation"}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{success}</p>
      )}
    </form>
  );
}
