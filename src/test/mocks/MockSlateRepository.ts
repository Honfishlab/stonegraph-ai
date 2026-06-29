/**
 * Mock SlateRepository for testing
 */

import type { Slate } from "@/domain/entities";
import type { SlateRepository } from "@/domain/repositories/slate-repository";

export class MockSlateRepository implements SlateRepository {
  private slates: Slate[] = [];

  async findById(id: string): Promise<Slate | null> {
    return this.slates.find((s) => s.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Slate[]> {
    return this.slates.filter((s) => s.userId === userId);
  }

  async create(slate: Slate): Promise<Slate> {
    this.slates.push(slate);
    return slate;
  }

  async update(id: string, updates: Partial<Slate>): Promise<Slate> {
    const slate = this.slates.find((s) => s.id === id);
    if (!slate) throw new Error("Slate not found");
    Object.assign(slate, updates);
    return slate;
  }

  async delete(id: string): Promise<void> {
    this.slates = this.slates.filter((s) => s.id !== id);
  }
}
