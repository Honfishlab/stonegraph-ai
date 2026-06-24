import { NextRequest, NextResponse } from "next/server";
import { MemorialService } from "@/domain/services/memorial-service";
import { SupabaseMemorialRepository } from "@/infrastructure/repositories/supabase-memorial.repository";
import { MemoryService } from "@/domain/services/memory-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;

    const memorialRepo = new SupabaseMemorialRepository();
    const service = new MemorialService(memorialRepo);
    const memorial = await service.getBySlug(slug);

    if (!memorial) {
      return NextResponse.json({ error: "Memorial not found" }, { status: 404 });
    }

    if (!memorial.is_published) {
      // Only owner can view unpublished memorials
      const supabase = await import("@/infrastructure/database/server").then(
        (mod) => mod.createServerSupabaseClient()
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== memorial.created_by) {
        return NextResponse.json({ error: "Memorial not found" }, { status: 404 });
      }
    }

    // Fetch all memories in the memorial
    const items = await service.listItems(memorial.id);

    // Fetch memory details for each item
    const memoryRepo = new SupabaseMemoryRepository();
    const memoryService = new MemoryService(memoryRepo);

    const memoryDetails = await Promise.all(
      items.map(async (item) => {
        const memory = await memoryService.getById(item.memory_id);
        return {
          sort_order: item.sort_order,
          memory,
        };
      })
    );

    // Sort by sort_order
    const sortedMemories = memoryDetails
      .filter((d) => d.memory !== null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => d.memory!);

    return NextResponse.json({
      memorial,
      memories: sortedMemories,
    });
  } catch (error) {
    console.error("[GET /memorial/[slug]]", error);
    return NextResponse.json(
      { error: "Failed to load memorial" },
      { status: 500 }
    );
  }
}
