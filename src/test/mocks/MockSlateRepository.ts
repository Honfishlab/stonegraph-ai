/**
 * Mock SlateRepository for testing
 */

import type { Slate } from "@/domain/entities";
import type { SlateRepository } from "@/domain/repositories/slate-repository";

export class MockSlateRepository implements SlateRepository {
  private slates: Slate[] = [];

  async getById(id: string): Promise<Slate | null> {
    return this.slates.find((s) => s.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Slate | null> {
    return this.slates.find((s) => s.slug === slug) || null;
  }

  async listByUserId(userId: string): Promise<Slate[]> {
    return this.slates.filter((s) => s.user_id === userId);
  }

  async create(slate: Omit<Slate, "id" | "created_at" | "updated_at">): Promise<Slate> {
    const full: Slate = {
      ...slate,
      id: `test-slate-${this.slates.length + 1}`,
      memory_ids: slate.memory_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.slates.push(full);
    return full;
  }

  async update(id: string, updates: Partial<Slate>): Promise<Slate> {
    const slate = this.slates.find((s) => s.id === id);
    if (!slate) throw new Error(`Slate ${id} not found`);
    Object.assign(slate, updates, { updated_at: new Date().toISOString() });
    return slate;
  }

  async delete(id: string): Promise<void> {
    this.slates = this.slates.filter((s) => s.id !== id);
  }

  reset(): void {
    this.slates = [];
  }

  get count(): number {
    return this.slates.length;
  }
}
