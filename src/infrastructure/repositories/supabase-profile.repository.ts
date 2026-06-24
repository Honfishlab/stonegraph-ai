import { createAdminClient } from "@/infrastructure/database/admin";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProfileInput = {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
};

export class SupabaseProfileRepository {
  private sb = createAdminClient();

  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await this.sb
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Profile;
  }

  async getByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.sb
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data as Profile;
  }

  async create(input: CreateProfileInput): Promise<Profile | null> {
    const { data, error } = await this.sb
      .from("profiles")
      .insert({
        id: input.id,
        email: input.email,
        display_name: input.display_name || input.email.split("@")[0],
        avatar_url: input.avatar_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[ProfileRepo] create error:", error);
      return null;
    }

    return data as Profile;
  }

  async update(
    id: string,
    updates: Partial<Pick<Profile, "display_name" | "avatar_url">>
  ): Promise<Profile | null> {
    const { data, error } = await this.sb
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[ProfileRepo] update error:", error);
      return null;
    }

    return data as Profile;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.sb.from("profiles").delete().eq("id", id);
    return !error;
  }
}
