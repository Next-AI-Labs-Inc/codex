import { NextResponse } from "next/server";
import { getRepoSummaries } from "@/lib/memory-store";

interface RouteParams {
  params: Promise<{ appId: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { appId } = await params;
    const summaries = await getRepoSummaries();
    const summary = summaries.find((item) => item.repo === appId);
    if (!summary) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json({
      is_active: summary.activeCount > 0,
      total_memories_created: summary.total,
      total_memories_accessed: summary.total,
      first_accessed: summary.firstTimestamp,
      last_accessed: summary.lastTimestamp,
    });
  } catch (error) {
    console.error("Failed to load app details:", error);
    return NextResponse.json(
      { error: "Unable to load app details" },
      { status: 500 },
    );
  }
}

export async function PUT(_: Request, { params }: RouteParams) {
  await params;
  // No-op: activation toggles aren't persisted for JSONL backend.
  return NextResponse.json({ success: true });
}
