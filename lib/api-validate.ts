// Small JSON-input helpers shared across the /api/v1 routes.

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && !isNaN(v) ? v : undefined;
}

// Returns null when the body isn't valid JSON, distinct from `{}` for a
// genuinely empty-but-valid body (e.g. a PATCH with no fields).
export async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}
