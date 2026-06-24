/**
 * MemorialRepository — interface for memorial data access.
 * Implementations: SupabaseMemorialRepository.
 */

import type { Memorial, MemorialItem, UpdateMemorial } from "@/domain/entities";
import type { CreateMemorial } from "@/domain/entities";

export interface MemorialRepository {
  /** Get a memorial by ID */
  getById(id: string): Promise<Memorial | null>;

  /** Get a memorial by slug (for public URLs) */
  getBySlug(slug: string): Promise<Memorial | null>;

  /** List memorials for a family */
  listByFamily(familyId: string): Promise<Memorial[]>;

  /** List all published memorials (for public discovery) */
  listPublished(): Promise<Memorial[]>;

  /** Create a new memorial */
  create(
    memorial: Omit<Memorial, "id" | "created_at" | "updated_at">
  ): Promise<Memorial>;

  /** Update memorial fields */
  update(id: string, updates: UpdateMemorial): Promise<Memorial>;

  /** Delete a memorial */
  delete(id: string): Promise<void>;

  /** Check if a slug is available */
  isSlugAvailable(slug: string): Promise<boolean>;

  /** List items in a memorial (curated memories) */
  listItems(memorialId: string): Promise<MemorialItem[]>;

  /** Add a memory to a memorial */
  addItem(
    memorialId: string,
    memoryId: string,
    sortOrder?: number
  ): Promise<MemorialItem>;

  /** Remove a memory from a memorial */
  removeItem(memorialId: string, memoryId: string): Promise<void>;

  /** Update item order in memorial */
  updateItemOrder(
    memorialId: string,
    memoryId: string,
    sortOrder: number
  ): Promise<void>;
}
