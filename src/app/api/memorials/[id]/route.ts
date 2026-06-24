import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    const memorial = await service.getById(id);

    if (!memorial) {
      return NextResponse.json({ error: "Memorial not found" }, { status: 404 });
    }

    return NextResponse.json({ memorial });
  } catch (error) {
    console.error("[GET /api/memorials/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch memorial" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, bio, born_on, passed_on, arrangement, is_published } = body;

    // Validate slug format if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    const memorial = await service.update(id, {
      name,
      slug,
      bio,
      born_on,
      passed_on,
      arrangement,
      is_published,
    });

    return NextResponse.json({ memorial });
  } catch (error) {
    console.error("[PATCH /api/memorials/[id]]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update memorial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    await service.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/memorials/[id]]", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete memorial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
