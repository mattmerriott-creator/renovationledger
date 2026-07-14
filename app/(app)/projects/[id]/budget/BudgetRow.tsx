"use client";

import { useEffect, useState } from "react";
import type { BudgetItem } from "@/lib/db";
import { BUDGET_UNITS, UNIT_LABELS } from "@/lib/budget";

function moneyFmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const inputStyle: React.CSSProperties = { fontSize: 13, padding: "6px 8px" };

// A group header: category with sub-items underneath. Read-only — its budget
// and actual are the sum of its children, computed by the server page.
export function BudgetGroupRow({
  item,
  childCount,
  budget,
  actual,
  projectId,
  deleteAction,
}: {
  item: BudgetItem;
  childCount: number;
  budget: number;
  actual: number;
  projectId: number;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const variance = budget - actual;
  return (
    <tr style={{ background: "var(--color-cream-alt)" }}>
      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{item.category}</td>
      <td className="num muted">—</td>
      <td className="muted">—</td>
      <td className="num muted">—</td>
      <td className="num" style={{ fontWeight: 700 }}>{moneyFmt(budget)}</td>
      <td className="small muted">{childCount} sub-item{childCount === 1 ? "" : "s"}</td>
      <td className="num" style={{ fontWeight: 700 }}>{moneyFmt(actual)}</td>
      <td className="num" style={variance < 0 ? { color: "var(--color-danger)", fontWeight: 700 } : { fontWeight: 700 }}>
        {moneyFmt(variance)}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <form action={deleteAction}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="item_id" value={item.id} />
          <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${item.category} and its sub-items`}>
            Delete group
          </button>
        </form>
      </td>
    </tr>
  );
}

// One editable budget line (a plain category or a sub-item under a group).
// Starts read-only if it already has data saved; starts open for editing if
// it's blank. Saving flips it back to read-only with a brief "Saved" note.
export default function BudgetRow({
  item,
  actual,
  projectId,
  formId,
  deleteAction,
  indent,
}: {
  item: BudgetItem;
  actual: number;
  projectId: number;
  formId: string;
  deleteAction: (fd: FormData) => Promise<void>;
  indent?: boolean;
}) {
  const hasData = item.amount > 0 || item.qty > 0 || item.unit_cost > 0 || item.description.trim() !== "";
  const [editing, setEditing] = useState(!hasData);

  // A save triggers a server-action refresh, which remounts this row (in fact
  // it remounts more than once as Next settles the update) — plain component
  // state set in the click handler doesn't survive that. Stash a timestamp in
  // sessionStorage instead: any mount within the display window still counts
  // as "just saved," so it holds up across however many remounts happen, and
  // only the final settled mount clears it once the window has passed.
  const SAVED_DISPLAY_MS = 2500;
  const savedKey = `bl_saved_${item.id}`;
  const [justSaved, setJustSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedAt = Number(sessionStorage.getItem(savedKey));
    if (!savedAt) return false;
    const remaining = SAVED_DISPLAY_MS - (Date.now() - savedAt);
    if (remaining <= 0) {
      sessionStorage.removeItem(savedKey);
      return false;
    }
    return true;
  });

  const [qty, setQty] = useState(item.qty || 0);
  const [unitCost, setUnitCost] = useState(item.unit_cost || 0);
  const [manualAmount, setManualAmount] = useState(item.amount || 0);

  const calculated = qty > 0 && unitCost > 0;
  const amount = calculated ? Math.round(qty * unitCost * 100) / 100 : manualAmount;
  const variance = amount - actual;

  useEffect(() => {
    if (!justSaved) return;
    const savedAt = Number(sessionStorage.getItem(savedKey)) || Date.now();
    const remaining = Math.max(0, SAVED_DISPLAY_MS - (Date.now() - savedAt));
    const t = setTimeout(() => {
      sessionStorage.removeItem(savedKey);
      setJustSaved(false);
    }, remaining);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSaved]);

  const parse = (v: string) => {
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  function handleSaveClick() {
    // Clicking a submit button fires this handler before the browser's
    // default action (submitting the associated form={formId} elements)
    // runs. Flipping `editing` to false here, synchronously, would unmount
    // those inputs before the browser ever reads their values, so the save
    // silently submits an empty form. Deferring to a macrotask lets the
    // native submit happen first; the sessionStorage timestamp then carries
    // the "saved" confirmation across the remount(s) that follow.
    sessionStorage.setItem(savedKey, String(Date.now()));
    setTimeout(() => {
      setEditing(false);
      setJustSaved(true);
    }, 0);
  }

  const categoryLabel = indent ? (
    <span style={{ paddingLeft: 20 }}>↳ {item.category}</span>
  ) : (
    item.category
  );

  if (!editing) {
    return (
      <tr>
        <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{categoryLabel}</td>
        <td className="num">{item.qty || "—"}</td>
        <td>{item.qty ? item.unit : "—"}</td>
        <td className="num">{item.unit_cost ? moneyFmt(item.unit_cost) : "—"}</td>
        <td className="num" style={{ fontWeight: 600 }}>
          {moneyFmt(amount)}
          {calculated && <span className="muted" style={{ display: "block", fontSize: 11 }}>auto</span>}
        </td>
        <td className="small secondary">{item.description || "—"}</td>
        <td className="num">{moneyFmt(actual)}</td>
        <td className="num" style={variance < 0 ? { color: "var(--color-danger)", fontWeight: 600 } : undefined}>
          {moneyFmt(variance)}
        </td>
        <td style={{ whiteSpace: "nowrap" }}>
          {justSaved && (
            <span className="small" style={{ color: "#3d7a2f", fontWeight: 600, marginRight: 8 }}>✓ Saved</span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
          <form action={deleteAction} style={{ display: "inline" }}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="item_id" value={item.id} />
            <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${item.category}`}>✕</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{categoryLabel}</td>
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
          <div key="calculated">
            <input type="hidden" form={formId} name="amount" value={amount} />
            <span style={{ fontWeight: 600 }}>{moneyFmt(amount)}</span>
            <span className="muted" style={{ display: "block", fontSize: 11 }}>auto</span>
          </div>
        ) : (
          <input
            key="manual"
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
        <button form={formId} type="submit" className="btn btn-ghost btn-sm" onClick={handleSaveClick}>
          Save
        </button>{" "}
        <form action={deleteAction} style={{ display: "inline" }}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="item_id" value={item.id} />
          <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${item.category}`}>
            ✕
          </button>
        </form>
      </td>
    </tr>
  );
}
