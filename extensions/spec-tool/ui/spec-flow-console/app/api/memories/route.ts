import { NextResponse } from "next/server";
import {
  createMemory,
  getMemories,
  MemoryQueryOptions,
} from "@/lib/memory-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const size = Number(searchParams.get("size") ?? "10");

    const query: MemoryQueryOptions = {
      search: searchParams.get("search") ?? undefined,
      repo: searchParams.get("repo") ?? undefined,
      event_type: searchParams.get("event_type") ?? undefined,
      tags: searchParams.getAll("tag"),
      page: Number.isFinite(page) && page > 0 ? page : 1,
      size: Number.isFinite(size) && size > 0 ? size : 10,
    };

    const result = await getMemories(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to load memories:", error);
    return NextResponse.json(
      { error: "Unable to load memories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo = body.repo;
    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { error: "repo is required" },
        { status: 400 },
      );
    }

    const memory = await createMemory(repo, body);
    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Failed to create memory:", error);
    return NextResponse.json(
      { error: "Unable to create memory" },
      { status: 500 },
    );
  }
}
