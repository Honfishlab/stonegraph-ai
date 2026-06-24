import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/server";
import { permanentViewer } from "@/lib/permanent-viewer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch memory to verify ownership and get arweave_tx_id
    const { data: memory, error } = await supabase
      .from("memories")
      .select("id, arweave_tx_id, title, description")
      .eq("id", id)
      .single();

    if (error || !memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!memory.arweave_tx_id) {
      return NextResponse.json(
        { error: "Memory not yet stored on Arweave" },
        { status: 400 }
      );
    }

    const viewerUrl = permanentViewer.getMemoryViewerUrl(memory.arweave_tx_id);
    const directUrl = permanentViewer.getDirectArweaveUrl(memory.arweave_tx_id);
    const isConfigured = permanentViewer.isConfigured();

    return NextResponse.json({
      viewer_url: viewerUrl,
      direct_url: directUrl,
      arweave_tx_id: memory.arweave_tx_id,
      configured: isConfigured,
      memory: {
        title: memory.title,
        description: memory.description,
      },
    });
  } catch (error) {
    console.error("Error fetching viewer URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch viewer URL" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Verify ownership
    const { data: memory, error } = await supabase
      .from("memories")
      .select("id, arweave_tx_id, family_id")
      .eq("id", id)
      .single();

    if (error || !memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (action === "generate") {
      // Generate and return viewer URL
      if (!memory.arweave_tx_id) {
        return NextResponse.json(
          { error: "Memory not yet stored on Arweave" },
          { status: 400 }
        );
      }

      const viewerUrl = permanentViewer.getMemoryViewerUrl(memory.arweave_tx_id);
      const embedCode = permanentViewer.getEmbedCode(memory.arweave_tx_id);

      return NextResponse.json({
        success: true,
        viewer_url: viewerUrl,
        embedCode: embedCode,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error generating viewer:", error);
    return NextResponse.json(
      { error: "Failed to generate viewer" },
      { status: 500 }
    );
  }
}
