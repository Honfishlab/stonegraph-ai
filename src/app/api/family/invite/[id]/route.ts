/**
 * POST /api/family/invite/[id]/accept — accept invitation
 * DELETE /api/family/invite/[id] — cancel invitation
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const familyRepo = new SupabaseFamilyRepository();
    const familyService = new FamilyService(familyRepo);

    const family = await familyService.acceptInvitation(id, user.id);

    return NextResponse.json({ success: true, family });
  } catch (error) {
    console.error("[family/invite/accept]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const familyRepo = new SupabaseFamilyRepository();
    await familyRepo.deleteInvitation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[family/invite DELETE]", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
