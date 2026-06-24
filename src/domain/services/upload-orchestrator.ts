/**
 * Upload orchestrator — full pipeline:
 *
 * 1. Validate (auth + tier + storage limits)
 * 2. Upload to Supabase Storage (staging)
 * 3. Upload to Arweave (permanent)
 * 4. Create memory record in DB
 * 5. Sync to AO process
 * 6. Trigger AI analysis (fire-and-forget via job queue)
 * 7. Create audit log entry
 *
 * Server-side only. Does NOT import Next.js internals.
 */

import type { Memory, Tier } from "@/domain/entities";
import {
  checkFileType,
  checkStorage,
  checkMemberLimit,
  TIERS,
} from "@/domain/entities";
import { MemoryService } from "@/domain/services/memory-service";
import { FamilyService } from "@/domain/services/family-service";
import { SupabaseMemoryRepository } from "@/infrastructure/repositories/supabase-memory.repository";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";
import { arweaveService } from "@/infrastructure/arweave/service";
import { addMemoryToAO, type AOMemoryInput } from "@/infrastructure/ao/service";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { createAdminClient } from "@/infrastructure/database/admin";

export interface UploadRequest {
  userId: string;
  file: File; // browser File or Node buffer
  title: string;
  description?: string;
  type: "photo" | "video" | "document" | "heirloom";
  file_type: string;
  tags?: string[];
  taken_at?: string;
  is_public?: boolean;
}

export interface UploadResult {
  memory: Memory;
  arweave_tx_id: string | null;
  permanent_url: string | null;
}

export class UploadOrchestrator {
  private memoryService: MemoryService;
  private familyService: FamilyService;
  private memoryRepo: SupabaseMemoryRepository;
  private familyRepo: SupabaseFamilyRepository;

  constructor() {
    this.memoryRepo = new SupabaseMemoryRepository();
    this.familyRepo = new SupabaseFamilyRepository();
    this.memoryService = new MemoryService(this.memoryRepo);
    this.familyService = new FamilyService(this.familyRepo);
  }

