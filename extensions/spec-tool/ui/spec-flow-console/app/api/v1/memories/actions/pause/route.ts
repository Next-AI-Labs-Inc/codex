import { NextResponse } from "next/server";
import { updateMemory } from "@/lib/memory-store";

interface PauseBody {
  memory_ids?: string[];
  state?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PauseBody;
    const ids = Array.isArray(body.memory_ids) ? body.memory_ids : [];
    const state =
      body.state === "archived" || body.state === "paused" || body.state === "active"
        ? body.state
        : "active";

    const updatedIds: string[] = [];
    for (const id of ids) {
      const updated = await updateMemory(id, { state });
      if (updated) {
        updatedIds.push(id);
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedIds.length,
      state,
    });
  } catch (error) {
    console.error("Failed to update memory state:", error);
    return NextResponse.json(
      { error: "Unable to update memory state" },
      { status: 500 },
    );
  }
}
