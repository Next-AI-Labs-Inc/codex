import { NextResponse } from "next/server";
import {
  deleteMemory,
  getMemoryById,
  updateMemory,
} from "@/lib/memory-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const memory = await getMemoryById(id);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: memory.id,
      text: memory.lesson,
      context: memory.context,
      created_at: memory.timestamp,
      state: memory.state,
      categories: memory.tags,
      app_name: memory.repo,
      repo: memory.repo,
      event_type: memory.event_type,
      confidence: memory.confidence,
      metadata_: {
        context: memory.context,
        repo: memory.repo,
        event_type: memory.event_type,
        confidence: memory.confidence,
        tags: memory.tags,
        command: memory.command,
        success_rate: memory.success_rate,
      },
    });
  } catch (error) {
    console.error("Failed to load memory:", error);
    return NextResponse.json(
      { error: "Unable to load memory" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.memory_content === "string") {
      updates.lesson = body.memory_content;
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags;
    }
    if (typeof body.context === "string") {
      updates.context = body.context;
    }
    if (typeof body.confidence === "number") {
      updates.confidence = body.confidence;
    }
    if (body.metadata && typeof body.metadata === "object") {
      updates.metadata = body.metadata;
    }

    const updated = await updateMemory(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update memory:", error);
    return NextResponse.json(
      { error: "Unable to update memory" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteMemory(id);
    if (!result.success) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, removed: result.removed });
  } catch (error) {
    console.error("Failed to delete memory:", error);
    return NextResponse.json(
      { error: "Unable to delete memory" },
      { status: 500 },
    );
  }
}
