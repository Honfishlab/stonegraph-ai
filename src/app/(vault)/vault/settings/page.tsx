import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect } from "next/navigation";
import { SupabaseProfileRepository } from "@/infrastructure/repositories/supabase-profile.repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const profileRepo = new SupabaseProfileRepository();
  const profile = await profileRepo.getById(user.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-600 mt-1">
          Manage your account and vault settings
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50"
            />
            <p className="text-xs text-stone-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              defaultValue={profile?.display_name || ""}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <button className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors">
            Update Profile
          </button>
        </div>
      </div>

      {/* Password section */}
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          Password
        </h2>
        <p className="text-sm text-stone-600 mb-4">
          Change your password to keep your account secure
        </p>
        <button className="bg-stone-900 text-white px-6 py-2 rounded-lg hover:bg-stone-800 transition-colors">
          Change Password
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-red-700 mb-4">
          Deleting your account is permanent. All your memories will be removed
          from the app, but anything already stored on Arweave will remain
          permanent.
        </p>
        <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
