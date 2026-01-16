import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  await params; // id currently unused
  return NextResponse.json({
    total: 0,
    page: 1,
    page_size: 25,
    logs: [],
  });
}
