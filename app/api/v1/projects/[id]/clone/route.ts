import { NextRequest, NextResponse } from "next/server";
import getDb, { Project } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { cloneProjectRecord } from "@/lib/projects";

// POST /api/v1/projects/:id/clone — copies the project's numbers, budget,
// holding costs and manual comps into a new project (not transactions,
// draws or photos). Returns the new project.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const newId = cloneProjectRecord(auth.user.id, Number(id));
  if (!newId) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const project = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(newId) as Project;
  return NextResponse.json({ project }, { status: 201 });
}
