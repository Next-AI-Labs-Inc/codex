import { NextResponse } from "next/server";
import { getSpecFlows } from "@/lib/specFlows";

export const revalidate = 0;

export async function GET() {
  const data = await getSpecFlows();
  return NextResponse.json({ data });
}
