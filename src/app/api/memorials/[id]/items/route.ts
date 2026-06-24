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
    const items = await service.listItems(id);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/memorials/[id]/items]", error);
    return NextResponse.json(
      { error: "Failed to fetch memorial items" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { memoryId, sortOrder } = body;

    if (!memoryId) {
      return NextResponse.json(
        { error: "memoryId is required" },
        { status: 400 }
      );
    }

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    const item = await service.addItem(id, memoryId, sortOrder);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/memorials/[id]/items]", error);
    const message =
      error instanceof Error ? error.message : "Failed to add item to memorial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
