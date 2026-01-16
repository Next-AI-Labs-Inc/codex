import { NextResponse } from "next/server";
import {
  getMemories,
  MemoryRecord,
  MemoryQueryOptions,
} from "@/lib/memory-store";

interface FilterRequestBody {
  user_id?: string;
  search_query?: string;
  page?: number;
  size?: number;
  app_ids?: string[];
  category_ids?: string[];
  sort_column?: string;
  sort_direction?: "asc" | "desc";
  show_archived?: boolean;
}

function mapRecord(record: MemoryRecord) {
  return {
    id: record.id,
    content: record.lesson,
    context: record.context,
    created_at: record.timestamp,
    state: record.state,
    app_id: record.repo,
    categories: record.tags,
    metadata_: {
      context: record.context,
      repo: record.repo,
      event_type: record.event_type,
      confidence: record.confidence,
      command: record.command,
      success_rate: record.success_rate,
      tags: record.tags,
    },
    app_name: record.repo,
  };
}

function applySorting(items: MemoryRecord[], column?: string, direction?: string) {
  const sorted = [...items];
  if (column === "memory") {
    sorted.sort((a, b) => {
      const left = a.lesson.localeCompare(b.lesson);
      return direction === "asc" ? left : -left;
    });
  } else if (column === "app_name") {
    sorted.sort((a, b) => {
      const left = a.repo.localeCompare(b.repo);
      return direction === "asc" ? left : -left;
    });
  } else if (column === "created_at") {
    sorted.sort((a, b) => {
      const diff =
        Date.parse(a.timestamp) - Date.parse(b.timestamp);
      return direction === "asc" ? diff : -diff;
    });
  }
  return sorted;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FilterRequestBody;
    const {
      search_query,
      page = 1,
      size = 10,
      app_ids = [],
      category_ids = [],
      sort_column,
      sort_direction,
      show_archived = true,
    } = body;

    const options: MemoryQueryOptions = {
      search: search_query,
      page,
      size: Math.max(1, Math.min(size, 100)),
    };

    if (app_ids.length === 1) {
      options.repo = app_ids[0];
    }

    if (category_ids.length > 0) {
      options.tags = category_ids;
    }

    const result = await getMemories(options);
    let items: MemoryRecord[] = result.items;

    if (!show_archived) {
      items = items.filter((item) => item.state !== "archived");
    }

    if (sort_column) {
      items = applySorting(items, sort_column, sort_direction);
    }

    return NextResponse.json({
      items: items.map(mapRecord),
      total: result.total,
      page: result.page,
      size: result.size,
      pages: result.pages,
    });
  } catch (error) {
    console.error("Failed to filter memories:", error);
    return NextResponse.json(
      { error: "Unable to filter memories" },
      { status: 500 },
    );
  }
}
