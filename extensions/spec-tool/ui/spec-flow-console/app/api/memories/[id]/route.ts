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
    return NextResponse.json(memory);
  } catch (error) {
    console.error(`Failed to load memory`, error);
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
    const updated = await updateMemory(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`Failed to update memory`, error);
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
    console.error(`Failed to delete memory`, error);
    return NextResponse.json(
      { error: "Unable to delete memory" },
      { status: 500 },
    );
  }
}
