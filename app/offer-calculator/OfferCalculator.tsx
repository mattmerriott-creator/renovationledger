"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateOffer, offerFormula, OfferInputs, OfferMode, FlipMethod } from "@/lib/offer";
import { money, pct } from "@/lib/format";

type NumberKey = Exclude<keyof OfferInputs, "method">;
type Scenario = { name: string; method: FlipMethod; values: Record<NumberKey, string> };
type CalcState = { mode: OfferMode; scenarios: Scenario[] };

const MAX_SCENARIOS = 3;
const STORAGE_KEY = "rl-offer-calculator";

const DEFAULT_VALUES: Record<NumberKey, string> = {
  arv: "210000",
  repairs: "45000",
  buyClosing: "3500",
  holdingMonthly: "1100",
  holdMonths: "6",
  wholesaleFee: "0",
  maxAllInPct: "75",
  sellCostPct: "8",
  desiredProfit: "30000",
  monthlyRent: "1650",
  vacancyPct: "8",
  monthlyExpenses: "475",
  targetCapPct: "8",
};

const DEFAULT_STATE: CalcState = {
  mode: "flip",
  scenarios: [{ name: "Scenario 1", method: "percent", values: DEFAULT_VALUES }],
};

function toNumber(s: string): number {
  const n = parseFloat(String(s).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toInputs(s: Scenario): OfferInputs {
  const out = { method: s.method } as OfferInputs;
  for (const k of Object.keys(DEFAULT_VALUES) as NumberKey[]) out[k] = toNumber(s.values[k] ?? "");
  return out;
}

// Accepts state from a shared link or browser storage; anything malformed
// falls back to the defaults instead of breaking the page.
function parseState(raw: string | null): CalcState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.mode !== "flip" && data?.mode !== "rental") return null;
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
        values,
      };
    });
    return { mode: data.mode, scenarios };
  } catch {
    return null;
  }
}

