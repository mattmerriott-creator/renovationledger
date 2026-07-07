"use client";

import { useState } from "react";

function moneyFmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

let nextRowId = 1;

// Line items for one transaction. One receipt, multiple items, each with its
// own budget category — the transaction total is always the sum of these.
// The first row carries fixed ids (item_category_0 / item_amount_0 / etc.)
// so ReceiptField's scan can prefill it.
export default function TransactionLineItems({ categories }: { categories: string[] }) {
  const [rows, setRows] = useState<number[]>(() => [nextRowId++]);
  const [amounts, setAmounts] = useState<Record<number, number>>({});

  const total = Object.values(amounts).reduce((s, n) => s + (n || 0), 0);

  function addRow() {
    setRows((r) => [...r, nextRowId++]);
  }

  function removeRow(id: number) {
    setRows((r) => r.filter((rowId) => rowId !== id));
    setAmounts((a) => {
      const next = { ...a };
      delete next[id];
      return next;
    });
  }

  function parseAmount(v: string) {
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  return (
    <div className="field">
      <label>Line items</label>
      <p className="small muted" style={{ marginTop: -4, marginBottom: 10 }}>
        One row per item on the receipt. Split across categories if it's not all one thing —
        the transaction total is the sum below.
      </p>
      {rows.map((rowId, i) => (
        <div
          key={rowId}
          style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}
        >
          <select
            id={i === 0 ? "item_category_0" : undefined}
            name="item_category"
            defaultValue=""
            style={{ flex: "1 1 160px", fontSize: 14, padding: "10px 12px" }}
            aria-label="Item category"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            id={i === 0 ? "item_description_0" : undefined}
            name="item_description"
            placeholder="What was it"
            style={{ flex: "2 1 200px", fontSize: 14, padding: "10px 12px" }}
            aria-label="Item description"
          />
          <input
            id={i === 0 ? "item_amount_0" : undefined}
            name="item_amount"
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => setAmounts((a) => ({ ...a, [rowId]: parseAmount(e.target.value) }))}
            style={{ flex: "0 1 110px", fontSize: 14, padding: "10px 12px", textAlign: "right" }}
            aria-label="Item amount"
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => removeRow(rowId)}
            disabled={rows.length === 1}
            aria-label="Remove item"
            style={{ visibility: rows.length === 1 ? "hidden" : "visible" }}
          >
            ✕
          </button>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
          + Add another item
        </button>
        <span className="small" style={{ fontWeight: 600 }}>
          Total: {moneyFmt(total)}
        </span>
      </div>
    </div>
  );
}
