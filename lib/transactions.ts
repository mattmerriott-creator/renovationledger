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
