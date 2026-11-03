import { NextRequest, NextResponse } from "next/server";
import getDb, { BudgetItem } from "@/lib/db";
import { BUDGET_UNITS } from "@/lib/budget";
import { authenticateApiRequest, requireOwnedProjectForApi } from "@/lib/api-auth";
import { asString, asNumber, parseJsonBody } from "@/lib/api-validate";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const items = getDb()
    .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY sort")
    .all(Number(id)) as BudgetItem[];
  return NextResponse.json({ budget_items: items });
}

// Adds a top-level budget line. Sub-items (parent_id) aren't exposed via the
// API yet — that stays a UI-only feature for now.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const category = asString(body.category)?.trim();
  if (!category) return NextResponse.json({ error: "'category' is required." }, { status: 400 });

  const description = asString(body.description)?.trim() ?? "";
  const qty = asNumber(body.qty) ?? 0;
  const unitCost = asNumber(body.unit_cost) ?? 0;
  const requestedUnit = asString(body.unit);
  const unit = requestedUnit && (BUDGET_UNITS as readonly string[]).includes(requestedUnit) ? requestedUnit : "job";
  const amount = qty > 0 && unitCost > 0 ? Math.round(qty * unitCost * 100) / 100 : asNumber(body.amount) ?? 0;

  const result = getDb()
    .prepare(
      "INSERT INTO budget_items (project_id, category, description, amount, sort, qty, unit, unit_cost) VALUES (?, ?, ?, ?, 999, ?, ?, ?)"
    )
    .run(Number(id), category, description, amount, qty, unit, unitCost);

  const item = getDb()
    .prepare("SELECT * FROM budget_items WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as BudgetItem;
  return NextResponse.json({ budget_item: item }, { status: 201 });
}
