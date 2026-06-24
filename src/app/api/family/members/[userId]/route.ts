/**
 * DELETE /api/family/members/[userId] — remove member
 * PATCH /api/family/members/[userId] — update member role
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { type MemberRole } from "@/domain/entities";
import { z } from "zod";

const roleSchema = z.object({
  role: z.enum(["admin", "member", "heir"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { role } = roleSchema.parse(body);

    const familyRepo = new SupabaseFamilyRepository();
    const familyService = new FamilyService(familyRepo);
    const family = await familyService.getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    await familyService.updateMemberRole(
      family.id,
      user.id,
      userId,
      role as MemberRole
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[family/members PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    const familyRepo = new SupabaseFamilyRepository();
    const familyService = new FamilyService(familyRepo);
    const family = await familyService.getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    await familyService.removeMember(family.id, user.id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[family/members DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove member" },
      { status: 500 }
    );
  }
}
