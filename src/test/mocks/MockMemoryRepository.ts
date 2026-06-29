/**
 * Mock MemoryRepository for testing
 */

import type { Memory, MemoryType } from "@/domain/entities";
import type { MemoryRepository, ListMemoriesOptions } from "@/domain/repositories";

export class MockMemoryRepository implements MemoryRepository {
  private memories: Memory[] = [];

  async getById(id: string): Promise<Memory | null> {
    return this.memories.find((m) => m.id === id) || null;
  }

  async list(options: ListMemoriesOptions): Promise<Memory[]> {
    let result = [...this.memories];

    if (options.familyId) {
      result = result.filter((m) => m.family_id === options.familyId);
    }
    if (options.type) {
      result = result.filter((m) => m.type === options.type);
    }
    if (options.tag) {
      result = result.filter((m) => m.tags.includes(options.tag!));
    }
    if (options.hasArweaveTx !== undefined) {
      result = options.hasArweaveTx
        ? result.filter((m) => m.storage_status === "permanent")
        : result.filter((m) => m.storage_status !== "permanent");
    }
    if (options.isPublic !== undefined) {
      result = result.filter((m) => m.is_public === options.isPublic);
    }

    const orderBy = options.orderBy || "created_at";
    result.sort((a, b) => {
      const aVal = a[orderBy] || "";
      const bVal = b[orderBy] || "";
      return options.orderDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });

    const offset = options.offset || 0;
    const limit = options.limit || result.length;
    return result.slice(offset, offset + limit);
  }

  async create(memory: Omit<Memory, "id" | "created_at" | "updated_at">): Promise<Memory> {
    const full: Memory = {
      ...memory,
      id: `test-memory-${this.memories.length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.memories.push(full);
    return full;
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory> {
    const memory = this.memories.find((m) => m.id === id);
    if (!memory) throw new Error(`Memory ${id} not found`);
    Object.assign(memory, updates, { updated_at: new Date().toISOString() });
    return memory;
  }

  async delete(id: string): Promise<void> {
    this.memories = this.memories.filter((m) => m.id !== id);
  }

  async getFamilyStorageUsage(familyId: string): Promise<number> {
    return this.memories
      .filter((m) => m.family_id === familyId)
      .reduce((sum, m) => sum + (m.file_size || 0), 0);
  }

  async getFamilyMemoryCount(familyId: string): Promise<number> {
    return this.memories.filter((m) => m.family_id === familyId).length;
  }

  async findRecentByFileName(
    fileName: string,
    uploadedBy: string,
    withinHours: number = 24
  ): Promise<Memory | null> {
    const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    return this.memories.find(
      (m) =>
        m.file_name === fileName &&
        m.uploaded_by === uploadedBy &&
        m.created_at >= cutoff
    ) || null;
  }

  async getPendingArweaveUploads(limit: number = 50): Promise<Memory[]> {
    return this.memories
      .filter((m) => m.storage_status === "stored")
      .slice(0, limit);
  }

  async getUnanalyzedPhotos(familyId?: string, limit: number = 100): Promise<Memory[]> {
    let result = this.memories.filter(
      (m) => m.type === "photo" && m.ai_analyzed_at === null
    );
    if (familyId) {
      result = result.filter((m) => m.family_id === familyId);
    }
    return result.slice(0, limit);
  }

  reset(): void {
    this.memories = [];
  }

  get count(): number {
    return this.memories.length;
  }
}
