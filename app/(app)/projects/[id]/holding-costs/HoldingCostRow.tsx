"use client";

import { useEffect, useState } from "react";
import type { HoldingCostItem } from "@/lib/db";

function moneyFmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const inputStyle: React.CSSProperties = { fontSize: 13, padding: "6px 8px" };

// One editable holding-cost line. Same read-only-until-edited pattern as
// BudgetRow, including the sessionStorage "just saved" flash that survives
// the double-remount Next Server Actions trigger via revalidatePath.
export default function HoldingCostRow({
  item,
  projectId,
  formId,
  deleteAction,
}: {
  item: HoldingCostItem;
  projectId: number;
  formId: string;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const hasData = item.monthly_amount > 0;
  const [editing, setEditing] = useState(!hasData);

  const SAVED_DISPLAY_MS = 2500;
  const savedKey = `hc_saved_${item.id}`;
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

  function handleSaveClick() {
    // Deferred to a macrotask so the browser's native form submission (via
    // form={formId}) fires and reads the inputs' values before this unmounts
    // them by flipping the row to read-only. See BudgetRow's handleSaveClick
    // for the full explanation.
    sessionStorage.setItem(savedKey, String(Date.now()));
    setTimeout(() => {
      setEditing(false);
      setJustSaved(true);
    }, 0);
  }

  if (!editing) {
    return (
      <tr>
        <td style={{ fontWeight: 500 }}>{item.name}</td>
        <td className="num" style={{ fontWeight: 600 }}>{moneyFmt(item.monthly_amount)}</td>
        <td style={{ whiteSpace: "nowrap" }}>
          {justSaved && (
            <span className="small" style={{ color: "#3d7a2f", fontWeight: 600, marginRight: 8 }}>✓ Saved</span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
          <form action={deleteAction} style={{ display: "inline" }}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="item_id" value={item.id} />
            <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${item.name}`}>✕</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input
          form={formId}
          name="name"
          defaultValue={item.name}
          placeholder="Line item"
          style={inputStyle}
          aria-label="Holding cost name"
        />
      </td>
      <td className="num" style={{ width: 120 }}>
        <input
          form={formId}
          name="monthly_amount"
          inputMode="decimal"
          defaultValue={item.monthly_amount || ""}
          placeholder="0"
          style={{ ...inputStyle, width: 100, textAlign: "right" }}
          aria-label={`${item.name} monthly amount`}
        />
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
          <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${item.name}`}>
            ✕
          </button>
        </form>
      </td>
    </tr>
  );
}
