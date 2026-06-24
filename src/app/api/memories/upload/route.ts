import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { MemoryService } from "@/domain/services/memory-service";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { arweaveService } from "@/infrastructure/arweave/service";
import { addMemoryToAO } from "@/infrastructure/ao/service";
import { createAdminClient } from "@/infrastructure/database/admin";
import {
  type Tier,
  checkFileType,
  checkStorage,
  TIERS,
} from "@/domain/entities";

// Lazy repo/service singletons — avoid instantiation at module load time
function getMemoryService() {
  return new MemoryService(new SupabaseMemoryRepository());
}
function getFamilyService() {
  return new FamilyService(new SupabaseFamilyRepository());
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as globalThis.File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const type = formData.get("type") as string;
    const file_type = formData.get("file_type") as string;
    const tagsRaw = formData.get("tags") as string | null;
    const taken_at = formData.get("taken_at") as string | null;
    const is_public = formData.get("is_public") === "true";

    if (!file || !title || !type || !file_type) {
      return NextResponse.json(
        { error: "Missing required fields: file, title, type, file_type" },
        { status: 400 }
      );
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const memoryService = getMemoryService();
    const familyService = getFamilyService();

    // ── Validate ─────────────────────────────────────────────────────

    const family = await familyService.getUserFamily(user.id);
    if (!family) throw new Error("No family vault found");

    const member = await familyService.getMember(family.id, user.id);
    if (!member) throw new Error("Not a family member");

    const tier = family.subscription_tier as Tier;
    const fileTypeKey = type === "heirloom" ? "document" as const : type as "photo" | "video" | "document" | "audio";

    const fileTypeCheck = checkFileType(tier, fileTypeKey);
    if (!fileTypeCheck.allowed) throw new Error(fileTypeCheck.reason);

    const currentUsage = await memoryService.getStorageUsage(family.id);
    const storageCheck = checkStorage(tier, currentUsage, file.size);
    if (!storageCheck.allowed) throw new Error(storageCheck.reason);

    // Dedup (same filename within 24h)
    const dedup = await memoryService.findRecentByFileName(file.name, user.id, 24);
    if (dedup) throw new Error(`Duplicate: "${file.name}" uploaded recently`);

    // ── Upload to Supabase Storage ──────────────────────────────────

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const familyId = family.id;
    const storagePath = `${familyId}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.name.split(".").pop()}`;

    const sb = createAdminClient();
    const { error: uploadError } = await sb.storage
      .from("memories")
      .upload(storagePath, buffer, {
        contentType: file_type,
        upsert: false,
      });

    if (uploadError) throw new Error(`Storage failed: ${uploadError.message}`);

    // ── Create memory record ────────────────────────────────────────

    let memory = await memoryService.create({
      family_id: familyId,
      uploaded_by: user.id,
      type: type as any,
      title,
      description: description || undefined,
      file_name: file.name,
      file_size: file.size,
      file_type: file_type,
    });

    memory = await memoryService.markAsStored(memory.id, storagePath);

    if (taken_at) {
      memory = await memoryService.update(memory.id, { taken_at });
    }
    if (tags.length > 0 || is_public) {
      memory = await memoryService.update(memory.id, {
        tags: tags.length > 0 ? tags : undefined,
        is_public: is_public || undefined,
      });
    }

    // ── Upload to Arweave ──────────────────────────────────────────

    let arweave_tx_id: string | null = null;
    let permanent_url: string | null = null;

    try {
      arweave_tx_id = await arweaveService.uploadFile(
        buffer,
        file_type,
        {
          "Content-Type": file_type,
          "App-Name": "Stonegraph",
          "Memory-Id": memory.id,
          "Family-Id": familyId,
          "Memory-Type": type,
          Title: title,
          "User-Id": user.id,
        }
      );
      permanent_url = arweaveService.getPermanentUrl(arweave_tx_id);
      memory = await memoryService.markAsPermanent(memory.id, arweave_tx_id);
    } catch (err) {
      console.error(`[upload] Arweave failed for ${memory.id}:`, err);
      await memoryService.markAsFailed(memory.id);
    }

    // ── AO sync (fire-and-forget) ──────────────────────────────────

    if (arweave_tx_id) {
      addMemoryToAO({
        id: memory.id,
        arweave_tx: arweave_tx_id,
        title,
        description: description || "",
        type,
        file_type,
        tags,
        subjects: [],
        scene_type: "",
        taken_at: taken_at || "",
        created_at: memory.created_at,
        is_public: is_public,
        family_id: familyId,
      }).catch((err) => console.error("[upload] AO sync failed:", err));
    }

    return NextResponse.json(
      {
        success: true,
        memory,
        arweave_tx_id,
        permanent_url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[upload] Error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
