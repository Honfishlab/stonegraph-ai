import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[auth/user] Failed to load profile:", profileError);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || user.email?.split("@")[0],
        avatarUrl: profile?.avatar_url,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("[auth/user] Error:", error);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
