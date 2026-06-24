import type { Memorial, MemorialItem, UpdateMemorial } from "@/domain/entities";
import type { MemorialRepository } from "@/domain/repositories";
import { createAdminClient } from "@/infrastructure/database/admin";

export class SupabaseMemorialRepository implements MemorialRepository {
  async getById(id: string): Promise<Memorial | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapMemorial(data);
  }

  async getBySlug(slug: string): Promise<Memorial | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    return this.mapMemorial(data);
  }

  async listByFamily(familyId: string): Promise<Memorial[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapMemorial);
  }

  async listPublished(): Promise<Memorial[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapMemorial);
  }

  async create(
    memorial: Omit<Memorial, "id" | "created_at" | "updated_at">
  ): Promise<Memorial> {
    const sb = createAdminClient();
    const { data, error } = await sb.from("memorials").insert(memorial).select().single();

    if (error) throw error;
    return this.mapMemorial(data);
  }

  async update(id: string, updates: UpdateMemorial): Promise<Memorial> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapMemorial(data);
  }

  async delete(id: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb.from("memorials").delete().eq("id", id);
    if (error) throw error;
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorials")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (error) throw error;
    return !data || data.length === 0;
  }

  async listItems(memorialId: string): Promise<MemorialItem[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorial_items")
      .select("*")
      .eq("memorial_id", memorialId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapMemorialItem);
  }

  async addItem(
    memorialId: string,
    memoryId: string,
    sortOrder = 0
  ): Promise<MemorialItem> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("memorial_items")
      .insert({
        memorial_id: memorialId,
        memory_id: memoryId,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapMemorialItem(data);
  }

  async removeItem(memorialId: string, memoryId: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb
      .from("memorial_items")
      .delete()
      .eq("memorial_id", memorialId)
      .eq("memory_id", memoryId);

    if (error) throw error;
  }

  async updateItemOrder(
    memorialId: string,
    memoryId: string,
    sortOrder: number
  ): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb
      .from("memorial_items")
      .update({ sort_order: sortOrder })
      .eq("memorial_id", memorialId)
      .eq("memory_id", memoryId);

    if (error) throw error;
  }

  // ── Row mappers ────────────────────────────────────────────────────────

  private mapMemorial(row: Record<string, unknown>): Memorial {
    return {
      id: row.id as string,
      family_id: row.family_id as string,
      created_by: row.created_by as string,
      slug: row.slug as string,
      name: row.name as string,
      born_on: (row.born_on as string) ?? null,
      passed_on: (row.passed_on as string) ?? null,
      bio: (row.bio as string) ?? null,
      cover_photo_arweave_tx: (row.cover_photo_arweave_tx as string) ?? null,
      arrangement: (row.arrangement as Memorial["arrangement"]) ?? "timeline",
      is_published: (row.is_published as boolean) ?? false,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  private mapMemorialItem(row: Record<string, unknown>): MemorialItem {
    return {
      id: row.id as string,
      memorial_id: row.memorial_id as string,
      memory_id: row.memory_id as string,
      sort_order: (row.sort_order as number) ?? 0,
      added_at: row.added_at as string,
    };
  }
}
