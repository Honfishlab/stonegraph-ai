/**
 * MemorialService — orchestrates memorial operations.
 */

import type { Memorial, MemorialItem, UpdateMemorial, CreateMemorial } from "@/domain/entities";
import type { MemorialRepository } from "@/domain/repositories";

export class MemorialService {
  constructor(private readonly repo: MemorialRepository) {}

  // ── Queries ──────────────────────────────────────────────────────────

  async getById(id: string): Promise<Memorial | null> {
    return this.repo.getById(id);
  }

  async getBySlug(slug: string): Promise<Memorial | null> {
    return this.repo.getBySlug(slug);
  }

  async listByFamily(familyId: string): Promise<Memorial[]> {
    return this.repo.listByFamily(familyId);
  }

  async listPublished(): Promise<Memorial[]> {
    return this.repo.listPublished();
  }

  async listItems(memorialId: string): Promise<MemorialItem[]> {
    return this.repo.listItems(memorialId);
  }

  // ── Commands ─────────────────────────────────────────────────────────

  async create(
    input: CreateMemorial & { family_id: string; created_by: string }
  ): Promise<Memorial> {
    // Check slug availability
    const slugAvailable = await this.repo.isSlugAvailable(input.slug);
    if (!slugAvailable) {
      throw new Error(`Slug "${input.slug}" is already taken`);
    }

    return this.repo.create({
      family_id: input.family_id,
      created_by: input.created_by,
      slug: input.slug,
      name: input.name,
      born_on: input.born_on ?? null,
      passed_on: input.passed_on ?? null,
      bio: input.bio ?? null,
      cover_photo_arweave_tx: null,
      arrangement: input.arrangement ?? "timeline",
      is_published: false,
    });
  }

  async update(id: string, updates: UpdateMemorial): Promise<Memorial> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Memorial not found: ${id}`);

    // If slug is being updated, check availability
    if (updates.slug && updates.slug !== existing.slug) {
      const slugAvailable = await this.repo.isSlugAvailable(updates.slug);
      if (!slugAvailable) {
        throw new Error(`Slug "${updates.slug}" is already taken`);
      }
    }

    return this.repo.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Memorial not found: ${id}`);
    await this.repo.delete(id);
  }

  async publish(id: string): Promise<Memorial> {
    return this.repo.update(id, { is_published: true });
  }

  async unpublish(id: string): Promise<Memorial> {
    return this.repo.update(id, { is_published: false });
  }

  async addItem(
    memorialId: string,
    memoryId: string,
    sortOrder?: number
  ): Promise<MemorialItem> {
    const memorial = await this.repo.getById(memorialId);
    if (!memorial) throw new Error(`Memorial not found: ${memorialId}`);

    // Get current items to determine default sort order
    const items = await this.repo.listItems(memorialId);
    const order = sortOrder ?? items.length;

    return this.repo.addItem(memorialId, memoryId, order);
  }

  async removeItem(memorialId: string, memoryId: string): Promise<void> {
    await this.repo.removeItem(memorialId, memoryId);
  }

  async reorderItems(
    memorialId: string,
    items: { memoryId: string; sortOrder: number }[]
  ): Promise<void> {
    const memorial = await this.repo.getById(memorialId);
    if (!memorial) throw new Error(`Memorial not found: ${memorialId}`);

    for (const item of items) {
      await this.repo.updateItemOrder(
        memorialId,
        item.memoryId,
        item.sortOrder
      );
    }
  }
}
