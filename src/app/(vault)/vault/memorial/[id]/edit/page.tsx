import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { redirect, notFound } from "next/navigation";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import MemorialForm from "@/components/memorial/MemorialForm";

type RouteParams = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EditMemorialPage({ params }: RouteParams) {
  const { id } = await params;

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

  const memorialRepo = new SupabaseMemorialRepository();
  const memorialService = new MemorialService(memorialRepo);
  const memorial = await memorialService.getById(id);

  if (!memorial) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a
          href={`/vault/memorial/${id}`}
          className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block"
        >
          ← Back to memorial
        </a>
        <h1 className="text-3xl font-bold text-stone-900">Edit Memorial</h1>
        <p className="text-stone-600 mt-1">
          Update memorial information
        </p>
      </div>
      <MemorialForm
        familyId={family.id}
        userId={user.id}
        initialData={{
          name: memorial.name,
          slug: memorial.slug,
          bio: memorial.bio,
          born_on: memorial.born_on,
          passed_on: memorial.passed_on,
          arrangement: memorial.arrangement,
        }}
        mode="edit"
      />
    </div>
  );
}
