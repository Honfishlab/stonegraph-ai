import { describe, it, expect, beforeEach } from "vitest";
import { FamilyService } from "@/domain/services/family-service";
import { MockFamilyRepository } from "@/test/mocks/MockFamilyRepository";

describe("FamilyService", () => {
  let familyService: FamilyService;
  let mockRepo: MockFamilyRepository;
  const USER_ID = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    mockRepo = new MockFamilyRepository();
    familyService = new FamilyService(mockRepo);
  });

  // Helper — matches actual familyService.create(userId, { name }) signature.
  // Returns a family at "free" tier (max 1 member).
  const makeFamily = (name = "Test Family", ownerUserId = USER_ID) =>
    familyService.create(ownerUserId, { name });

  // Helper — family upgraded to "family" tier (10 members) so invitations succeed.
  const makeInvitableFamily = async (name = "Test Family") => {
    const family = await makeFamily(name);
    await familyService.updateTier(family.id, "family");
    return family;
  };

  describe("create", () => {
    it("should create a family with owner member", async () => {
      const family = await makeFamily("Smith Family");

      expect(family.id).toBeDefined();
      expect(family.name).toBe("Smith Family");
      expect(family.subscription_tier).toBe("free");

      const members = await familyService.listMembers(family.id);
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(USER_ID);
      expect(members[0].role).toBe("owner");
    });

    it("should reject empty name", async () => {
      await expect(makeFamily("")).rejects.toThrow();
    });

    it("should accept description", async () => {
      const family = await familyService.create(USER_ID, {
        name: "Family",
        description: "With a desc",
      });
      expect(family.description).toBe("With a desc");
    });
  });

  describe("getById", () => {
    it("should retrieve created family", async () => {
      const created = await makeFamily();
      const retrieved = await familyService.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Family");
    });

    it("should return null for non-existent id", async () => {
      expect(await familyService.getById("non-existent")).toBeNull();
    });
  });

  describe("getUserFamily", () => {
    it("should retrieve family for user", async () => {
      const created = await makeFamily();
      const family = await familyService.getUserFamily(USER_ID);

      expect(family).toBeDefined();
      expect(family?.id).toBe(created.id);
    });

    it("should return null if user has no family", async () => {
      const family = await familyService.getUserFamily(
        "00000000-0000-0000-0000-000000000099"
      );
      expect(family).toBeNull();
    });
  });

  describe("getTier", () => {
    it("should return family tier (default free)", async () => {
      const family = await makeFamily();
      const tier = await familyService.getTier(family.id);
      expect(tier).toBe("free");
    });
  });

  describe("updateTier", () => {
    it("should upgrade family tier", async () => {
      const family = await makeFamily();
      await familyService.updateTier(family.id, "professional");

      const updated = await familyService.getById(family.id);
      expect(updated?.subscription_tier).toBe("professional");
    });
  });

  describe("invite", () => {
    it("should create invitation as owner", async () => {
      const family = await makeInvitableFamily();

      const invitation = await familyService.invite(
        family.id,
        USER_ID,
        "friend@example.com",
        "member"
      );

      expect(invitation.email).toBe("friend@example.com");
      expect(invitation.role).toBe("member");
      expect(invitation.family_id).toBe(family.id);
    });

    it("should reject invite from non-owner", async () => {
      const family = await makeInvitableFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Member");

      await expect(
        familyService.invite(family.id, memberUser, "friend@example.com", "member")
      ).rejects.toThrow();
    });

    it("should reject invite that exceeds member limit", async () => {
      // A family at free tier (1-member limit) already has owner.
      const family = await makeFamily();

      await expect(
        familyService.invite(family.id, USER_ID, "another@example.com", "member")
      ).rejects.toThrow();
    });
  });

  describe("acceptInvitation", () => {
    it("should add member and mark invitation accepted", async () => {
      const family = await makeInvitableFamily();
      const invitation = await familyService.invite(
        family.id,
        USER_ID,
        "friend@example.com",
        "member"
      );

      const newUserId = "00000000-0000-0000-0000-000000000002";
      const result = await familyService.acceptInvitation(
        invitation.token,
        newUserId
      );

      expect(result.id).toBe(family.id);
      const members = await familyService.listMembers(family.id);
      expect(members).toHaveLength(2);
      expect(members.find((m) => m.user_id === newUserId)).toBeDefined();
    });

    it("should reject expired invitation", async () => {
      const family = await makeInvitableFamily();
      const invitation = await familyService.invite(
        family.id,
        USER_ID,
        "friend@example.com",
        "member"
      );

      await mockRepo.expireInvitation(invitation.id);

      await expect(
        familyService.acceptInvitation(
          invitation.token,
          "00000000-0000-0000-0000-000000000002"
        )
      ).rejects.toThrow("expired");
    });

    it("should reject already-used invitation", async () => {
      const family = await makeInvitableFamily();
      const invitation = await familyService.invite(
        family.id,
        USER_ID,
        "friend@example.com",
        "member"
      );

      await familyService.acceptInvitation(
        invitation.token,
        "00000000-0000-0000-0000-000000000002"
      );

      await expect(
        familyService.acceptInvitation(
          invitation.token,
          "00000000-0000-0000-0000-000000000003"
        )
      ).rejects.toThrow("already accepted");
    });

    it("should reject invalid token", async () => {
      await expect(
        familyService.acceptInvitation(
          "invalid-token",
          "00000000-0000-0000-0000-000000000002"
        )
      ).rejects.toThrow("Invalid invitation");
    });
  });

  describe("cancelInvitation", () => {
    it("should remove invitation", async () => {
      const family = await makeInvitableFamily();
      const invitation = await familyService.invite(
        family.id,
        USER_ID,
        "friend@example.com",
        "member"
      );

      await familyService.cancelInvitation(invitation.id, USER_ID);

      const invitations = await mockRepo.listInvitations(family.id);
      expect(invitations).toHaveLength(0);
    });
  });

  describe("updateMemberRole", () => {
    it("should change member role as owner", async () => {
      const family = await makeFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Member");

      await familyService.updateMemberRole(
        family.id,
        USER_ID,
        memberUser,
        "admin"
      );

      const member = await familyService.getMember(family.id, memberUser);
      expect(member?.role).toBe("admin");
    });

    it("should reject role change from a plain member", async () => {
      const family = await makeFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Member");

      await expect(
        familyService.updateMemberRole(
          family.id,
          memberUser, // member, not owner/admin
          USER_ID,
          "member"
        )
      ).rejects.toThrow();
    });

    it("should require owner to assign admin/heir role", async () => {
      const family = await makeFamily();
      const adminUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, adminUser, "admin", "Admin");

      await expect(
        familyService.updateMemberRole(
          family.id,
          adminUser, // admin, cannot assign admin/heir — only owner can
          USER_ID,
          "heir"
        )
      ).rejects.toThrow();
    });
  });

  describe("removeMember", () => {
    it("should remove member", async () => {
      const family = await makeFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Member");

      await familyService.removeMember(family.id, USER_ID, memberUser);

      const members = await familyService.listMembers(family.id);
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(USER_ID);
    });

    it("should reject removal of owner", async () => {
      const family = await makeFamily();

      await expect(
        familyService.removeMember(family.id, USER_ID, USER_ID)
      ).rejects.toThrow("Cannot remove the owner");
    });

    it("should reject removal from a non-owner", async () => {
      const family = await makeFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Member");

      await expect(
        familyService.removeMember(family.id, memberUser, USER_ID)
      ).rejects.toThrow();
    });
  });

  describe("listMembers", () => {
    it("should list all family members", async () => {
      const family = await makeFamily();
      await mockRepo.addMember(
        family.id,
        "00000000-0000-0000-0000-000000000002",
        "member",
        "M2"
      );
      await mockRepo.addMember(
        family.id,
        "00000000-0000-0000-0000-000000000003",
        "heir",
        "M3"
      );

      const members = await familyService.listMembers(family.id);
      expect(members).toHaveLength(3);
      expect(members.map((m) => m.role).sort()).toEqual([
        "heir",
        "member",
        "owner",
      ]);
    });
  });

  describe("getMember", () => {
    it("should retrieve specific member", async () => {
      const family = await makeFamily();
      const memberUser = "00000000-0000-0000-0000-000000000002";
      await mockRepo.addMember(family.id, memberUser, "member", "Test Member");

      const member = await familyService.getMember(family.id, memberUser);

      expect(member).toBeDefined();
      expect(member?.user_id).toBe(memberUser);
      expect(member?.role).toBe("member");
    });

    it("should return null for non-member", async () => {
      const family = await makeFamily();
      const member = await familyService.getMember(
        family.id,
        "00000000-0000-0000-0000-000000000099"
      );
      expect(member).toBeNull();
    });
  });
});
