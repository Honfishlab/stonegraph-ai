import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { FamilyService } from "@/domain/services/family-service";
import FamilyMembersList from "@/components/family/FamilyMembersList";
import InviteForm from "@/components/family/InviteForm";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const familyRepo = new SupabaseFamilyRepository();
  const familyService = new FamilyService(familyRepo);

  const family = await familyService.getUserFamily(user.id);
  if (!family) {
    redirect("/vault");
  }

  const members = await familyRepo.listMembers(family.id);
  const invitations = await familyRepo.listInvitations(family.id);
  const tier = family.subscription_tier;

  // Filter invitations: active only
  const activeInvitations = invitations.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()
  );

  // Enforce member limit by tier
  const tierLimits: Record<string, number> = {
    free: 1,
    essential: 1,
    family: 10,
    vault: -1, // unlimited
  };
  const maxMembers = tierLimits[tier];
  const canInvite = maxMembers === -1 || members.length < maxMembers;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Family</h1>
        <p className="text-stone-600 mt-1">
          Manage who has access to your vault
        </p>
      </div>

      {/* Members */}
      <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Members ({members.length}
            {maxMembers !== -1 ? ` / ${maxMembers}` : ""})
          </h2>
        </div>

        <FamilyMembersList
          members={members}
          currentUserId={user.id}
          canEdit={
            members.find((m) => m.user_id === user.id)?.role === "owner" ||
            members.find((m) => m.user_id === user.id)?.role === "admin"
          }
        />
      </section>

      {/* Invite form */}
      <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Invite someone
        </h2>

        {!canInvite ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              You've reached your member limit. Upgrade to add more members.
            </p>
            <a
              href="/vault/billing"
              className="text-sm text-amber-900 font-medium hover:underline mt-2 inline-block"
            >
              Upgrade plan →
            </a>
          </div>
        ) : (
          <InviteForm familyId={family.id} />
        )}
      </section>

      {/* Pending invitations */}
      {activeInvitations.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Pending invitations
          </h2>

          <ul className="divide-y divide-stone-100">
            {activeInvitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm text-stone-900">{inv.email}</p>
                  <p className="text-xs text-stone-500 capitalize">
                    {inv.role} · expires{" "}
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <form action={`/api/family/invite/${inv.id}`} method="POST">
                  <input type="hidden" name="_method" value="DELETE" />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Inheritance */}
      <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-2">
          Inheritance
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Designate who inherits your vault when you're no longer here.
          {tier === "free" || tier === "essential"
            ? " Upgrade to Family or Vault to enable inheritance."
            : ""}
        </p>
        {tier === "family" || tier === "vault" ? (
          <button className="bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors">
            Set Heir
          </button>
        ) : (
          <a
            href="/vault/billing"
            className="text-sm text-blue-600 hover:underline"
          >
            Upgrade to enable →
          </a>
        )}
      </section>
    </div>
  );
}
