import type { Metadata } from "next";
import Link from "next/link";
import getDb, { Project, getProjectFinancials } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, pct, STATUS_LABELS, TYPE_LABELS, STRATEGY_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Projects", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = getDb()
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as Project[];

  const rollups = projects.map((p) => ({ p, f: getProjectFinancials(p.id) }));
  const totals = rollups.reduce(
    (acc, { f }) => {
      acc.budget += f.budgetTotal;
      acc.spent += f.spentTotal;
      acc.funded += f.drawsFunded;
      return acc;
    },
    { budget: 0, spent: 0, funded: 0 }
  );
  const active = projects.filter((p) => p.status === "active" || p.status === "planning").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="overline">Portfolio</div>
          <h1 className="h2">Projects</h1>
        </div>
        <Link href="/projects/new" className="btn btn-primary">+ New project</Link>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
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

      {projects.length === 0 ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            No projects yet.
          </p>
          <p className="small" style={{ marginBottom: 16 }}>
            Create your first project. Address, purchase price, ARV. The budget comes pre-loaded.
          </p>
          <Link href="/projects/new" className="btn btn-dark btn-sm">Create your first project</Link>
        </div>
      ) : (
        <div className="grid-3">
          {rollups.map(({ p, f }, i) => {
            const pctSpent = f.budgetTotal > 0 ? Math.min(100, (f.spentTotal / f.budgetTotal) * 100) : 0;
            const over = f.budgetTotal > 0 && f.spentTotal > f.budgetTotal;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card project-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="feature-num">{String(i + 1).padStart(2, "0")}.</span>
                  <span className={p.status === "active" ? "tag tag-accent" : "tag tag-outline"}>
                    {STATUS_LABELS[p.status]}
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
