import { NextResponse } from "next/server";
import { getRepoSummaries } from "@/lib/memory-store";

export async function GET() {
  try {
    const summaries = await getRepoSummaries();
    const total_memories = summaries.reduce((sum, repo) => sum + repo.total, 0);
    const apps = summaries.map((summary) => ({
      id: summary.repo,
      name: summary.repo,
      total_memories_created: summary.total,
      total_memories_accessed: summary.total, // Placeholder: treat created == accessed in JSONL
      is_active: summary.activeCount > 0,
    }));

    return NextResponse.json({
      total_memories,
      total_apps: apps.length,
      apps,
    });
  } catch (error) {
    console.error("Failed to load stats:", error);
    return NextResponse.json(
      { error: "Unable to load stats" },
      { status: 500 },
    );
  }
}
