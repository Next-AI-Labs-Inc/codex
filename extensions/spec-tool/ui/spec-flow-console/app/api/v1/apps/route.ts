import { NextResponse } from "next/server";
import { getRepoSummaries } from "@/lib/memory-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("name")?.toLowerCase() ?? "";
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("page_size") ?? "10");

    const summaries = await getRepoSummaries();
    const filtered = query
      ? summaries.filter((summary) =>
          summary.repo.toLowerCase().includes(query),
        )
      : summaries;

    const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
    const normalizedSize =
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const start = (normalizedPage - 1) * normalizedSize;
    const items = filtered.slice(start, start + normalizedSize);

    return NextResponse.json({
      total: filtered.length,
      page: normalizedPage,
      page_size: normalizedSize,
      apps: items.map((summary) => ({
        id: summary.repo,
        name: summary.repo,
        total_memories_created: summary.total,
        total_memories_accessed: summary.total,
        is_active: summary.activeCount > 0,
      })),
    });
  } catch (error) {
    console.error("Failed to load apps:", error);
    return NextResponse.json(
      { error: "Unable to load apps" },
      { status: 500 },
    );
  }
}

export async function PUT() {
  return NextResponse.json({ success: true });
}
