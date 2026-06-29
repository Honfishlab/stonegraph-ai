import { describe, it, expect, beforeEach } from "vitest";
import { MemoryService } from "@/domain/services/memory-service";
import { MockMemoryRepository } from "@/test/mocks/MockMemoryRepository";

describe("MemoryService", () => {
  let memoryService: MemoryService;
  let mockRepo: MockMemoryRepository;
  const FAMILY_ID = "00000000-0000-0000-0000-000000000001";
  const USER_ID = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    mockRepo = new MockMemoryRepository();
    memoryService = new MemoryService(mockRepo);
  });

  describe("create", () => {
    it("should create a memory with pending status", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Beach sunset",
      });

      expect(memory.id).toBeDefined();
      expect(memory.title).toBe("Beach sunset");
      expect(memory.type).toBe("photo");
      expect(memory.family_id).toBe(FAMILY_ID);
      expect(memory.uploaded_by).toBe(USER_ID);
      expect(memory.storage_status).toBe("pending");
      expect(memory.tags).toEqual([]);
      expect(memory.is_public).toBe(false);
      expect(memory.ai_analyzed_at).toBeNull();
    });

    it("should create with optional fields", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "video",
        title: "Wedding",
        description: "Our special day",
        tags: ["wedding", "family"],
      });

      expect(memory.description).toBe("Our special day");
      expect(memory.tags).toEqual(["wedding", "family"]);
    });

    it("should reject invalid type", async () => {
      await expect(
        memoryService.create({
          family_id: FAMILY_ID,
          uploaded_by: USER_ID,
          type: "invalid",
          title: "Bad",
        } as any)
      ).rejects.toThrow();
    });

    it("should require title and family_id", async () => {
      await expect(
        memoryService.create({
          type: "photo",
          title: "",
          family_id: "",
          uploaded_by: USER_ID,
        })
      ).rejects.toThrow();
    });
  });

  describe("getById", () => {
    it("should retrieve created memory", async () => {
      const created = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
      });

      const retrieved = await memoryService.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe("Test");
    });

    it("should return null for non-existent id", async () => {
      const result = await memoryService.getById("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    it("should list memories for a family", async () => {
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "A",
      });
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "B",
      });
      await memoryService.create({
        family_id: "00000000-0000-0000-0000-000000000099",
        uploaded_by: USER_ID,
        type: "photo",
        title: "Other",
      });

      const result = await memoryService.list({ familyId: FAMILY_ID });

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.family_id === FAMILY_ID)).toBe(true);
    });

    it("should filter by type", async () => {
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "P",
      });
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "video",
        title: "V",
      });

      const photos = await memoryService.list({
        familyId: FAMILY_ID,
        type: "photo",
      });
      expect(photos).toHaveLength(1);
      expect(photos[0].type).toBe("photo");
    });
  });

  describe("update", () => {
    it("should update metadata fields", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Original",
      });

      const updated = await memoryService.update(memory.id, {
        title: "Updated Title",
        description: "New description",
        tags: ["tag1", "tag2"],
        is_public: true,
        is_featured: true,
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.description).toBe("New description");
      expect(updated.tags).toEqual(["tag1", "tag2"]);
      expect(updated.is_public).toBe(true);
      expect(updated.is_featured).toBe(true);
    });

    it("should throw if memory missing", async () => {
      await expect(
        memoryService.update("non-existent", { title: "X" })
      ).rejects.toThrow("Memory not found");
    });
  });

  describe("status transitions", () => {
    it("should mark as stored with storage path", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
      });

      const stored = await memoryService.markAsStored(
        memory.id,
        "path/to/file.jpg"
      );

      expect(stored.storage_status).toBe("stored");
      expect(stored.storage_path).toBe("path/to/file.jpg");
    });

    it("should mark as permanent with Arweave tx id", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
      });

      const permanent = await memoryService.markAsPermanent(
        memory.id,
        "arweave_tx_abc123"
      );

      expect(permanent.storage_status).toBe("permanent");
      expect(permanent.arweave_tx_id).toBe("arweave_tx_abc123");
    });

    it("should mark as failed", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
      });

      const failed = await memoryService.markAsFailed(memory.id);

      expect(failed.storage_status).toBe("failed");
    });
  });

  describe("AI analysis", () => {
    it("should update AI fields and set analyzed_at", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
      });

      const analyzed = await memoryService.updateAIAnalysis(memory.id, {
        subjects: ["person", "dog"],
        tags: ["outdoor", "happy"],
        caption: "Person walking dog",
        sceneType: "outdoor",
      });

      expect(analyzed.ai_subjects).toEqual(["person", "dog"]);
      expect(analyzed.ai_tags).toEqual(["outdoor", "happy"]);
      expect(analyzed.ai_caption).toBe("Person walking dog");
      expect(analyzed.ai_scene_type).toBe("outdoor");
      expect(analyzed.ai_analyzed_at).toBeDefined();
    });
  });

  describe("delete", () => {
    it("should delete a memory", async () => {
      const memory = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Delete me",
      });

      await memoryService.delete(memory.id);

      expect(await memoryService.getById(memory.id)).toBeNull();
    });

    it("should throw if memory missing", async () => {
      await expect(memoryService.delete("non-existent")).rejects.toThrow(
        "Memory not found"
      );
    });
  });

  describe("utility queries", () => {
    it("should count family memories", async () => {
      for (let i = 0; i < 3; i++) {
        await memoryService.create({
          family_id: FAMILY_ID,
          uploaded_by: USER_ID,
          type: "photo",
          title: `Photo ${i}`,
        });
      }

      const count = await memoryService.getCount(FAMILY_ID);
      expect(count).toBe(3);
    });

    it("should calculate storage usage", async () => {
      // Mock returns 0 since file_size defaults to null
      const usage = await memoryService.getStorageUsage(FAMILY_ID);
      expect(usage).toBe(0);
    });

    it("should get stats grouped by type", async () => {
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "P1",
      });
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "P2",
      });
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "video",
        title: "V1",
      });

      const stats = await memoryService.getStatsByType(FAMILY_ID);

      expect(stats.photo).toBe(2);
      expect(stats.video).toBe(1);
      expect(stats.text).toBe(0);
      expect(stats.document).toBe(0);
      expect(stats.heirloom).toBe(0);
    });

    it("should find recent by filename", async () => {
      const created = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Test",
        file_name: "beach.jpg",
      });

      const found = await memoryService.findRecentByFileName(
        "beach.jpg",
        USER_ID
      );

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it("should return null for unrecent filename", async () => {
      const found = await memoryService.findRecentByFileName(
        "missing.jpg",
        USER_ID
      );
      expect(found).toBeNull();
    });

    it("should get pending Arweave uploads", async () => {
      const m1 = await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "P1",
      });
      await memoryService.markAsStored(m1.id, "/path/1.jpg");

      const pending = await memoryService.getPendingArweaveUploads();
      expect(pending.some((m) => m.id === m1.id)).toBe(true);
    });

    it("should get unanalyzed photos", async () => {
      await memoryService.create({
        family_id: FAMILY_ID,
        uploaded_by: USER_ID,
        type: "photo",
        title: "Unanalyzed",
      });

      const unanalyzed = await memoryService.getUnanalyzedPhotos(FAMILY_ID);
      expect(unanalyzed).toHaveLength(1);
    });
  });
});
