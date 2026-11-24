"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateOffer, offerFormula, OfferInputs, OfferMode, FlipMethod } from "@/lib/offer";
import { money, pct } from "@/lib/format";

type NumberKey = Exclude<keyof OfferInputs, "method" | "useCapRate">;
type Scenario = { name: string; method: FlipMethod; useCapRate: boolean; values: Record<NumberKey, string> };
type CalcState = { mode: OfferMode; scenarios: Scenario[] };

const MAX_SCENARIOS = 3;
const STORAGE_KEY = "rl-offer-calculator";

const DEFAULT_VALUES: Record<NumberKey, string> = {
  arv: "210000",
  repairs: "45000",
  buyerPct: "70",
  yourFee: "10000",
  yourCosts: "1000",
  buyClosing: "3500",
  holdingMonthly: "1100",
  holdMonths: "6",
  wholesaleFee: "0",
  maxAllInPct: "75",
  sellCostPct: "8",
  desiredProfit: "30000",
  monthlyRent: "1650",
  vacancyPct: "8",
  taxesMonthly: "190",
  insuranceMonthly: "110",
  hoaMonthly: "0",
  otherExpenses: "175",
  targetCapPct: "8",
  ltvPct: "75",
  interestRate: "7.5",
  termYears: "30",
  targetDscr: "1.25",
  cashLeftIn: "0",
  refiClosing: "3000",
};

const MODES: { id: OfferMode; label: string }[] = [
  { id: "wholesale", label: "Wholesale" },
  { id: "flip", label: "Flip" },
  { id: "rental", label: "Rent" },
];

const DEFAULT_STATE: CalcState = {
  mode: "flip",
  scenarios: [{ name: "Scenario 1", method: "percent", useCapRate: false, values: DEFAULT_VALUES }],
};

function toNumber(s: string): number {
  const n = parseFloat(String(s).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toInputs(s: Scenario): OfferInputs {
  const out = { method: s.method, useCapRate: s.useCapRate } as OfferInputs;
  for (const k of Object.keys(DEFAULT_VALUES) as NumberKey[]) out[k] = toNumber(s.values[k] ?? "");
  return out;
}

// Accepts state from a shared link or browser storage; anything malformed
// falls back to the defaults instead of breaking the page.
function parseState(raw: string | null): CalcState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!MODES.some((m) => m.id === data?.mode)) return null;
    if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) return null;
    const scenarios: Scenario[] = data.scenarios.slice(0, MAX_SCENARIOS).map((s: Record<string, unknown>, i: number) => {
      const values = { ...DEFAULT_VALUES };
      const v = (s?.values ?? {}) as Record<string, unknown>;
      for (const k of Object.keys(DEFAULT_VALUES) as NumberKey[]) {
        if (typeof v[k] === "string" || typeof v[k] === "number") values[k] = String(v[k]).slice(0, 20);
      }
      return {
        name: typeof s?.name === "string" && s.name.trim() ? s.name.slice(0, 40) : `Scenario ${i + 1}`,
        method: s?.method === "profit" ? "profit" : "percent",
        useCapRate: s?.useCapRate === true,
        values,
      };
    });
    return { mode: data.mode, scenarios };
  } catch {
    return null;
  }
}

