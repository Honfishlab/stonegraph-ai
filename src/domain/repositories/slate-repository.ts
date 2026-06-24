/**
 * Slate repository — interface for My Slate data access.
 */

import type { Slate, UpdateSlate } from "@/domain/entities";
import type { CreateSlate } from "@/domain/entities";

export interface SlateRepository {
  getById(id: string): Promise<Slate | null>;
  listByUser(userId: string): Promise<Slate[]>;
  listByFamily(familyId: string): Promise<Slate[]>;
  create(slate: Omit<Slate, "id" | "created_at" | "updated_at">): Promise<Slate>;
  update(id: string, updates: UpdateSlate): Promise<Slate>;
  delete(id: string): Promise<void>;

  /** Add multiple memories at once */
  addMemories(slateId: string, memoryIds: string[]): Promise<void>;
  /** Remove multiple memories at once */
  removeMemories(slateId: string, memoryIds: string[]): Promise<void>;

  reorderMemories(slateId: string, memoryIds: string[]): Promise<void>;
}
