import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const signinSchema = {
  parse: (body: any) => {
    if (!body?.email || !body?.password) {
      throw new Error("Email and password required");
    }
    return { email: body.email, password: body.password };
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let email: string, password: string;
    try {
      ({ email, password } = signinSchema.parse(body));
    } catch {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Use admin client (service role) to verify credentials
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(adminUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify credentials
    const { data: authData, error: authError } =
      await admin.auth.signInWithPassword({ email, password });

    if (authError) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    // 2. Load profile
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    // 3. Write Supabase auth cookies so SSR middleware can read them
    const cookieStore = await cookies();
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

    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        displayName: profile?.display_name || authData.user.email?.split("@")[0],
        avatarUrl: profile?.avatar_url,
      },
    });
  } catch (error) {
    console.error("[auth/signin] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signin failed" },
      { status: 500 }
    );
  }
}
