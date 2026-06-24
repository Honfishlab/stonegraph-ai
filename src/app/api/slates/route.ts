import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { SlateService } from "@/domain/services/curation";

/**
 * GET /api/slates — list all slates for current user
 */
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slateService = new SlateService();
    const slates = await slateService.listByUser(user.id);

    return NextResponse.json({ slates });
  } catch (error) {
    console.error("GET /api/slates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch slates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slates — create a new slate
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

    const slateService = new SlateService();
    const slate = await slateService.create({
      family_id,
      user_id: user.id,
      title,
      description: description || null,
      cover_memory_id: cover_memory_id || null,
      memory_ids: [],
      is_public: is_public || false,
      created_by: user.id,
    });

    return NextResponse.json({ slate }, { status: 201 });
  } catch (error) {
    console.error("POST /api/slates error:", error);
    return NextResponse.json(
      { error: "Failed to create slate" },
      { status: 500 }
    );
  }
}
