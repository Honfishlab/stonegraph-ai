import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/infrastructure/database/server";
import { SlateService } from "@/domain/services/curation";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/slates/[id]/memories — add memories to slate
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

    const slateService = new SlateService();
    const updatedSlate = await slateService.addMemoriesToSlate(id, memoryIds);

    return NextResponse.json({ slate: updatedSlate });
  } catch (error) {
    console.error("POST /api/slates/[id]/memories error:", error);
    return NextResponse.json(
      { error: "Failed to add memories to slate" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/slates/[id]/memories — remove memories from slate
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

    const slateService = new SlateService();
    await slateService.removeMemoriesFromSlate(id, memoryIds);

    const slate = await slateService.getById(id);
    return NextResponse.json({ slate });
  } catch (error) {
    console.error("DELETE /api/slates/[id]/memories error:", error);
    return NextResponse.json(
      { error: "Failed to remove memories from slate" },
      { status: 500 }
    );
  }
}
