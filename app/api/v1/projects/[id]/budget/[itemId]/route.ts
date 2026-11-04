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

  // parent_id: omit the field to leave it as-is, send null to un-nest, or
  // send an id to (re)nest it. Same rule as creation — the target must be an
  // existing top-level item in this project — plus two checks only a move
  // needs: no self-parenting, and an item that already has sub-items of its
  // own can't be nested under another one, since the budget page only ever
  // renders one level of grouping.
  let parentId: number | null = current.parent_id;
  if ("parent_id" in body) {
    if (body.parent_id === null) {
      parentId = null;
    } else {
      const requestedParentId = asNumber(body.parent_id);
      if (requestedParentId === undefined) {
        return NextResponse.json({ error: "'parent_id' must be a number or null." }, { status: 400 });
      }
      if (requestedParentId === Number(itemId)) {
        return NextResponse.json({ error: "A budget item can't be its own parent." }, { status: 400 });
      }
      const parent = getDb()
        .prepare("SELECT id FROM budget_items WHERE id = ? AND project_id = ? AND parent_id IS NULL")
        .get(requestedParentId, Number(id));
      if (!parent) {
        return NextResponse.json(
          { error: "'parent_id' must reference an existing top-level budget item in this project." },
          { status: 400 }
        );
      }
      const hasChildren = getDb().prepare("SELECT 1 FROM budget_items WHERE parent_id = ? LIMIT 1").get(Number(itemId));
      if (hasChildren) {
        return NextResponse.json(
          { error: "This item has its own sub-items and can't be nested under another category." },
          { status: 400 }
        );
      }
      parentId = requestedParentId;
    }
  }

  getDb()
    .prepare(
      "UPDATE budget_items SET amount = ?, description = ?, qty = ?, unit = ?, unit_cost = ?, parent_id = ? WHERE id = ? AND project_id = ?"
    )
    .run(amount, description, qty, unit, unitCost, parentId, Number(itemId), Number(id));

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
