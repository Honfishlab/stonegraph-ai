/**
 * GET /api/family/accept-preview — preview invitation before accepting (public endpoint)
 */

import { NextRequest, NextResponse } from "next/server";
import { SupabaseFamilyRepository } from "@/infrastructure/repositories/supabase-family.repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const familyRepo = new SupabaseFamilyRepository();
    const invitation = await familyRepo.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ error: "Already accepted" }, { status: 409 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    // Fetch inviter name
    const family = await familyRepo.getById(invitation.family_id);

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        familyName: family?.name ?? "Unknown",
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("[family/accept-preview]", error);
    return NextResponse.json(
      { error: "Failed to load invitation" },
      { status: 500 }
    );
  }
}
