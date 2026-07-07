import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getOwnedProject } from "@/lib/auth";
import { readUpload, contentTypeFor } from "@/lib/files";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const project = getOwnedProject(Number(id), user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = readUpload(Number(id), filename);
  if (!data) return NextResponse.json({ error: "File not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(filename),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
