import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { SlateService } from "@/domain/services/curation";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/slates/[id] — get specific slate with all memories
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const slateService = new SlateService();
    const slate = await slateService.getById(id);

    if (!slate) {
      return NextResponse.json({ error: "Slate not found" }, { status: 404 });
    }

    return NextResponse.json({ slate });
  } catch (error) {
    console.error("GET /api/slates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch slate" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/slates/[id] — update slate metadata
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

    const slateService = new SlateService();

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (is_public !== undefined) updates.is_public = is_public;
    if (cover_memory_id !== undefined) updates.cover_memory_id = cover_memory_id;

    if (Object.keys(updates).length > 0) {
      await slateService.update(id, updates);
    }

    const updatedSlate = await slateService.getById(id);
    return NextResponse.json({ slate: updatedSlate });
  } catch (error) {
    console.error("PATCH /api/slates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update slate" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/slates/[id] — delete slate
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const slateService = new SlateService();
    await slateService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/slates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete slate" },
      { status: 500 }
    );
  }
}
