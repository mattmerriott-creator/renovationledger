"use client";

import { useState } from "react";
import type { BudgetItem } from "@/lib/db";
import { BUDGET_UNITS, UNIT_LABELS } from "@/lib/budget";

function moneyFmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const inputStyle: React.CSSProperties = { fontSize: 13, padding: "6px 8px" };

// One budget line. Enter Qty and Unit cost and the budget computes live;
// leave them blank and type a flat total instead. Saving posts the hidden
// per-row form rendered by the server page (form={formId}).
export default function BudgetRow({
  item,
  actual,
  projectId,
  formId,
  deleteAction,
}: {
  item: BudgetItem;
  actual: number;
  projectId: number;
  formId: string;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const [qty, setQty] = useState(item.qty || 0);
  const [unitCost, setUnitCost] = useState(item.unit_cost || 0);
  const [manualAmount, setManualAmount] = useState(item.amount || 0);

  const calculated = qty > 0 && unitCost > 0;
  const amount = calculated ? Math.round(qty * unitCost * 100) / 100 : manualAmount;
  const variance = amount - actual;

  const parse = (v: string) => {
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{item.category}</td>
      <td style={{ width: 80 }}>
        <input
          form={formId}
          name="qty"
          inputMode="decimal"
          defaultValue={item.qty || ""}
          placeholder="Qty"
          onChange={(e) => setQty(parse(e.target.value))}
          style={{ ...inputStyle, width: 70, textAlign: "right" }}
          aria-label={`${item.category} quantity`}
        />
      </td>
      <td style={{ width: 90 }}>
        <select
          form={formId}
          name="unit"
          defaultValue={item.unit || "job"}
          style={{ ...inputStyle, width: 85 }}
          aria-label={`${item.category} unit`}
        >
          {BUDGET_UNITS.map((u) => (
            <option key={u} value={u} title={UNIT_LABELS[u]}>{u}</option>
          ))}
        </select>
      </td>
      <td style={{ width: 100 }}>
        <input
          form={formId}
          name="unit_cost"
          inputMode="decimal"
          defaultValue={item.unit_cost || ""}
          placeholder="$/unit"
          onChange={(e) => setUnitCost(parse(e.target.value))}
          style={{ ...inputStyle, width: 90, textAlign: "right" }}
          aria-label={`${item.category} unit cost`}
        />
      </td>
      <td className="num" style={{ width: 120 }}>
        {calculated ? (
          <>
            <input type="hidden" form={formId} name="amount" value={amount} />
            <span style={{ fontWeight: 600 }}>{moneyFmt(amount)}</span>
            <span className="muted" style={{ display: "block", fontSize: 11 }}>auto</span>
          </>
        ) : (
          <input
            form={formId}
            name="amount"
            inputMode="decimal"
            defaultValue={item.amount || ""}
            placeholder="0"
            onChange={(e) => setManualAmount(parse(e.target.value))}
            style={{ ...inputStyle, width: 100, textAlign: "right" }}
            aria-label={`${item.category} budget total`}
          />
        )}
      </td>
      <td style={{ minWidth: 140 }}>
        <input
          form={formId}
          name="description"
          defaultValue={item.description}
          placeholder="Scope / notes"
          style={inputStyle}
          aria-label={`${item.category} scope notes`}
        />
      </td>
      <td className="num">{moneyFmt(actual)}</td>
      <td className="num" style={variance < 0 ? { color: "var(--color-danger)", fontWeight: 600 } : undefined}>
        {moneyFmt(variance)}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <input type="hidden" form={formId} name="project_id" value={projectId} />
        <input type="hidden" form={formId} name="item_id" value={item.id} />
        <button form={formId} type="submit" className="btn btn-ghost btn-sm">Save</button>{" "}
        <button
          form={formId}
          type="submit"
          formAction={deleteAction}
          className="btn btn-danger-ghost btn-sm"
          aria-label={`Delete ${item.category}`}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