function Field({
  id, label, value, onChange, prefix, suffix, readOnly, hint,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; readOnly?: boolean; hint?: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label htmlFor={id}>{label}</label>
      <div className="input-affix">
        {prefix && <span className="affix affix-pre" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-describedby={hint ? `${id}-hint` : undefined}
          style={{
            paddingLeft: prefix ? 26 : undefined,
            paddingRight: suffix ? 30 : undefined,
            ...(readOnly ? { background: "var(--color-cream-alt)", color: "var(--color-text-secondary)" } : {}),
          }}
        />
        {suffix && <span className="affix affix-post" aria-hidden="true">{suffix}</span>}
      </div>
      {hint && <p id={`${id}-hint`} className="small muted" style={{ marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export default function OfferCalculator({ loggedIn }: { loggedIn: boolean }) {
  const [state, setState] = useState<CalcState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load from a shared link first, then from this browser's last session.
  useEffect(() => {
    const fromUrl = parseState(new URLSearchParams(window.location.search).get("d"));
    let fromStorage: CalcState | null = null;
    try {
      fromStorage = parseState(window.localStorage.getItem(STORAGE_KEY));
    } catch {}
    const initial = fromUrl ?? fromStorage;
    if (initial) setState(initial);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);

  const results = useMemo(
    () => state.scenarios.map((s) => calculateOffer(state.mode, toInputs(s))),
    [state]
  );

  const update = (i: number, patch: Partial<Scenario>) =>
    setState((st) => ({ ...st, scenarios: st.scenarios.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setValue = (i: number, key: NumberKey, v: string) =>
    setState((st) => ({
      ...st,
      scenarios: st.scenarios.map((s, j) => (j === i ? { ...s, values: { ...s.values, [key]: v } } : s)),
    }));
  const addScenario = () =>
    setState((st) => {
      if (st.scenarios.length >= MAX_SCENARIOS) return st;
      const last = st.scenarios[st.scenarios.length - 1];
      return { ...st, scenarios: [...st.scenarios, { ...last, name: `Scenario ${st.scenarios.length + 1}` }] };
    });
  const removeScenario = (i: number) =>
    setState((st) => (st.scenarios.length <= 1 ? st : { ...st, scenarios: st.scenarios.filter((_, j) => j !== i) }));

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("d", JSON.stringify(state));
    return url.toString();
  };
  const copyLink = async () => {
    const url = shareUrl();
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  // Pre-fills the new-project form. Logged-out visitors sign up first and
  // land back on the same pre-filled form.
  const createProjectHref = (s: Scenario, i: number) => {
    const inputs = toInputs(s);
    const res = results[i];
    const mode = state.mode;
    const notes = [
      `From the offer calculator (${s.name}, ${MODES.find((m) => m.id === mode)?.label}).`,
      `Repair estimate: ${money(inputs.repairs)}.`,
      mode === "wholesale"
        ? `Buyer's price: ${money(res.buyerPrice)}. Wholesale fee: ${money(inputs.yourFee)}.`
        : `Holding: ${money(inputs.holdingMonthly)}/mo × ${inputs.holdMonths} mo.`,
      mode !== "wholesale" && inputs.wholesaleFee ? `Assignment fee paid: ${money(inputs.wholesaleFee)}.` : "",
      mode === "rental"
        ? `Refi loan: ${money(res.loan)} at ${inputs.interestRate}% for ${inputs.termYears} yrs, lender DSCR ${res.dscr?.toFixed(2) ?? "—"} (rent ÷ PITIA). Other expenses include ${inputs.vacancyPct}% vacancy.`
        : "",
      `Max offer: ${money(res.maxOffer)}.`,
    ].filter(Boolean).join(" ");
    const q = new URLSearchParams({
      arv: String(res.arv),
      purchase_price: String(Math.max(0, res.maxOffer)),
      exit_strategy: mode === "rental" ? "brrrr" : "flip",
      notes,
    });
    if (mode !== "wholesale") q.set("purchase_closing_costs", String(inputs.buyClosing));
    if (mode === "rental") {
      // Projects keep taxes, insurance and HOA separate (they count in DSCR);
      // other expenses plus vacancy go into "other expenses" so NOI matches.
      q.set("monthly_rent", String(inputs.monthlyRent));
      q.set("monthly_taxes", String(inputs.taxesMonthly));
      q.set("monthly_insurance", String(inputs.insuranceMonthly));
      q.set("monthly_hoa", String(inputs.hoaMonthly));
      q.set("monthly_operating_expenses", String(Math.round(inputs.otherExpenses + inputs.monthlyRent * (inputs.vacancyPct / 100))));
      q.set("refinance_ltv_pct", String(inputs.ltvPct));
      q.set("refinance_rate", String(inputs.interestRate));
      q.set("refinance_term_months", String(Math.round(inputs.termYears * 12)));
      q.set("refinance_closing_costs", String(inputs.refiClosing));
    }
    const target = `/projects/new?${q.toString()}`;
    return loggedIn ? target : `/signup?next=${encodeURIComponent(target)}`;
  };

  const mode = state.mode;

  return (
    <div>
      <div className="calc-toolbar no-print">
        <div className="segmented" role="tablist" aria-label="Deal type">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              aria-pressed={mode === m.id}
              onClick={() => setState((st) => ({ ...st, mode: m.id }))}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {state.scenarios.length < MAX_SCENARIOS && (
            <button type="button" className="btn btn-outline btn-sm" onClick={addScenario}>+ Add scenario</button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({ ...DEFAULT_STATE, mode })}>Reset</button>
        </div>
      </div>

      <div className={state.scenarios.length === 1 ? "calc-grid calc-grid-1" : "calc-grid"}>
        {state.scenarios.map((s, i) => {
          const res = results[i];
          const inputs = toInputs(s);
          const works = res.maxOffer > 0;
          const id = (k: string) => `s${i}-${k}`;
          const f = (key: NumberKey, label: string, opts: { prefix?: string; suffix?: string; hint?: string } = {}) => (
            <Field id={id(key)} label={label} value={s.values[key]} onChange={(v) => setValue(i, key, v)} {...opts} />
          );
          const capLocked = mode === "rental" && s.useCapRate;
          return (
            <section key={i} className="card calc-card" aria-label={s.name}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <input
                  aria-label="Scenario name"
                  className="calc-name"
                  value={s.name}
                  maxLength={40}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                {state.scenarios.length > 1 && (
                  <button type="button" className="btn btn-danger-ghost btn-sm no-print" onClick={() => removeScenario(i)} aria-label={`Remove ${s.name}`}>
                    ✕
                  </button>
                )}
              </div>

              <div className="card card-dark calc-result">
                <div className="stat-label" style={{ marginTop: 0 }}>
                  {mode === "wholesale" ? "Max offer (your contract price)" : "Max offer"}
                </div>
                <div className="stat-number" style={{ fontSize: 34, color: works ? "var(--color-accent)" : "#f0a090" }}>
                  {works ? money(res.maxOffer) : "No deal"}
                </div>
                {!works && <p className="small" style={{ marginTop: 4 }}>These numbers don&apos;t leave room for an offer.</p>}
                <dl className="calc-lines">
                  {mode === "wholesale" && (
                    <>
                      <dt>Sell the contract for</dt><dd>{money(res.buyerPrice)}</dd>
                      <dt>Your fee</dt><dd>{money(inputs.yourFee)}</dd>
                      <dt>Buyer&apos;s all-in % of ARV</dt><dd>{pct(res.allInPctOfArv)}</dd>
                    </>
                  )}
                  {mode === "flip" && (
                    <>
                      <dt>All-in cost</dt><dd>{money(res.allIn)}</dd>
                      <dt>All-in % of ARV</dt><dd>{pct(res.allInPctOfArv)}</dd>
                      <dt>Selling costs</dt><dd>{money(res.sellCosts)}</dd>
                      <dt>Projected profit</dt><dd>{money(res.profit)}</dd>
                    </>
                  )}
                  {mode === "rental" && (
                    <>
                      {res.valuedByCapRate && <><dt>ARV from cap rate</dt><dd>{money(res.arv)}</dd></>}
                      <dt>Refi loan ({res.loanLimitedBy === "dscr" ? "set by DSCR" : "set by LTV"})</dt><dd>{money(res.loan)}</dd>
                      <dt>Loan payment / month</dt><dd>{money(res.monthlyPayment)}</dd>
                      <dt>With taxes, insurance, HOA</dt><dd>{money(res.pitia)}</dd>
                      <dt>DSCR (rent ÷ that)</dt><dd>{res.dscr == null ? "—" : res.dscr.toFixed(2)}</dd>
                      <dt>NOI / month</dt><dd>{money(res.noiMonthly)}</dd>
                      <dt>Cash flow / month</dt><dd>{money(res.monthlyCashFlow)}</dd>
                      <dt>All-in cost</dt><dd>{money(res.allIn)}</dd>
                    </>
                  )}
                </dl>
                <p className="small muted" style={{ marginTop: 10 }}>{offerFormula(mode, inputs)}</p>
              </div>

              <h3 className="calc-h">The property</h3>
              <Field
                id={id("arv")}
                label="After-repair value (ARV)"
                prefix="$"
                value={capLocked ? String(res.arv) : s.values.arv}
                onChange={(v) => setValue(i, "arv", v)}
                readOnly={capLocked}
                hint={capLocked ? "Figured from NOI ÷ cap rate. Turn off the cap rate switch to type your own." : undefined}
              />
              {f("repairs", "Repair estimate", { prefix: "$" })}

              {mode === "wholesale" && (
                <>
                  <h3 className="calc-h">Your buyer</h3>
                  {f("buyerPct", "Buyer's max all-in (% of ARV)", {
                    suffix: "%",
                    hint: "What your cash buyers will pay plus repairs, as a % of ARV. Many use 65–75%.",
                  })}
                  <h3 className="calc-h">Your deal</h3>
                  {f("yourFee", "Wholesale fee you want", { prefix: "$" })}
                  {f("yourCosts", "Your costs (marketing, closing, earnest money)", { prefix: "$" })}
                </>
              )}

              {mode !== "wholesale" && (
                <>
                  <h3 className="calc-h">Your costs</h3>
                  {f("buyClosing", "Closing costs when you buy", { prefix: "$" })}
                  <div className="form-grid">
                    {f("holdingMonthly", "Holding cost / month", { prefix: "$" })}
                    {f("holdMonths", mode === "rental" ? "Months until rented" : "Months until sold")}
                  </div>
                  {f("wholesaleFee", "Assignment fee you pay (if any)", { prefix: "$" })}
                </>
              )}

              {mode === "flip" && (
                <>
                  <h3 className="calc-h">Your target</h3>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label htmlFor={id("method")}>Set the offer by</label>
                    <select id={id("method")} value={s.method} onChange={(e) => update(i, { method: e.target.value as FlipMethod })}>
                      <option value="percent">Keeping all-in under a % of ARV</option>
                      <option value="profit">Hitting a profit number</option>
                    </select>
                  </div>
                  {s.method === "percent"
                    ? f("maxAllInPct", "Max all-in (% of ARV)", { suffix: "%" })
                    : f("desiredProfit", "Profit you want", { prefix: "$" })}
                  {f("sellCostPct", "Cost to sell: agent + closing (% of ARV)", { suffix: "%" })}
                </>
              )}

              {mode === "rental" && (
                <>
                  <h3 className="calc-h">The rent</h3>
                  <div className="form-grid">
                    {f("monthlyRent", "Monthly rent", { prefix: "$" })}
                    {f("vacancyPct", "Vacancy", { suffix: "%" })}
                  </div>
                  <div className="form-grid">
                    {f("taxesMonthly", "Property taxes / month", { prefix: "$" })}
                    {f("insuranceMonthly", "Insurance / month", { prefix: "$" })}
                  </div>
                  <div className="form-grid">
                    {f("hoaMonthly", "HOA / month", { prefix: "$" })}
                    {f("otherExpenses", "Other expenses / month", {
                      prefix: "$",
                      hint: "Management, upkeep, reserves. Counts in cash flow, not DSCR.",
                    })}
                  </div>
                  <label className="switch" style={{ margin: "4px 0 12px" }}>
                    <input type="checkbox" role="switch" checked={s.useCapRate} onChange={(e) => update(i, { useCapRate: e.target.checked })} />
                    <span className="switch-track" aria-hidden="true" />
                    <span>Value with a cap rate (5+ units)</span>
                  </label>
                  {s.useCapRate &&
                    f("targetCapPct", "Cap rate", {
                      suffix: "%",
                      hint: "Buildings with 5+ units are valued on income. A lower cap rate means a higher ARV.",
                    })}

                  <h3 className="calc-h">The refi loan</h3>
                  <div className="form-grid">
                    {f("targetDscr", "DSCR you need", {
                      hint: "Rent ÷ (loan payment + taxes + insurance + HOA). DSCR lenders usually want 1.00–1.25.",
                    })}
                    {f("ltvPct", "Max loan (% of ARV)", { suffix: "%" })}
                  </div>
                  <div className="form-grid">
                    {f("interestRate", "Interest rate", { suffix: "%" })}
                    {f("termYears", "Loan term (years)")}
                  </div>
                  <div className="form-grid">
                    {f("refiClosing", "Refi closing costs", { prefix: "$" })}
                    {f("cashLeftIn", "Cash you'll leave in", { prefix: "$" })}
                  </div>
                </>
              )}

              <a href={createProjectHref(s, i)} className="btn btn-dark btn-sm no-print" style={{ width: "100%", marginTop: 4 }}>
                {loggedIn ? "Create project from this" : "Save as a project (free account)"}
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}
