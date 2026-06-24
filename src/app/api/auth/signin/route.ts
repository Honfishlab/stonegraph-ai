import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { z } from "zod";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = signinSchema.parse(body);

    const admin = createAdminClient();

    // 1. Sign in with password
    const { data: authData, error: authError } =
      await admin.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      if (authError.status === 400) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      throw authError;
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    // 2. Load profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("[auth/signin] Failed to load profile:", profileError);
    }

    // 3. Return session (client will set cookies)
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        displayName: profile?.display_name || authData.user.email?.split("@")[0],
        avatarUrl: profile?.avatar_url,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("[auth/signin] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signin failed" },
      { status: 500 }
    );
  }
}
