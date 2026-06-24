/**
 * Family repository — interface for family vault data access.
 */

import type {
  Family,
  FamilyMember,
  Invitation,
  MemberRole,
  UpdateFamily,
} from "@/domain/entities";

export interface FamilyRepository {
  getById(id: string): Promise<Family | null>;

  /** Get the user's default family (first one they're a member of) */
  getUserFamily(userId: string): Promise<Family | null>;

  /** Get all families a user belongs to */
  getUserFamilies(userId: string): Promise<Family[]>;

  create(
    family: Omit<Family, "id" | "created_at" | "updated_at">
  ): Promise<Family>;

  update(id: string, updates: UpdateFamily): Promise<Family>;

  // ── Members ──────────────────────────────────────────────────────────────

  getMember(familyId: string, userId: string): Promise<FamilyMember | null>;

  listMembers(familyId: string): Promise<FamilyMember[]>;

  countMembers(familyId: string): Promise<number>;

  addMember(
    familyId: string,
    userId: string,
    role: MemberRole,
    displayName: string
  ): Promise<FamilyMember>;

  removeMember(familyId: string, userId: string): Promise<void>;

  updateMemberRole(
    familyId: string,
    userId: string,
    role: MemberRole
  ): Promise<void>;

  // ── Invitations ──────────────────────────────────────────────────────────

  getInvitationByToken(token: string): Promise<Invitation | null>;

  listInvitations(familyId: string): Promise<Invitation[]>;

  createInvitation(
    familyId: string,
    invitedBy: string,
    email: string,
    role: MemberRole
  ): Promise<Invitation>;

  acceptInvitation(token: string, userId: string): Promise<void>;

  deleteInvitation(id: string): Promise<void>;
}
