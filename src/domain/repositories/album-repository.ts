/**
 * Album repository — interface for Album data access.
 */

import type { Album, UpdateAlbum } from "@/domain/entities";
import type { CreateAlbum } from "@/domain/entities";

export interface AlbumRepository {
  getById(id: string): Promise<Album | null>;
  listByFamily(familyId: string, includePublic?: boolean): Promise<Album[]>;
  listPublic(): Promise<Album[]>;
  create(album: Omit<Album, "id" | "created_at" | "updated_at">): Promise<Album>;
  update(id: string, updates: UpdateAlbum): Promise<Album>;
  delete(id: string): Promise<void>;

  /** Add multiple memories at once */
  addMemories(albumId: string, memoryIds: string[]): Promise<void>;
  /** Remove multiple memories at once */
  removeMemories(albumId: string, memoryIds: string[]): Promise<void>;

  reorderMemories(albumId: string, memoryIds: string[]): Promise<void>;
  isSlugAvailable(slug: string): Promise<boolean>;
}
