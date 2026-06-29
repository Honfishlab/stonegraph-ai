/**
 * Mock FamilyRepository for testing
 */

import type {
  Family,
  FamilyMember,
  Invitation,
  MemberRole,
  UpdateFamily,
} from "@/domain/entities";
import type { FamilyRepository } from "@/domain/repositories";

export class MockFamilyRepository implements FamilyRepository {
  private families: Family[] = [];
  private members: FamilyMember[] = [];
  private invitations: Invitation[] = [];

  async getById(id: string): Promise<Family | null> {
    return this.families.find((f) => f.id === id) || null;
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    const membership = this.members.find((m) => m.user_id === userId);
    if (!membership) return null;
    return this.families.find((f) => f.id === membership.family_id) || null;
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    const familyIds = this.members
      .filter((m) => m.user_id === userId)
      .map((m) => m.family_id);
    return this.families.filter((f) => familyIds.includes(f.id));
  }

  async create(
    family: Omit<Family, "id" | "created_at" | "updated_at">
  ): Promise<Family> {
    const full: Family = {
      ...family,
      id: `test-family-${this.families.length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.families.push(full);
    return full;
  }

  async update(id: string, updates: UpdateFamily): Promise<Family> {
    const family = this.families.find((f) => f.id === id);
    if (!family) throw new Error(`Family ${id} not found`);
    Object.assign(family, updates, { updated_at: new Date().toISOString() });
    return family;
  }

  async getMember(familyId: string, userId: string): Promise<FamilyMember | null> {
    return (
      this.members.find((m) => m.family_id === familyId && m.user_id === userId) ||
      null
    );
  }

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    return this.members.filter((m) => m.family_id === familyId);
  }

  async countMembers(familyId: string): Promise<number> {
    return this.members.filter((m) => m.family_id === familyId).length;
  }

  async addMember(
    familyId: string,
    userId: string,
    role: MemberRole,
    displayName: string
  ): Promise<FamilyMember> {
    const member: FamilyMember = {
      id: `test-member-${this.members.length + 1}`,
      family_id: familyId,
      user_id: userId,
      role,
      display_name: displayName,
      joined_at: new Date().toISOString(),
    };
    this.members.push(member);
    return member;
  }

  async removeMember(familyId: string, userId: string): Promise<void> {
    this.members = this.members.filter(
      (m) => !(m.family_id === familyId && m.user_id === userId)
    );
  }

  async updateMemberRole(
    familyId: string,
    userId: string,
    role: MemberRole
  ): Promise<void> {
    const member = this.members.find(
      (m) => m.family_id === familyId && m.user_id === userId
    );
    if (member) {
      member.role = role;
    }
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return this.invitations.find((i) => i.token === token) || null;
  }

  async listInvitations(familyId: string): Promise<Invitation[]> {
    return this.invitations.filter((i) => i.family_id === familyId);
  }

  async createInvitation(
    familyId: string,
    invitedBy: string,
    email: string,
    role: MemberRole
  ): Promise<Invitation> {
    const invitation: Invitation = {
      id: `test-invitation-${this.invitations.length + 1}`,
      family_id: familyId,
      invited_by: invitedBy,
      email,
      role,
      token: `test-token-${Date.now()}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
      created_at: new Date().toISOString(),
    };
    this.invitations.push(invitation);
    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = this.invitations.find((i) => i.token === token);
    if (invitation) {
      invitation.accepted_at = new Date().toISOString();
    }
  }

  async deleteInvitation(id: string): Promise<void> {
    this.invitations = this.invitations.filter((i) => i.id !== id);
  }

  async expireInvitation(id: string): Promise<void> {
    const inv = this.invitations.find((i) => i.id === id);
    if (inv) {
      inv.expires_at = new Date(Date.now() - 1000).toISOString();
    }
  }

  async updateInvitation(
    id: string,
    updates: Partial<Invitation>
  ): Promise<Invitation> {
    const inv = this.invitations.find((i) => i.id === id);
    if (!inv) throw new Error(`Invitation ${id} not found`);
    Object.assign(inv, updates);
    return inv;
  }

  reset(): void {
    this.families = [];
    this.members = [];
    this.invitations = [];
  }

  get familyCount(): number {
    return this.families.length;
  }
}
