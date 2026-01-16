import { NextResponse } from "next/server";
import { getCategorySummaries } from "@/lib/memory-store";

export async function GET() {
  try {
    const categories = await getCategorySummaries();
    return NextResponse.json({
      categories: categories.map(({ tag, count }) => ({
        id: tag,
        name: tag,
        description: `${count} memories`,
        updated_at: null,
        created_at: null,
      })),
      total: categories.length,
    });
  } catch (error) {
    console.error("Failed to load categories:", error);
    return NextResponse.json(
      { error: "Unable to load categories" },
      { status: 500 },
    );
  }
}
