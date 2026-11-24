import type { Metadata } from "next";
import Link from "next/link";
import getDb, { Project, getProjectFinancials } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDealAnalysis } from "@/lib/analysis";
import { money, pct, STATUS_LABELS, TYPE_LABELS, STRATEGY_LABELS } from "@/lib/format";
import PosthogCapture from "@/app/PosthogCapture";

export const metadata: Metadata = { title: "Projects", robots: { index: false } };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; q?: string; view?: string; archived?: string }>;
}) {
  const { welcome, q = "", view = "all", archived: justArchived } = await searchParams;
  const user = await requireUser();
  const allProjects = getDb()
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as Project[];

  const rollups = allProjects.map((p) => ({ p, f: getProjectFinancials(p.id), a: getDealAnalysis(p.id) }));
  const current = rollups.filter(({ p }) => !p.archived);

  const totals = current.reduce(
    (acc, { f }) => {
      acc.budget += f.budgetTotal;
      acc.spent += f.spentTotal;
      acc.funded += f.drawsFunded;
      return acc;
    },
    { budget: 0, spent: 0, funded: 0 }
  );
  const active = current.filter(({ p }) => p.status === "active" || p.status === "planning").length;

  // Portfolio: properties you own right now (active or complete, not sold or
  // archived). Debt is the original loan, or the refi loan once a rental is
  // complete. Cash flow counts completed rentals only.
  const owned = current.filter(({ p }) => p.status === "active" || p.status === "complete");
  const portfolio = owned.reduce(
    (acc, { p, f, a }) => {
      const refi = a.exitStrategy === "brrrr" && p.status === "complete" ? a : null;
      acc.invested += f.allIn;
      acc.equity += p.arv - (refi ? refi.newLoanAmount : p.loan_amount);
      if (refi) acc.cashFlow += refi.monthlyCashFlow;
      return acc;
    },
    { invested: 0, equity: 0, cashFlow: 0 }
  );

  // Filter tabs and search. Archived projects only show under their own tab.
  const VIEWS: { id: string; label: string; match: (p: Project) => boolean }[] = [
    { id: "all", label: "All", match: (p) => !p.archived },
    { id: "planning", label: "Planning", match: (p) => !p.archived && p.status === "planning" },
    { id: "active", label: "Active", match: (p) => !p.archived && p.status === "active" },
    { id: "complete", label: "Complete", match: (p) => !p.archived && p.status === "complete" },
    { id: "sold", label: "Sold", match: (p) => !p.archived && p.status === "sold" },
    { id: "archived", label: "Archived", match: (p) => !!p.archived },
  ];
  const activeView = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const needle = q.trim().toLowerCase();
  const shown = rollups.filter(
    ({ p }) =>
      activeView.match(p) &&
      (!needle || [p.name, p.address, p.city, p.state, p.zip].some((s) => (s || "").toLowerCase().includes(needle)))
  );
  const viewHref = (id: string) => {
    const params = new URLSearchParams();
    if (id !== "all") params.set("view", id);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/dashboard?${s}` : "/dashboard";
  };

  return (
    <>
      <PosthogCapture event="user_signed_up" active={welcome === "1"} />
      <div className="page-head">
        <div>
          <div className="overline">Portfolio</div>
          <h1 className="h2">Projects</h1>
        </div>
        <Link href="/projects/new" className="btn btn-primary">+ New project</Link>
      </div>

      {justArchived === "1" && (
        <div className="form-success">Project archived. Find it under the Archived tab to restore it.</div>
      )}

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-dark">
          <div className="stat-number">{active}</div>
          <div className="stat-label">Open projects</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number">{money(totals.budget)}</div>
          <div className="stat-label">Total budgeted</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number">{money(totals.spent)}</div>
          <div className="stat-label">Total spent</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number">{money(totals.funded)}</div>
          <div className="stat-label">Draws funded</div>
        </div>
      </div>

      {owned.length > 0 && (
        <div className="grid-3" style={{ marginBottom: 32 }}>
          <div className="card">
            <div className="stat-number" style={{ fontSize: 28 }}>{money(portfolio.invested)}</div>
            <div className="stat-label">Invested (purchase + spent) · {owned.length} owned</div>
          </div>
          <div className="card">
            <div className="stat-number" style={{ fontSize: 28, color: portfolio.equity < 0 ? "var(--color-danger)" : undefined }}>
              {money(portfolio.equity)}
            </div>
            <div className="stat-label">Equity (ARV − loans)</div>
          </div>
          <div className="card">
            <div className="stat-number" style={{ fontSize: 28, color: portfolio.cashFlow < 0 ? "var(--color-danger)" : undefined }}>
              {money(portfolio.cashFlow)}
            </div>
            <div className="stat-label">Rental cash flow / month (completed rentals)</div>
          </div>
        </div>
      )}

      {allProjects.length > 0 && (
        <div className="dash-filters">
          <nav className="chip-row" aria-label="Filter projects">
            {VIEWS.map((v) => {
              const count = rollups.filter(({ p }) => v.match(p)).length;
              if (v.id === "archived" && count === 0) return null;
              return (
                <Link key={v.id} href={viewHref(v.id)} className={v.id === activeView.id ? "chip chip-on" : "chip"} aria-current={v.id === activeView.id ? "page" : undefined}>
                  {v.label} <span className="chip-count">{count}</span>
                </Link>
              );
            })}
          </nav>
          <form method="get" action="/dashboard" className="dash-search" role="search">
            {activeView.id !== "all" && <input type="hidden" name="view" value={activeView.id} />}
            <input type="search" name="q" defaultValue={q} placeholder="Search name, address, city" aria-label="Search projects" />
            <button type="submit" className="btn btn-outline btn-sm">Search</button>
          </form>
        </div>
      )}

      {allProjects.length === 0 ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            No projects yet.
          </p>
          <p className="small" style={{ marginBottom: 16 }}>
            Create your first project. Address, purchase price, ARV. The budget comes pre-loaded.
          </p>
          <Link href="/projects/new" className="btn btn-dark btn-sm">Create your first project</Link>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p className="small">
            No projects match{needle ? <> &ldquo;{q}&rdquo;</> : null}
            {activeView.id !== "all" ? ` in ${activeView.label}` : ""}.{" "}
            <Link href="/dashboard" style={{ fontWeight: 600 }}>Show all</Link>
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {shown.map(({ p, f, a }, i) => {
            const pctSpent = f.budgetTotal > 0 ? Math.min(100, (f.spentTotal / f.budgetTotal) * 100) : 0;
            const over = f.budgetTotal > 0 && f.spentTotal > f.budgetTotal;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card project-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="feature-num">{String(i + 1).padStart(2, "0")}.</span>
                  <span className={p.status === "active" ? "tag tag-accent" : "tag tag-outline"}>
                    {STATUS_LABELS[p.status]}{p.archived ? " · Archived" : ""}
                  </span>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</h2>
                  <p className="small muted">{p.address}, {p.city} {p.state}</p>
                  <p className="small muted">{TYPE_LABELS[p.property_type]} · {STRATEGY_LABELS[p.strategy]}</p>
                </div>
                <div>
                  <div className="small secondary" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>Spent {money(f.spentTotal)}</span>
                    <span>Budget {money(f.budgetTotal)}</span>
                  </div>
                  <div className="progress"><div className={over ? "over" : ""} style={{ width: `${pctSpent}%` }} /></div>
                  <div className="small muted" style={{ marginTop: 8 }}>
                    All-in {money(f.allIn)}{f.allInPctOfArv !== null && <> · {pct(f.allInPctOfArv)} of ARV</>}
                  </div>
                  <div className="small" style={{ marginTop: 4, fontWeight: 600 }}>
                    {a.exitStrategy === "flip" ? (
                      <span style={a.netProfit < 0 ? { color: "var(--color-danger)" } : undefined}>
                        Profit {money(a.netProfit)}
                      </span>
                    ) : (
                      <span>Cash left in deal {money(a.cashLeftInDeal)}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
