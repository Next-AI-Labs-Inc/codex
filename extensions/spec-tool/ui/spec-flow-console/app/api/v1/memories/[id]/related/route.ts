import { NextResponse } from "next/server";
import { getRelatedMemories } from "@/lib/memory-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const size = Number(searchParams.get("size") ?? "5");
    const related = await getRelatedMemories(id, Number.isFinite(size) ? size : 5);

    return NextResponse.json({
      items: related.map((memory) => ({
        id: memory.id,
        content: memory.lesson,
        created_at: Date.parse(memory.timestamp),
        state: memory.state,
        app_id: memory.repo,
        app_name: memory.repo,
        categories: memory.tags,
        metadata_: {
          context: memory.context,
          repo: memory.repo,
          event_type: memory.event_type,
          confidence: memory.confidence,
          tags: memory.tags,
        },
      })),
      total: related.length,
      page: 1,
      size: related.length,
      pages: 1,
    });
  } catch (error) {
    console.error("Failed to load related memories:", error);
    return NextResponse.json(
      { error: "Unable to load related memories" },
      { status: 500 },
    );
  }
}
