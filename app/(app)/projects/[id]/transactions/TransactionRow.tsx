"use client";

import { useState } from "react";
import type { Transaction, TransactionItem } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/transactions";
import { money2, dateFmt } from "@/lib/format";
import TransactionLineItems from "./TransactionLineItems";

// One transaction: its header row (plus split sub-rows when it has more than
// one line item), or — toggled via Edit — an inline form bound to a <form>
// that lives outside the table (see `formId`), following the same read-only-
// until-edited pattern as BudgetRow/HoldingCostRow.
export default function TransactionRow({
  t,
  items,
  categories,
  projectId,
  formId,
  deleteAction,
}: {
  t: Transaction;
  items: TransactionItem[];
  categories: string[];
  projectId: number;
  formId: string;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const split = items.length > 1;

  function handleSaveClick() {
    // Same deferral trick as BudgetRow: let the native form submission read
    // the inputs before we unmount them by flipping back to read-only.
    setTimeout(() => setEditing(false), 0);
  }

  if (editing) {
    const initialItems = items.length > 0
      ? items.map((it) => ({ category: it.category, description: it.description, amount: it.amount }))
      : [{ category: t.category, description: t.description, amount: t.amount }];
    return (
      <tr>
        <td colSpan={8} style={{ background: "var(--color-cream-alt)", padding: 16 }}>
          <input type="hidden" form={formId} name="project_id" value={projectId} />
          <input type="hidden" form={formId} name="tx_id" value={t.id} />
          <div className="form-grid-3">
            <div className="field">
              <label htmlFor={`tx_date_${t.id}`}>Date</label>
              <input id={`tx_date_${t.id}`} form={formId} name="tx_date" type="date" defaultValue={t.tx_date} />
            </div>
            <div className="field">
              <label htmlFor={`vendor_${t.id}`}>Vendor / payee</label>
              <input id={`vendor_${t.id}`} form={formId} name="vendor" defaultValue={t.vendor} placeholder="Lowe's" />
            </div>
            <div className="field">
              <label htmlFor={`tx_type_${t.id}`}>Type</label>
              <select id={`tx_type_${t.id}`} form={formId} name="tx_type" defaultValue={t.tx_type}>
                <option value="expense">Expense</option>
                <option value="return">Return</option>
              </select>
            </div>
          </div>
          <div className="field" style={{ maxWidth: 260 }}>
            <label htmlFor={`payment_method_${t.id}`}>Payment method</label>
            <select id={`payment_method_${t.id}`} form={formId} name="payment_method" defaultValue={t.payment_method}>
              <option value="">Not specified</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <TransactionLineItems categories={categories} initialItems={initialItems} formId={formId} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button form={formId} type="submit" className="btn btn-primary btn-sm" onClick={handleSaveClick}>
              Save changes
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr style={split ? { background: "var(--color-cream-alt)" } : undefined}>
        <td style={{ whiteSpace: "nowrap" }}>{dateFmt(t.tx_date)}</td>
        <td style={{ fontWeight: split ? 600 : 400 }}>{t.vendor || "—"}</td>
        <td className="small secondary">{t.payment_method || "—"}</td>
        <td>
          {split ? (
            <span className="tag tag-dark">Split · {items.length}</span>
          ) : t.category ? (
            <span className="tag tag-outline">{t.category}</span>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td className="secondary">{t.description}</td>
        <td
          className="num"
          style={{
            fontWeight: split ? 700 : 400,
            ...(t.tx_type === "return" ? { color: "#b45309", fontWeight: 600 } : undefined),
          }}
        >
          {t.tx_type === "return" ? "−" : ""}{money2(t.amount)}
        </td>
        <td>
          {t.receipt_file ? (
            <a
              href={`/api/files/${projectId}/${t.receipt_file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-cta"
              aria-label="View receipt"
              title={t.receipt_name}
            >
              ↗
            </a>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td style={{ whiteSpace: "nowrap" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
          <form action={deleteAction} style={{ display: "inline" }}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="tx_id" value={t.id} />
            <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label="Delete transaction">✕</button>
          </form>
        </td>
      </tr>
      {split &&
        items.map((it) => (
          <tr key={it.id}>
            <td></td>
            <td colSpan={2} className="small muted" style={{ paddingLeft: 20 }}>↳ {it.description || "—"}</td>
            <td>
              {it.category ? <span className="tag tag-outline">{it.category}</span> : <span className="muted">—</span>}
            </td>
            <td></td>
            <td className="num small">{money2(it.amount)}</td>
            <td></td>
            <td></td>
          </tr>
        ))}
    </>
  );
}
