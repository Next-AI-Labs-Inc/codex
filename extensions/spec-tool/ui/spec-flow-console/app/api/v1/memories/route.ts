import { NextResponse } from "next/server";
import { createMemory, deleteMemory } from "@/lib/memory-store";

interface BulkDeleteBody {
  memory_ids?: string[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (Array.isArray(body.memory_ids)) {
      // Bulk delete path
      let removed = 0;
      for (const id of body.memory_ids) {
        const result = await deleteMemory(id);
        if (result.success) removed += result.removed;
      }
      return NextResponse.json({ success: true, removed });
    }

    const repo = typeof body.repo === "string" ? body.repo : body.app_id;
    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { error: "repo is required" },
        { status: 400 },
      );
    }

    const memory = await createMemory(repo, body);
    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Failed to create or delete memories:", error);
    return NextResponse.json(
      { error: "Unable to process memory request" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as BulkDeleteBody;
    const ids = Array.isArray(body.memory_ids) ? body.memory_ids : [];
    let removed = 0;
    for (const id of ids) {
      const result = await deleteMemory(id);
      if (result.success) removed += result.removed;
    }
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("Failed to delete memories:", error);
    return NextResponse.json(
      { error: "Unable to delete memories" },
      { status: 500 },
    );
  }
}
