import type { Slate, UpdateSlate, CreateSlate } from "@/domain/entities";
import type { SlateRepository } from "@/domain/repositories";
import { createAdminClient } from "@/infrastructure/database/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

function sb() {
  if (!_client) _client = createAdminClient();
  return _client;
}

export class SupabaseSlateRepository implements SlateRepository {
  async getById(id: string): Promise<Slate | null> {
    const { data, error } = await sb()
      .from("slates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data as Slate;
  }

  async listByUser(userId: string): Promise<Slate[]> {
    const { data, error } = await sb()
      .from("slates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Slate[];
  }

  async listByFamily(familyId: string): Promise<Slate[]> {
    const { data, error } = await sb()
      .from("slates")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Slate[];
  }

  async create(input: Omit<Slate, "id" | "created_at" | "updated_at">): Promise<Slate> {
    const { data, error } = await sb()
      .from("slates")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as Slate;
  }

  async update(id: string, updates: UpdateSlate): Promise<Slate> {
    const { data, error } = await sb()
      .from("slates")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Slate;
  }

  async delete(id: string): Promise<void> {
    await sb().from("slates").delete().eq("id", id);
  }

  async addMemories(slateId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .rpc("slate_add_memories", {
        p_slate_id: slateId,
        p_memory_ids: memoryIds,
      });
  }

  async removeMemories(slateId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .rpc("slate_remove_memories", {
        p_slate_id: slateId,
        p_memory_ids: memoryIds,
      });
  }

  async reorderMemories(slateId: string, memoryIds: string[]): Promise<void> {
    await sb()
      .from("slates")
      .update({
        memory_ids: memoryIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slateId);
  }
}
