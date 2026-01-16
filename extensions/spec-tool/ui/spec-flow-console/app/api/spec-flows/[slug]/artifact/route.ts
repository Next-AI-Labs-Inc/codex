import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getSpecArtifact, SpecArtifactKind } from "@/lib/specFlows";

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const kind = request.nextUrl.searchParams.get("type") as
    | SpecArtifactKind
    | null;

  if (!kind) {
    return NextResponse.json(
      { error: "Missing artifact type query parameter." },
      { status: 400 }
    );
  }

  const artifact = await getSpecArtifact(params.slug, kind);
  if (!artifact) {
    return NextResponse.json(
      { error: "Artifact not found for requested spec." },
      { status: 404 }
    );
  }

  const fileBuffer = await fs.readFile(artifact.path);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": artifact.mime,
      "Content-Disposition": `attachment; filename="${artifact.downloadName}"`,
    },
  });
}
