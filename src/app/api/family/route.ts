/**
 * GET /api/family — get current user's family + members
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const familyRepo = new SupabaseFamilyRepository();
    const familyService = new FamilyService(familyRepo);

    const family = await familyService.getUserFamily(user.id);
    if (!family) {
      return NextResponse.json({ family: null }, { status: 200 });
    }

    const members = await familyRepo.listMembers(family.id);
    const tier = await familyService.getTier(family.id);
    const pendingInvites = await familyRepo.listInvitations(family.id);

    return NextResponse.json({ family, members, tier, pendingInvites });
  } catch (error) {
    console.error("[family]", error);
    return NextResponse.json(
      { error: "Failed to load family" },
      { status: 500 }
    );
  }
}
