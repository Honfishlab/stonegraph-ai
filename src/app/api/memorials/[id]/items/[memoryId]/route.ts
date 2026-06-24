import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";

type RouteParams = { params: Promise<{ id: string; memoryId: string }> };

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

    const { id, memoryId } = await params;

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    await service.removeItem(id, memoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/memorials/[id]/items/[memoryId]]", error);
    return NextResponse.json(
      { error: "Failed to remove item from memorial" },
      { status: 500 }
    );
  }
}
