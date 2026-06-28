import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/admin";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().max(100).optional().or(z.literal("")),
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

    // 3. Create profile (upsert in case it already exists from a partial signup)
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: authUser.user.id,
        display_name: displayName || email.split("@")[0],
        email,
        avatar_url: null,
      });

    if (profileError) throw profileError;

    // 4. Sign in the new user (set session cookies so middleware can read them)
    const cookieStore = await import("next/headers").then(m => m.cookies());
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              })
            );
          },
        },
      }
    );

    // SignIn with password through the SSR client to get cookies written
    const { data: sessionData, error: signinError } = await supabase.auth.signInWithPassword({
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

    // Supabase errors are objects with message property, not Error instances
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error && error.message
        ? String(error.message)
        : "Signup failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
