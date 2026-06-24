import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = signupSchema.parse(body);

    const admin = createAdminClient();

    // 1. Check if email already exists
    const { data: existingUsers, error: checkError } = await admin.auth.admin.listUsers();
    if (checkError) throw checkError;

    const exists = existingUsers?.users?.some((u) => u.email === email);
    if (exists) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // 2. Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm (no email verification for now)
    });

    if (authError) throw authError;
    if (!authUser?.user) throw new Error("Failed to create user");

    // 3. Create profile
    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: authUser.user.id,
        display_name: displayName || email.split("@")[0],
        email,
        avatar_url: null,
      });

    if (profileError) throw profileError;

    // 4. Sign in the new user
    const { data: session, error: signinError } = await admin.auth.signInWithPassword({
      email,
      password,
    });

    if (signinError) throw signinError;

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authUser.user.id,
          email,
          displayName: displayName || email.split("@")[0],
        },
        session: {
          access_token: session.session?.access_token,
          refresh_token: session.session?.refresh_token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/signup] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
