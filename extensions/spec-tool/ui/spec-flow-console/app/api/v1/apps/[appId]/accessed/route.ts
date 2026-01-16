import { NextResponse } from "next/server";
import { getMemories } from "@/lib/memory-store";

interface RouteParams {
  params: Promise<{ appId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { appId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const page_size = Number(searchParams.get("page_size") ?? "10");

    const result = await getMemories({
      repo: appId,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      size: Number.isFinite(page_size) && page_size > 0 ? page_size : 10,
    });

    return NextResponse.json({
      total: result.total,
      page: result.page,
      page_size: result.size,
      memories: result.items.map((memory) => ({
        memory: {
          id: memory.id,
          user_id: "swarm",
          content: memory.lesson,
          state: memory.state,
          updated_at: memory.timestamp,
          deleted_at: null,
          app_id: memory.repo,
          vector: null,
          metadata_: {
            context: memory.context,
            event_type: memory.event_type,
            confidence: memory.confidence,
            tags: memory.tags,
            repo: memory.repo,
          },
          created_at: memory.timestamp,
          archived_at: memory.state === "archived" ? memory.timestamp : null,
          categories: memory.tags,
          app_name: memory.repo,
        },
        access_count: 1,
      })),
    });
  } catch (error) {
    console.error("Failed to load accessed memories:", error);
    return NextResponse.json(
      { error: "Unable to load accessed memories" },
      { status: 500 },
    );
  }
}
