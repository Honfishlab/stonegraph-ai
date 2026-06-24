import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { AlbumService } from "@/domain/services/curation";

/**
 * GET /api/albums — list all albums for current user
 */
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const albumService = new AlbumService();
    const albums = await albumService.listByFamily(user.id);

    return NextResponse.json({ albums });
  } catch (error) {
    console.error("GET /api/albums error:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/albums — create a new album
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { family_id, title, description, cover_memory_id, is_public } = body;

    if (!family_id || !title) {
      return NextResponse.json(
        { error: "Missing required fields: family_id, title" },
        { status: 400 }
      );
    }

    const albumService = new AlbumService();
    const album = await albumService.create({
      family_id,
      user_id: user.id,
      title,
      slug: "", // Will be auto-generated
      description: description || null,
      cover_memory_id: cover_memory_id || null,
      memory_ids: [],
      is_public: is_public || false,
      created_by: user.id,
    });

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    console.error("POST /api/albums error:", error);
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
