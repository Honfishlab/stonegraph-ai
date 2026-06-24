/**
 * FamilyService — orchestrates family vault operations.
 * Handles invitation flow, role management, tier checks.
 */

import type {
  Family,
  FamilyMember,
  Invitation,
  MemberRole,
  Tier,
} from "@/domain/entities";
import {
  CreateFamilySchema,
  UpdateFamilySchema,
  CreateInvitationSchema,
  TIERS,
  checkMemberLimit,
} from "@/domain/entities";
import type { FamilyRepository } from "@/domain/repositories";

export class FamilyService {
  constructor(private readonly repo: FamilyRepository) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Family | null> {
    return this.repo.getById(id);
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    return this.repo.getUserFamily(userId);
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    return this.repo.getUserFamilies(userId);
  }

  async getMember(
    familyId: string,
    userId: string
  ): Promise<FamilyMember | null> {
    return this.repo.getMember(familyId, userId);
  }

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    return this.repo.listMembers(familyId);
  }

  async getTier(familyId: string): Promise<Tier> {
    const family = await this.repo.getById(familyId);
    if (!family) throw new Error(`Family not found: ${familyId}`);
    return family.subscription_tier as Tier;
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  async create(
    userId: string,
    input: { name: string; description?: string }
  ): Promise<Family> {
    const validated = CreateFamilySchema.parse(input);

    // Create family
    const family = await this.repo.create({
      name: validated.name,
      created_by: userId,
      description: validated.description ?? null,
      cover_memory_id: null,
      subscription_tier: "free",
      subscription_status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      myslate_tx_id: null,
    });

    // Add creator as owner
    await this.repo.addMember(family.id, userId, "owner", userId);

    return family;
  }

  async update(
    familyId: string,
    userId: string,
    updates: Parameters<typeof UpdateFamilySchema.parse>[0]
  ): Promise<Family> {
    // Check that user is owner or admin
    await this.requireRole(familyId, userId, ["owner", "admin"]);

    const validated = UpdateFamilySchema.parse(updates);
    return this.repo.update(familyId, validated);
  }

  async updateTier(familyId: string, tier: Tier): Promise<Family> {
    return this.repo.update(familyId, { subscription_tier: tier });
  }

  // ── Invitations ──────────────────────────────────────────────────────────

  async invite(
    familyId: string,
    invitedBy: string,
    email: string,
    role: MemberRole = "member"
  ): Promise<Invitation> {
    // Check permissions
    await this.requireRole(familyId, invitedBy, ["owner", "admin"]);

    // Check member limit
    const tier = await this.getTier(familyId);
    const memberCount = await this.repo.countMembers(familyId);
    const check = checkMemberLimit(tier, memberCount);
    if (!check.allowed) throw new Error(check.reason);

    const validated = CreateInvitationSchema.parse({ email, role });

    return this.repo.createInvitation(
      familyId,
      invitedBy,
      validated.email,
      validated.role
    );
  }

  async acceptInvitation(token: string, userId: string): Promise<Family> {
    const invitation = await this.repo.getInvitationByToken(token);
    if (!invitation) throw new Error("Invalid invitation token");
    if (invitation.accepted_at) throw new Error("Invitation already accepted");
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    await this.repo.acceptInvitation(token, userId);
    await this.repo.addMember(
      invitation.family_id,
      userId,
      invitation.role,
      userId // display name — will be updated by user
    );

    const family = await this.repo.getById(invitation.family_id);
    if (!family) throw new Error("Family not found after accepting invitation");
    return family;
  }

  async cancelInvitation(
    invitationId: string,
    userId: string
  ): Promise<void> {
    // TODO: verify user has permission to cancel
    await this.repo.deleteInvitation(invitationId);
  }

  // ── Role management ──────────────────────────────────────────────────────

  async updateMemberRole(
    familyId: string,
    actorUserId: string,
    targetUserId: string,
    newRole: MemberRole
  ): Promise<void> {
    await this.requireRole(familyId, actorUserId, ["owner", "admin"]);

    // Only owners can assign admin/heir roles
    if (newRole === "admin" || newRole === "heir") {
      await this.requireRole(familyId, actorUserId, ["owner"]);
    }

    await this.repo.updateMemberRole(familyId, targetUserId, newRole);
  }

  async removeMember(
    familyId: string,
    actorUserId: string,
    targetUserId: string
  ): Promise<void> {
    await this.requireRole(familyId, actorUserId, ["owner", "admin"]);

    // Can't remove the owner
    const targetMember = await this.repo.getMember(familyId, targetUserId);
    if (!targetMember) throw new Error("Member not found");
    if (targetMember.role === "owner") {
      throw new Error("Cannot remove the owner from the family");
    }

    await this.repo.removeMember(familyId, targetUserId);
  }

  // ── Authorization helpers ────────────────────────────────────────────────

  private async requireRole(
    familyId: string,
    userId: string,
    requiredRoles: MemberRole[]
  ): Promise<FamilyMember> {
    const member = await this.repo.getMember(familyId, userId);
    if (!member) {
      throw new Error("You are not a member of this family");
    }
    if (!requiredRoles.includes(member.role)) {
      throw new Error(
        `This action requires one of these roles: ${requiredRoles.join(", ")}`
      );
    }
    return member;
  }
}
