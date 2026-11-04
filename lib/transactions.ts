// Kept separate from db.ts so client components can import it without
// pulling in SQLite (same reasoning as lib/budget.ts).

export const PAYMENT_METHODS = [
  "Cash",
  "Check",
  "Debit Card",
  "Credit Card",
  "ACH / Bank Transfer",
  "Wire Transfer",
  "Line of Credit",
  "Other",
] as const;

// JSON line-item parsing shared by the /api/v1 transaction routes. Mirrors the
// form handling in lib/actions.ts: blank rows are dropped, and the header
// category is the single category used, "Split" for several, or "" for none.
export type TxLineItem = { category: string; description: string; amount: number };

export function parseJsonTxItems(raw: unknown): TxLineItem[] {
  const rawItems = Array.isArray(raw) ? raw : [];
  return rawItems
    .map((r) => {
      const it = r as Record<string, unknown>;
      return {
        category: typeof it?.category === "string" ? it.category.trim() : "",
        description: typeof it?.description === "string" ? it.description.trim() : "",
        amount: typeof it?.amount === "number" && !isNaN(it.amount) ? it.amount : 0,
      };
    })
    .filter((it) => it.amount > 0 || it.category || it.description);
}

export function summarizeTxItems(items: TxLineItem[]) {
  const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const distinctCategories = [...new Set(items.map((it) => it.category).filter(Boolean))];
  const headerCategory =
    distinctCategories.length === 1 ? distinctCategories[0] : distinctCategories.length > 1 ? "Split" : "";
  const headerDescription = items.length === 1 ? items[0].description : `${items.length} items`;
  return { total, headerCategory, headerDescription };
}
