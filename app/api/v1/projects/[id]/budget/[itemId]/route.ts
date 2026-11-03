import { NextRequest, NextResponse } from "next/server";
import getDb, { BudgetItem } from "@/lib/db";
import { BUDGET_UNITS } from "@/lib/budget";
import { authenticateApiRequest, requireOwnedProjectForApi } from "@/lib/api-auth";
import { asString, asNumber, parseJsonBody } from "@/lib/api-validate";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id, itemId } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const current = getDb()
    .prepare("SELECT * FROM budget_items WHERE id = ? AND project_id = ?")
    .get(Number(itemId), Number(id)) as BudgetItem | undefined;
  if (!current) return NextResponse.json({ error: "Budget item not found." }, { status: 404 });

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const description = asString(body.description) ?? current.description;
  const qty = asNumber(body.qty) ?? current.qty;
  const unitCost = asNumber(body.unit_cost) ?? current.unit_cost;
  const requestedUnit = asString(body.unit);
  const unit =
    requestedUnit && (BUDGET_UNITS as readonly string[]).includes(requestedUnit) ? requestedUnit : current.unit;
  const amount =
    qty > 0 && unitCost > 0 ? Math.round(qty * unitCost * 100) / 100 : asNumber(body.amount) ?? current.amount;

  getDb()
    .prepare(
      "UPDATE budget_items SET amount = ?, description = ?, qty = ?, unit = ?, unit_cost = ? WHERE id = ? AND project_id = ?"
    )
    .run(amount, description, qty, unit, unitCost, Number(itemId), Number(id));

  const item = getDb().prepare("SELECT * FROM budget_items WHERE id = ?").get(Number(itemId)) as BudgetItem;
  return NextResponse.json({ budget_item: item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id, itemId } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const db = getDb();
  // Deleting a group takes its sub-items with it, same as the UI action.
  db.prepare("DELETE FROM budget_items WHERE parent_id = ? AND project_id = ?").run(Number(itemId), Number(id));
  const result = db
    .prepare("DELETE FROM budget_items WHERE id = ? AND project_id = ?")
    .run(Number(itemId), Number(id));
  if (result.changes === 0) return NextResponse.json({ error: "Budget item not found." }, { status: 404 });

  return NextResponse.json({ deleted: true });
}
