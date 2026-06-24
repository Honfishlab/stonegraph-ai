/**
 * Slate entity — user-curated collections of memories
 */

import { Memory } from "./memory";

export interface Slate {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_memory_id: string | null;
  memory_ids: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateSlate = Omit<Slate, "id" | "created_at" | "updated_at" | "memory_ids"> & {
  memory_ids?: string[];
};

export type UpdateSlate = Partial<{
  title: string;
  description: string | null;
  cover_memory_id: string | null;
  is_public: boolean;
}>;

export interface SlateWithMemories extends Slate {
  memories: Memory[];
}
