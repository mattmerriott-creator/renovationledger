import { NextRequest, NextResponse } from "next/server";
import { getUserFromApiKey, getOwnedProject } from "./auth";
import { User, Project } from "./db";

type AuthOk = { user: User };
type AuthErr = { error: NextResponse };

// Authenticates a /api/v1 request against its Authorization: Bearer <key>
// header. Distinct from the cookie-based session auth the rest of the app
// uses — an external LLM or script can't carry browser cookies.
export function authenticateApiRequest(req: NextRequest): AuthOk | AuthErr {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const key = match?.[1]?.trim();
  if (!key) {
    return {
      error: NextResponse.json(
        { error: "Missing API key. Send 'Authorization: Bearer <key>'." },
        { status: 401 }
      ),
    };
  }
  const user = getUserFromApiKey(key);
  if (!user) {
    return { error: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  }
  if (user.plan === "free") {
    return { error: NextResponse.json({ error: "API access requires a paid plan." }, { status: 403 }) };
  }
  return { user };
}

export function requireOwnedProjectForApi(
  projectId: number,
  userId: number
): { project: Project } | { error: NextResponse } {
  const project = getOwnedProject(projectId, userId) as Project | undefined;
  if (!project) {
    return { error: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  }
  return { project };
}
