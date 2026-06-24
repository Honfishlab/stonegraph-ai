/**
 * Memory repository — interface for data access.
 * Implementations: SupabaseMemoryRepository (primary).
 */

import type { Memory, UpdateMemory, MemoryType } from "@/domain/entities";

export interface ListMemoriesOptions {
  familyId: string;
  type?: MemoryType;
  tag?: string;
  isPublic?: boolean;
  hasArweaveTx?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "taken_at" | "file_size";
  orderDesc?: boolean;
}

export interface MemoryRepository {
  /** Get a memory by ID */
  getById(id: string): Promise<Memory | null>;

  /** List memories with filters */
  list(options: ListMemoriesOptions): Promise<Memory[]>;

  /** Create a new memory */
  create(
    memory: Omit<Memory, "id" | "created_at" | "updated_at">
  ): Promise<Memory>;

  /** Update memory fields */
  update(id: string, updates: UpdateMemory): Promise<Memory>;

  /** Soft delete (or hard delete) */
  delete(id: string): Promise<void>;

  /** Get total storage usage for a family (sum of file_size) */
  getFamilyStorageUsage(familyId: string): Promise<number>;

  /** Get count of memories in a family */
  getFamilyMemoryCount(familyId: string): Promise<number>;

  /** Find by filename + uploader + recent (dedup check) */
  findRecentByFileName(
    fileName: string,
    uploadedBy: string,
    withinHours?: number
  ): Promise<Memory | null>;

  /** Get all memories needing Arweave upload (status='stored', arweave_tx_id=null) */
  getPendingArweaveUploads(limit?: number): Promise<Memory[]>;

  /** Get all memories needing AI analysis */
  getUnanalyzedPhotos(familyId?: string, limit?: number): Promise<Memory[]>;
}
