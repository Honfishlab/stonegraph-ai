import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemoryService } from "@/domain/services/memory-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";

const memoryRepo = new SupabaseMemoryRepository();
const memoryService = new MemoryService(memoryRepo);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const memory = await memoryService.getById(id);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // TODO: Verify user has access to this memory's family

    return NextResponse.json({ memory });
  } catch (error) {
    console.error("[memories] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // TODO: Verify user has access to this memory's family
    // TODO: Verify user has permission to update

    const updated = await memoryService.update(id, body);

    return NextResponse.json({ memory: updated });
  } catch (error) {
    console.error("[memories] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Verify user has access to this memory's family
    // TODO: Verify user has permission to delete

    await memoryService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[memories] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}
