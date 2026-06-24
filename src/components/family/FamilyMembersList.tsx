"use client";

import { useState } from "react";
import type { FamilyMember } from "@/domain/entities";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FamilyMembersList({
  members,
  currentUserId,
  canEdit,
}: {
  members: FamilyMember[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function changeRole(userId: string, role: string) {
    setUpdatingId(userId);
    setError("");

    try {
      const res = await fetch(`/api/family/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member? They will lose access to the vault.")) {
      return;
    }

    setUpdatingId(userId);
    setError("");

    try {
      const res = await fetch(`/api/family/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isOwner = member.role === "owner";

          return (
            <li
              key={member.id}
              className="flex items-center justify-between py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    {member.display_name}
                    {isCurrentUser && (
                      <span className="text-xs text-stone-500"> (you)</span>
                    )}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      member.role === "owner"
                        ? "bg-purple-100 text-purple-700"
                        : member.role === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : member.role === "heir"
                        ? "bg-green-100 text-green-700"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>

              {canEdit && !isCurrentUser && !isOwner && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => changeRole(member.user_id, e.target.value)}
                    disabled={updatingId === member.user_id}
                    className="text-xs border border-stone-300 rounded px-2 py-1"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="heir">Heir</option>
                  </select>
                  <button
                    onClick={() => removeMember(member.user_id)}
                    disabled={updatingId === member.user_id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="text-sm text-red-600 mt-3">{error}</p>
      )}
    </div>
  );
}
