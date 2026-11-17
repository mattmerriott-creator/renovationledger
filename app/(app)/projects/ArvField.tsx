"use client";

import { useState } from "react";

// ARV input with a "Use manual ARV" switch. Off (the default) means ARV is
// calculated from comps: average $/sqft × the property's sqft. When comps
// can give a number, the box is locked to it; until then, whatever is typed
// is used as a fallback. The server applies the comps value on save.
export default function ArvField({
  defaultArv,
  defaultSource,
  compsAvgPpsf,
  sqft,
}: {
  defaultArv: number;
  defaultSource: "comps" | "manual";
  compsAvgPpsf: number;
  sqft: number;
}) {
  const [manual, setManual] = useState(defaultSource === "manual");
  const hasCompsValue = compsAvgPpsf > 0 && sqft > 0;
  const locked = !manual && hasCompsValue;

  return (
    <div className="field">
      <label htmlFor="arv">ARV ($)</label>
      <input
        id="arv"
        name="arv"
        inputMode="decimal"
        defaultValue={defaultArv || ""}
        placeholder="185000"
        readOnly={locked}
        aria-describedby="arv_hint"
        style={locked ? { background: "var(--color-cream-alt)", color: "var(--color-text-secondary)" } : undefined}
      />
      <input type="hidden" name="arv_source" value={manual ? "manual" : "comps"} />
      <label className="switch" style={{ marginTop: 10 }}>
        <input type="checkbox" role="switch" checked={manual} onChange={(e) => setManual(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span>Use manual ARV</span>
      </label>
      <p id="arv_hint" className="small secondary" style={{ marginTop: 6 }}>
        {manual
          ? "Using the number you enter."
          : hasCompsValue
            ? `From comps: $${compsAvgPpsf.toLocaleString()}/sqft × ${sqft.toLocaleString()} sqft. Updates when comps change.`
            : "Calculated from comps once you add them and the property's sqft. Until then, this number is used."}
      </p>
    </div>
  );
}
