import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const familyRepo = new SupabaseFamilyRepository();
    const family = await familyRepo.getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    const memorials = await service.listByFamily(family.id);

    return NextResponse.json({ memorials });
  } catch (error) {
    console.error("[GET /api/memorials]", error);
    return NextResponse.json(
      { error: "Failed to fetch memorials" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, bio, born_on, passed_on, arrangement } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    const familyRepo = new SupabaseFamilyRepository();
    const family = await familyRepo.getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);

    const memorial = await service.create({
      name,
      slug,
      bio: bio ?? null,
      born_on: born_on ?? null,
      passed_on: passed_on ?? null,
      arrangement: arrangement ?? "timeline",
      family_id: family.id,
      created_by: user.id,
    });

    return NextResponse.json({ memorial }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/memorials]", error);
    const message =
      error instanceof Error ? error.message : "Failed to create memorial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
