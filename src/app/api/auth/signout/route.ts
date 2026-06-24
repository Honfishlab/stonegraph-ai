import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[auth/signout] Error:", error);
      return NextResponse.json(
        { error: "Signout failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/signout] Error:", error);
    return NextResponse.json(
      { error: "Signout failed" },
      { status: 500 }
    );
  }
}
