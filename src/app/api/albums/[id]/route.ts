import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { AlbumService } from "@/domain/services/curation";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/albums/[id] — get specific album with all memories
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const albumService = new AlbumService();
    const album = await albumService.getById(id);

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json({ album });
  } catch (error) {
    console.error("GET /api/albums/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/albums/[id] — update album metadata
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, is_public, cover_memory_id } = body;

    const albumService = new AlbumService();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (is_public !== undefined) updates.is_public = is_public;
    if (cover_memory_id !== undefined) updates.cover_memory_id = cover_memory_id;

    if (Object.keys(updates).length > 0) {
      await albumService.update(id, updates);
    }

    const updatedAlbum = await albumService.getById(id);
    return NextResponse.json({ album: updatedAlbum });
  } catch (error) {
    console.error("PATCH /api/albums/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update album" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/albums/[id] — delete album
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const albumService = new AlbumService();
    await albumService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/albums/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
