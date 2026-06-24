/**
 * POST /api/family/create — create a vault for a new user
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const familyRepo = new SupabaseFamilyRepository();
    const familyService = new FamilyService(familyRepo);

    // Check if user already has a vault
    const existing = await familyService.getUserFamily(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already have a vault", family: existing },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { name } = createSchema.parse(body);

    const family = await familyService.create(user.id, { name });

    return NextResponse.json({ success: true, family }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[family/create]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create vault" },
      { status: 500 }
    );
  }
}
