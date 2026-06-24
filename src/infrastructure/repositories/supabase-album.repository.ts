import type { Album, UpdateAlbum, CreateAlbum } from "@/domain/entities";
import type { AlbumRepository } from "@/domain/repositories";
import { createAdminClient } from "@/infrastructure/database/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

function sb() {
  if (!_client) _client = createAdminClient();
  return _client;
}

export class SupabaseAlbumRepository implements AlbumRepository {
  async getById(id: string): Promise<Album | null> {
    const { data, error } = await sb()
      .from("albums")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data as Album;
  }

  async listByFamily(familyId: string, includePublic?: boolean): Promise<Album[]> {
    let query = sb().from("albums").select("*").eq("family_id", familyId);

    if (!includePublic) {
      query = query.eq("is_public", false);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Album[];
  }

  async listPublic(): Promise<Album[]> {
    const { data, error } = await sb()
      .from("albums")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Album[];
  }

  async create(input: Omit<Album, "id" | "created_at" | "updated_at">): Promise<Album> {
    // Generate slug from title if not provided
    let slug = input.slug;
    if (!slug) {
      const baseSlug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const { data, error } = await sb()
      .from("albums")
      .insert({
        ...input,
        slug,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Album;
  }

  async update(id: string, updates: UpdateAlbum): Promise<Album> {
    // If updating slug, check availability
    if (updates.slug) {
      const available = await this.isSlugAvailable(updates.slug, id);
      if (!available) {
        throw new Error(`Slug "${updates.slug}" is already taken`);
      }
    }

    const { data, error } = await sb()
      .from("albums")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Album;
  }

  async delete(id: string): Promise<void> {
    await sb().from("albums").delete().eq("id", id);
  }

  async addMemories(albumId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .rpc("album_add_memories", {
        p_album_id: albumId,
        p_memory_ids: memoryIds,
      });
  }

  async removeMemories(albumId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .rpc("album_remove_memories", {
        p_album_id: albumId,
        p_memory_ids: memoryIds,
      });
  }

  async reorderMemories(albumId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .from("albums")
      .update({
        memory_ids: memoryIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", albumId);
  }

  async isSlugAvailable(slug: string, excludeAlbumId?: string): Promise<boolean> {
    let query = sb().from("albums").select("id").eq("slug", slug).limit(1);

    if (excludeAlbumId) {
      query = query.neq("id", excludeAlbumId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return !data || data.length === 0;
  }
}