  /**
   * Execute full upload pipeline.
   */
  async upload(request: UploadRequest): Promise<UploadResult> {
    // ── 1. Validate ──────────────────────────────────────────────────

    // Get user's family
    const family = await this.familyService.getUserFamily(request.userId);
    if (!family) throw new Error("No family vault found for user");

    // Check auth (must be a member)
    const member = await this.familyService.getMember(family.id, request.userId);
    if (!member) throw new Error("Unauthorized: not a family member");

    // Check tier + file type entitlement
    const tier = family.subscription_tier as Tier;
    const fileTypeCheck = checkFileType(tier, request.type === "heirloom" ? "document" : request.type);
    if (!fileTypeCheck.allowed) throw new Error(fileTypeCheck.reason);

    // Check storage limit
    const currentUsage = await this.memoryService.getStorageUsage(family.id);
    const fileBytes = request.file.size || (request.file as any).byteLength || 0;
    const storageCheck = checkStorage(tier, currentUsage, fileBytes);
    if (!storageCheck.allowed) throw new Error(storageCheck.reason);

    // Check member limit (only relevant if adding new member)
    const memberCount = await this.familyRepo.countMembers(family.id);
    const memberCheck = checkMemberLimit(tier, memberCount);
    if (!memberCheck.allowed) throw new Error(memberCheck.reason);

    // Dedup check (same filename within 24h)
    const dedup = await this.memoryService.findRecentByFileName(
      request.file.name,
      request.userId,
      24
    );
    if (dedup) {
      throw new Error(`Duplicate upload: "${request.file.name}" was uploaded recently`);
    }

    // ── 2. Upload to Supabase Storage (staging) ──────────────────────

    const buffer = Buffer.from(await request.file.arrayBuffer());
    const familyId = family.id;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = request.file.name.split(".").pop() || "bin";
    const storagePath = `${familyId}/${request.userId}/${timestamp}-${random}.${ext}`;

    const sb = createAdminClient();
    const { error: uploadError } = await sb.storage
      .from("memories")
      .upload(storagePath, buffer, {
        contentType: request.file_type,
        upsert: false,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // ── 3. Create memory record (status: stored) ─────────────────────

    let memory = await this.memoryService.create({
      family_id: familyId,
      uploaded_by: request.userId,
      type: request.type,
      title: request.title,
      description: request.description ?? null,
      file_name: request.file.name,
      file_size: fileBytes,
      file_type: request.file_type,
    });

    memory = await this.memoryService.markAsStored(memory.id, storagePath);

    // Update taken_at if provided
    if (request.taken_at) {
      memory = await this.memoryService.update(memory.id, {
        taken_at: request.taken_at,
      });
    }

    // Update tags/is_public
    if (request.tags || request.is_public !== undefined) {
      memory = await this.memoryService.update(memory.id, {
        tags: request.tags,
        is_public: request.is_public,
      });
    }

    // ── 4. Upload to Arweave (permanent) ─────────────────────────────

    let arweave_tx_id: string | null = null;
    let permanent_url: string | null = null;

    try {
      arweave_tx_id = await arweaveService.uploadFile(
        buffer,
        request.file_type,
        {
          "Content-Type": request.file_type,
          "App-Name": "Stonegraph",
          "Memory-Id": memory.id,
          "Family-Id": familyId,
          "Memory-Type": request.type,
          Title: request.title,
          "User-Id": request.userId,
        }
      );

      permanent_url = arweaveService.getPermanentUrl(arweave_tx_id);
      memory = await this.memoryService.markAsPermanent(memory.id, arweave_tx_id);
    } catch (err) {
      console.error(`[upload] Arweave upload failed for memory=${memory.id}:`, err);
      await this.memoryService.markAsFailed(memory.id);
      // Non-fatal: memory stays in Supabase Storage, can retry later
    }

    // ── 5. AO sync ──────────────────────────────────────────────────

    if (arweave_tx_id) {
      const aoMemory: AOMemoryInput = {
        id: memory.id,
        arweave_tx: arweave_tx_id,
        title: request.title,
        description: request.description || "",
        type: request.type,
        file_type: request.file_type,
        tags: request.tags || [],
        subjects: [],
        scene_type: "",
        taken_at: request.taken_at || "",
        created_at: memory.created_at,
        is_public: request.is_public || false,
        family_id: familyId,
      };

      // Fire-and-forget: don't wait for AO response
      addMemoryToAO(aoMemory).catch((err) =>
        console.error(`[upload] AO sync failed for memory=${memory.id}:`, err)
      );
    }

    // ── 6. Write audit log entry ─────────────────────────────────────

    await this.createAuditLog({
      memory_id: memory.id,
      user_id: request.userId,
      family_id: familyId,
      event: arweave_tx_id ? "permanent" : "stored",
      details: {
        file_name: request.file.name,
        file_size: fileBytes,
        arweave_tx_id,
      },
    });

    // ── 7. Trigger AI analysis (fire-and-forget) ─────────────────────

    // Note: This will be replaced with proper queue job after Phase 3
    if (request.type === "photo" && arweave_tx_id) {
      this.triggerAIAnalysis(memory.id, arweave_tx_id, familyId).catch((err) =>
        console.error(`[upload] AI analysis trigger failed:`, err)
      );
    }

    return {
      memory,
      arweave_tx_id,
      permanent_url,
    };
  }

  /**
   * Re-upload memories that were left in 'stored' status (never made it to Arweave).
   * Called from API routes / background jobs.
   */
  async retryArweaveUpload(memoryId: string): Promise<string | null> {
    const memory = await this.memoryService.getById(memoryId);
    if (!memory) throw new Error(`Memory not found: ${memoryId}`);
    if (memory.arweave_tx_id) return memory.arweave_tx_id; // already permanent
    if (!memory.storage_path) throw new Error("No storage path — cannot retry");

    const sb = createAdminClient();
    const { data: fileData, error } = await sb.storage
      .from("memories")
      .download(memory.storage_path);

    if (error || !fileData) throw new Error(`Storage download failed: ${error?.message}`);

    const buffer = Buffer.from(await fileData.arrayBuffer());

    const txId = await arweaveService.uploadFile(
      buffer,
      memory.file_type || "application/octet-stream",
      {
        "Content-Type": memory.file_type || "application/octet-stream",
        "App-Name": "Stonegraph",
        "Memory-Id": memory.id,
        "Family-Id": memory.family_id,
        "Memory-Type": memory.type,
        Title: memory.title,
      }
    );

    await this.memoryService.markAsPermanent(memory.id, txId);

    // AO sync
    const aoMemory: AOMemoryInput = {
      id: memory.id,
      arweave_tx: txId,
      title: memory.title,
      description: memory.description || "",
      type: memory.type,
      file_type: memory.file_type || "",
      tags: memory.tags || [],
      subjects: memory.ai_subjects || [],
      scene_type: memory.ai_scene_type || "",
      taken_at: memory.taken_at || "",
      created_at: memory.created_at,
      is_public: memory.is_public,
      family_id: memory.family_id,
    };

    await addMemoryToAO(aoMemory);

    return txId;
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private async createAuditLog(entry: {
    memory_id: string;
    user_id: string;
    family_id: string;
    event: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const sb = createAdminClient();
    await sb.from("upload_audit_log").insert({
      memory_id: entry.memory_id,
      user_id: entry.user_id,
      family_id: entry.family_id,
      event: entry.event,
      details: entry.details,
    });
  }

  private async triggerAIAnalysis(
    memoryId: string,
    arweaveTxId: string,
    familyId: string
  ): Promise<void> {
    // TODO: Replace with proper job queue (Phase 3)
    // For now, call a placeholder that logs the intent
    console.info(
      `[upload] AI analysis queued for memory=${memoryId} tx=${arweaveTxId} family=${familyId}`
    );
  }
}

// Singleton
export const uploadOrchestrator = new UploadOrchestrator();
