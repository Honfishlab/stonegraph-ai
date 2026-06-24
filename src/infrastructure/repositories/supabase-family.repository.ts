import type { Family, FamilyMember, Invitation, MemberRole, UpdateFamily } from "@/domain/entities";
import type { FamilyRepository } from "@/domain/repositories";
import { createAdminClient } from "@/infrastructure/database/admin";

export class SupabaseFamilyRepository implements FamilyRepository {
  async getById(id: string): Promise<Family | null> {
    const sb = createAdminClient();
    const { data, error } = await sb.from("families").select("*").eq("id", id).single();
    if (error || !data) return null;
    return this.mapFamily(data);
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.getById((data[0] as any).family_id);
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("family_members")
      .select("family:families(*)")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row: any) => this.mapFamily(row.family));
  }

  async create(
    family: Omit<Family, "id" | "created_at" | "updated_at">
  ): Promise<Family> {
    const sb = createAdminClient();
    const insertData = {
      name: family.name,
      created_by: family.created_by,
      description: family.description,
      cover_memory_id: family.cover_memory_id,
    };
    const { data, error } = await sb.from("families").insert(insertData).select().single();

    if (error) throw error;
    return this.mapFamily(data);
  }

  async update(id: string, updates: UpdateFamily): Promise<Family> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("families")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFamily(data);
  }

  // ── Members ──────────────────────────────────────────────────────────

  async getMember(familyId: string, userId: string): Promise<FamilyMember | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("family_members")
      .select("*")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;
    return this.mapMember(data);
  }

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("family_members")
      .select("*")
      .eq("family_id", familyId);

    if (error || !data) return [];
    return data.map(this.mapMember);
  }

  async countMembers(familyId: string): Promise<number> {
    const sb = createAdminClient();
    const { count, error } = await sb
      .from("family_members")
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId);

    if (error) throw error;
    return count || 0;
  }

  async addMember(
    familyId: string,
    userId: string,
    role: MemberRole,
    displayName: string
  ): Promise<FamilyMember> {
    const sb = createAdminClient();
    const { data, error } = await sb.from("family_members").insert({
      family_id: familyId,
      user_id: userId,
      role,
      display_name: displayName,
    }).select().single();

    if (error) throw error;
    return this.mapMember(data);
  }

  async removeMember(familyId: string, userId: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb
      .from("family_members")
      .delete()
      .eq("family_id", familyId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async updateMemberRole(
    familyId: string,
    userId: string,
    role: MemberRole
  ): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb
      .from("family_members")
      .update({ role })
      .eq("family_id", familyId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  // ── Invitations ──────────────────────────────────────────────────────

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) return null;
    return this.mapInvitation(data);
  }

  async listInvitations(familyId: string): Promise<Invitation[]> {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("invitations")
      .select("*")
      .eq("family_id", familyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapInvitation);
  }

  async createInvitation(
    familyId: string,
    invitedBy: string,
    email: string,
    role: MemberRole
  ): Promise<Invitation> {
    const sb = createAdminClient();
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb.from("invitations").insert({
      family_id: familyId,
      invited_by: invitedBy,
      email,
      role,
      token,
      expires_at: expiresAt,
    }).select().single();

    if (error) throw error;
    return this.mapInvitation(data);
  }

  async acceptInvitation(token: string, _userId: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token);
    if (error) throw error;
  }

  async deleteInvitation(id: string): Promise<void> {
    const sb = createAdminClient();
    const { error } = await sb.from("invitations").delete().eq("id", id);
    if (error) throw error;
  }

  // ── Row mappers ──────────────────────────────────────────────────────

  private mapFamily(row: any): Family {
    return {
      id: row.id,
      name: row.name,
      created_by: row.created_by,
      description: row.description ?? null,
      cover_memory_id: row.cover_memory_id ?? null,
      subscription_tier: row.subscription_tier ?? "free",
      subscription_status: row.subscription_status ?? "active",
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      myslate_tx_id: row.myslate_tx_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapMember(row: any): FamilyMember {
    return {
      id: row.id,
      family_id: row.family_id,
      user_id: row.user_id,
      role: row.role,
      display_name: row.display_name,
      joined_at: row.joined_at,
    };
  }

  private mapInvitation(row: any): Invitation {
    return {
      id: row.id,
      family_id: row.family_id,
      invited_by: row.invited_by,
      email: row.email,
      role: row.role,
      token: row.token,
      expires_at: row.expires_at,
      accepted_at: row.accepted_at ?? null,
      created_at: row.created_at,
    };
  }
}
