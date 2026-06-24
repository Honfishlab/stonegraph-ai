import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemoryService } from "@/domain/services/memory-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";

const memoryRepo = new SupabaseMemoryRepository();
const memoryService = new MemoryService(memoryRepo);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id");
    const type = searchParams.get("type") as any;
    const tag = searchParams.get("tag");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!familyId) {
      return NextResponse.json(
        { error: "family_id is required" },
        { status: 400 }
      );
    }

    // TODO: Verify user has access to this family

    const memories = await memoryService.list({
      familyId,
      type,
      tag: tag || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("[memories] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}
