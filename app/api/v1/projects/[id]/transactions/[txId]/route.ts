import { NextRequest, NextResponse } from "next/server";
import getDb, { Transaction, TransactionItem } from "@/lib/db";
import { authenticateApiRequest, requireOwnedProjectForApi } from "@/lib/api-auth";
import { asString, parseJsonBody } from "@/lib/api-validate";
import { parseJsonTxItems, summarizeTxItems, TxLineItem } from "@/lib/transactions";

// Edits a transaction. Every field is optional; omitted fields stay as-is.
//   vendor, tx_date, tx_type ("expense" | "return"), payment_method
//   items: [{ category, description, amount }] replaces all line items
//   category: sets every line item to this category (shortcut when you only
//             want to recategorize). Can't be combined with `items`.
// The receipt file isn't changed here, same as the edit form in the app.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id, txId } = await params;
  const projectId = Number(id);
  const transactionId = Number(txId);

  const owned = requireOwnedProjectForApi(projectId, auth.user.id);
  if ("error" in owned) return owned.error;

  const db = getDb();
  const current = db
    .prepare("SELECT * FROM transactions WHERE id = ? AND project_id = ?")
    .get(transactionId, projectId) as Transaction | undefined;
  if (!current) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  if ("items" in body && "category" in body) {
    return NextResponse.json({ error: "Send either 'items' or 'category', not both." }, { status: 400 });
  }

  const currentItems = db
    .prepare("SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY id")
    .all(transactionId) as TransactionItem[];
  // Older transactions may have no line items; treat the header as one item.
  let items: TxLineItem[] =
    currentItems.length > 0
      ? currentItems.map((it) => ({ category: it.category, description: it.description, amount: it.amount }))
      : [{ category: current.category, description: current.description, amount: current.amount }];

  if ("items" in body) {
    items = parseJsonTxItems(body.items);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "'items' must be a non-empty array of { category, description, amount }." },
        { status: 400 }
      );
    }
  } else if ("category" in body) {
    const category = asString(body.category);
    if (category === undefined) {
      return NextResponse.json({ error: "'category' must be a string." }, { status: 400 });
    }
    items = items.map((it) => ({ ...it, category: category.trim() }));
  }

  const { total, headerCategory, headerDescription } = summarizeTxItems(items);
  const txDate = asString(body.tx_date)?.trim() || current.tx_date;
  const vendor = asString(body.vendor)?.trim() ?? current.vendor;
  const paymentMethod = asString(body.payment_method)?.trim() ?? current.payment_method;
  const txType =
    body.tx_type === "return" || body.tx_type === "expense" ? body.tx_type : current.tx_type;

  db.transaction(() => {
    db.prepare(
      `UPDATE transactions SET tx_date = ?, vendor = ?, category = ?, description = ?, tx_type = ?, amount = ?, payment_method = ?
       WHERE id = ? AND project_id = ?`
    ).run(txDate, vendor, headerCategory, headerDescription, txType, total, paymentMethod, transactionId, projectId);

    db.prepare("DELETE FROM transaction_items WHERE transaction_id = ?").run(transactionId);
    const insertItem = db.prepare(
      "INSERT INTO transaction_items (transaction_id, category, description, amount) VALUES (?, ?, ?, ?)"
    );
    for (const it of items) insertItem.run(transactionId, it.category, it.description, it.amount);
  })();

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId) as Transaction;
  const txItems = db
    .prepare("SELECT * FROM transaction_items WHERE transaction_id = ?")
    .all(transactionId) as TransactionItem[];
  return NextResponse.json({ transaction: { ...transaction, items: txItems } });
}
