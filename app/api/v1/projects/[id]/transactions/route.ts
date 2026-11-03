import { NextRequest, NextResponse } from "next/server";
import getDb, { Transaction, TransactionItem } from "@/lib/db";
import { authenticateApiRequest, requireOwnedProjectForApi } from "@/lib/api-auth";
import { asString, parseJsonBody } from "@/lib/api-validate";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const db = getDb();
  const transactions = db
    .prepare("SELECT * FROM transactions WHERE project_id = ? ORDER BY tx_date DESC, id DESC")
    .all(Number(id)) as Transaction[];
  const getItems = db.prepare("SELECT * FROM transaction_items WHERE transaction_id = ?");

  return NextResponse.json({
    transactions: transactions.map((t) => ({ ...t, items: getItems.all(t.id) as TransactionItem[] })),
  });
}

// A transaction is one vendor/date/payment-method record made up of one or
// more line items, same shape as the "add transaction" form — just without
// a receipt file, which this JSON endpoint doesn't accept.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((raw) => {
      const it = raw as Record<string, unknown>;
      return {
        category: typeof it?.category === "string" ? it.category.trim() : "",
        description: typeof it?.description === "string" ? it.description.trim() : "",
        amount: typeof it?.amount === "number" && !isNaN(it.amount) ? it.amount : 0,
      };
    })
    .filter((it) => it.amount > 0 || it.category || it.description);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "'items' must be a non-empty array of { category, description, amount }." },
      { status: 400 }
    );
  }

  const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const distinctCategories = [...new Set(items.map((it) => it.category).filter(Boolean))];
  const headerCategory =
    distinctCategories.length === 1 ? distinctCategories[0] : distinctCategories.length > 1 ? "Split" : "";
  const headerDescription = items.length === 1 ? items[0].description : `${items.length} items`;
  const txType = body.tx_type === "return" ? "return" : "expense";
  const txDate = asString(body.tx_date) || new Date().toISOString().slice(0, 10);

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO transactions (project_id, tx_date, vendor, category, description, tx_type, amount, payment_method, receipt_file, receipt_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '')`
    )
    .run(
      Number(id), txDate, asString(body.vendor)?.trim() ?? "", headerCategory, headerDescription,
      txType, total, asString(body.payment_method)?.trim() ?? ""
    );
  const txId = Number(result.lastInsertRowid);

  const insertItem = db.prepare(
    "INSERT INTO transaction_items (transaction_id, category, description, amount) VALUES (?, ?, ?, ?)"
  );
  for (const it of items) insertItem.run(txId, it.category, it.description, it.amount);

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(txId) as Transaction;
  const txItems = db
    .prepare("SELECT * FROM transaction_items WHERE transaction_id = ?")
    .all(txId) as TransactionItem[];
  return NextResponse.json({ transaction: { ...transaction, items: txItems } }, { status: 201 });
}
