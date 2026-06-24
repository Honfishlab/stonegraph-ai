import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { AlbumService } from "@/domain/services/curation";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/albums/[id]/memories — add memories to album
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { memoryIds } = body;

    if (!memoryIds || !Array.isArray(memoryIds)) {
      return NextResponse.json(
        { error: "memoryIds array is required" },
        { status: 400 }
      );
    }

    const albumService = new AlbumService();
    const updatedAlbum = await albumService.addMemoriesToAlbum(id, memoryIds);

    return NextResponse.json({ album: updatedAlbum });
  } catch (error) {
    console.error("POST /api/albums/[id]/memories error:", error);
    return NextResponse.json(
      { error: "Failed to add memories to album" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/albums/[id]/memories — remove memories from album
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { memoryIds } = body;

    if (!memoryIds || !Array.isArray(memoryIds)) {
      return NextResponse.json(
        { error: "memoryIds array is required" },
        { status: 400 }
      );
    }

    const albumService = new AlbumService();
    await albumService.removeMemoriesFromAlbum(id, memoryIds);

    const album = await albumService.getById(id);
    return NextResponse.json({ album });
  } catch (error) {
    console.error("DELETE /api/albums/[id]/memories error:", error);
    return NextResponse.json(
      { error: "Failed to remove memories from album" },
      { status: 500 }
    );
  }
}
