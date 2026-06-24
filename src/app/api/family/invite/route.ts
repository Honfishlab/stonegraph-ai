/**
 * POST /api/family/invite — send invitation
 * GET /api/family/invite — list pending invitations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { type MemberRole } from "@/domain/entities";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "heir"]).default("member"),
});

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
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    const invitations = await familyRepo.listInvitations(family.id);
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("[family/invite GET]", error);
    return NextResponse.json(
      { error: "Failed to load invitations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    const body = await request.json();
    const { email, role } = inviteSchema.parse(body);

    const invitation = await familyService.invite(
      family.id,
      user.id,
      email,
      role as MemberRole
    );

    return NextResponse.json({ success: true, invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[family/invite POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}
