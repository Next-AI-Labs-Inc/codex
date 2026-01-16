import { NextResponse } from "next/server";
import { getMemories, MemoryRecord } from "@/lib/memory-store";

interface RouteParams {
  params: Promise<{ appId: string }>;
}

function toAppMemory(record: MemoryRecord) {
  return {
    id: record.id,
    user_id: "swarm",
    content: record.lesson,
    state: record.state,
    updated_at: record.timestamp,
    deleted_at: null,
    app_id: record.repo,
    vector: null,
    metadata_: {
      context: record.context,
      event_type: record.event_type,
      confidence: record.confidence,
      tags: record.tags,
      repo: record.repo,
    },
    created_at: record.timestamp,
    archived_at: record.state === "archived" ? record.timestamp : null,
    categories: record.tags,
    app_name: record.repo,
  };
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
      memories: result.items.map(toAppMemory),
    });
  } catch (error) {
    console.error("Failed to load app memories:", error);
    return NextResponse.json(
      { error: "Unable to load app memories" },
      { status: 500 },
    );
  }
}
