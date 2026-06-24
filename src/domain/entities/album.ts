/**
 * Album entity — custom user-created photo collections
 */

import { Memory } from "./memory";

export interface Album {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_memory_id: string | null;
  memory_ids: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateAlbum = Omit<Album, "id" | "created_at" | "updated_at" | "memory_ids"> & {
  memory_ids?: string[];
};

export type UpdateAlbum = Partial<{
  title: string;
  slug: string;
  description: string | null;
  cover_memory_id: string | null;
  is_public: boolean;
}>;

export interface AlbumWithMemories extends Album {
  memories: Memory[];
}