function Field({
  id, label, value, onChange, prefix, suffix,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string;
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
          style={{ paddingLeft: prefix ? 26 : undefined, paddingRight: suffix ? 30 : undefined }}
        />
        {suffix && <span className="affix affix-post" aria-hidden="true">{suffix}</span>}
      </div>
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
    const notes = [
      `From the offer calculator (${s.name}).`,
      `Repair estimate: ${money(inputs.repairs)}.`,
      `Holding: ${money(inputs.holdingMonthly)}/mo × ${inputs.holdMonths} mo.`,
      inputs.wholesaleFee ? `Wholesale fee: ${money(inputs.wholesaleFee)}.` : "",
      `Max offer: ${money(res.maxOffer)}.`,
    ].filter(Boolean).join(" ");
    const q = new URLSearchParams({
      arv: String(inputs.arv),
      purchase_price: String(Math.max(0, res.maxOffer)),
      purchase_closing_costs: String(inputs.buyClosing),
      exit_strategy: state.mode === "rental" ? "brrrr" : "flip",
      notes,
    });
    if (state.mode === "rental") {
      q.set("monthly_rent", String(inputs.monthlyRent));
      q.set("monthly_operating_expenses", String(inputs.monthlyExpenses));
    }
    const target = `/projects/new?${q.toString()}`;
    return loggedIn ? target : `/signup?next=${encodeURIComponent(target)}`;
  };

  const rental = state.mode === "rental";

  return (
    <div>
      <div className="calc-toolbar no-print">
        <div className="segmented" role="group" aria-label="Deal type">
          <button type="button" aria-pressed={!rental} onClick={() => setState((st) => ({ ...st, mode: "flip" }))}>
            Flip
          </button>
          <button type="button" aria-pressed={rental} onClick={() => setState((st) => ({ ...st, mode: "rental" }))}>
            Rental
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {state.scenarios.length < MAX_SCENARIOS && (
            <button type="button" className="btn btn-outline btn-sm" onClick={addScenario}>+ Add scenario</button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState(DEFAULT_STATE)}>Reset</button>
        </div>
      </div>

      <div className={state.scenarios.length === 1 ? "calc-grid calc-grid-1" : "calc-grid"}>
        {state.scenarios.map((s, i) => {
          const res = results[i];
          const works = res.maxOffer > 0;
          const id = (k: string) => `s${i}-${k}`;
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
                <div className="stat-label" style={{ marginTop: 0 }}>Max offer</div>
                <div className="stat-number" style={{ fontSize: 34, color: works ? "var(--color-accent)" : "#f0a090" }}>
                  {works ? money(res.maxOffer) : "No deal"}
                </div>
                {!works && <p className="small" style={{ marginTop: 4 }}>These numbers don&apos;t leave room for an offer.</p>}
                <dl className="calc-lines">
                  <dt>All-in cost</dt><dd>{money(res.allIn)}</dd>
                  <dt>All-in % of ARV</dt><dd>{pct(res.allInPctOfArv)}</dd>
                  {rental ? (
                    <>
                      <dt>NOI per year</dt><dd>{money(res.noi)}</dd>
                      <dt>Cap rate on cost</dt><dd>{pct(res.capOnCost)}</dd>
                      <dt>Cap rate on ARV</dt><dd>{pct(res.capOnArv)}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Selling costs</dt><dd>{money(res.sellCosts)}</dd>
                      <dt>Projected profit</dt><dd>{money(res.profit)}</dd>
                    </>
                  )}
                </dl>
                <p className="small muted" style={{ marginTop: 10 }}>{offerFormula(state.mode, toInputs(s))}</p>
              </div>

              <h3 className="calc-h">The property</h3>
              <Field id={id("arv")} label="After-repair value (ARV)" prefix="$" value={s.values.arv} onChange={(v) => setValue(i, "arv", v)} />
              <Field id={id("repairs")} label="Repair estimate" prefix="$" value={s.values.repairs} onChange={(v) => setValue(i, "repairs", v)} />

              <h3 className="calc-h">Your costs</h3>
              <Field id={id("buyClosing")} label="Closing costs when you buy" prefix="$" value={s.values.buyClosing} onChange={(v) => setValue(i, "buyClosing", v)} />
              <div className="form-grid">
                <Field id={id("holdingMonthly")} label="Holding cost / month" prefix="$" value={s.values.holdingMonthly} onChange={(v) => setValue(i, "holdingMonthly", v)} />
                <Field id={id("holdMonths")} label={rental ? "Months until rented" : "Months until sold"} value={s.values.holdMonths} onChange={(v) => setValue(i, "holdMonths", v)} />
              </div>
              <Field id={id("wholesaleFee")} label="Wholesale / assignment fee (if any)" prefix="$" value={s.values.wholesaleFee} onChange={(v) => setValue(i, "wholesaleFee", v)} />

              {rental ? (
                <>
                  <h3 className="calc-h">The rent</h3>
                  <div className="form-grid">
                    <Field id={id("monthlyRent")} label="Monthly rent" prefix="$" value={s.values.monthlyRent} onChange={(v) => setValue(i, "monthlyRent", v)} />
                    <Field id={id("vacancyPct")} label="Vacancy" suffix="%" value={s.values.vacancyPct} onChange={(v) => setValue(i, "vacancyPct", v)} />
                  </div>
                  <Field id={id("monthlyExpenses")} label="Monthly expenses (taxes, insurance, upkeep, management)" prefix="$" value={s.values.monthlyExpenses} onChange={(v) => setValue(i, "monthlyExpenses", v)} />
                  <Field id={id("targetCapPct")} label="Cap rate you want on total cost" suffix="%" value={s.values.targetCapPct} onChange={(v) => setValue(i, "targetCapPct", v)} />
                </>
              ) : (
                <>
                  <h3 className="calc-h">Your target</h3>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label htmlFor={id("method")}>Set the offer by</label>
                    <select id={id("method")} value={s.method} onChange={(e) => update(i, { method: e.target.value as FlipMethod })}>
                      <option value="percent">Keeping all-in under a % of ARV</option>
                      <option value="profit">Hitting a profit number</option>
                    </select>
                  </div>
                  {s.method === "percent" ? (
                    <Field id={id("maxAllInPct")} label="Max all-in (% of ARV)" suffix="%" value={s.values.maxAllInPct} onChange={(v) => setValue(i, "maxAllInPct", v)} />
                  ) : (
                    <Field id={id("desiredProfit")} label="Profit you want" prefix="$" value={s.values.desiredProfit} onChange={(v) => setValue(i, "desiredProfit", v)} />
                  )}
                  <Field id={id("sellCostPct")} label="Selling costs: agent + closing (% of ARV)" suffix="%" value={s.values.sellCostPct} onChange={(v) => setValue(i, "sellCostPct", v)} />
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
