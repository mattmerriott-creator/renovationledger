import type { Metadata } from "next";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { Project, getProjectFinancials } from "@/lib/db";
import { updateProject, deleteProject } from "@/lib/actions";
import { money, pct, dateFmt } from "@/lib/format";
import ProjectFormFields from "../ProjectForm";

export const metadata: Metadata = { title: "Project overview", robots: { index: false } };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const f = getProjectFinancials(project.id);

  const overBudget = f.budgetTotal > 0 && f.spentTotal > f.budgetTotal;
  const arvWarning = f.allInPctOfArv !== null && f.allInPctOfArv > 75;

  return (
    <>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-dark">
          <div className="stat-number">{money(f.allIn)}</div>
          <div className="stat-label">All-in (purchase + spent)</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={arvWarning ? { color: "var(--color-danger)" } : undefined}>
            {pct(f.allInPctOfArv)}
          </div>
          <div className="stat-label">All-in vs. ARV {money(project.arv)}</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={overBudget ? { color: "var(--color-danger)" } : undefined}>
            {money(f.budgetRemaining)}
          </div>
          <div className="stat-label">Budget remaining of {money(f.budgetTotal)}</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number">{money(f.drawsFunded)}</div>
          <div className="stat-label">Draws funded of {money(project.loan_amount)} loan</div>
        </div>
      </div>

      {(overBudget || arvWarning) && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {overBudget && <div>Spending is over budget by {money(f.spentTotal - f.budgetTotal)}.</div>}
          {arvWarning && <div>All-in is above 75% of ARV. Check the numbers before spending more.</div>}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h2 className="h4" style={{ fontWeight: 600, marginBottom: 12 }}>Deal summary</h2>
          <table className="data" style={{ fontSize: 14 }}>
            <tbody>
              <tr><td className="muted">Purchase price</td><td className="num">{money(project.purchase_price)}</td></tr>
              <tr><td className="muted">Rehab budget</td><td className="num">{money(f.budgetTotal)}</td></tr>
              <tr><td className="muted">Spent to date</td><td className="num">{money(f.spentTotal)}</td></tr>
              <tr><td className="muted">ARV</td><td className="num">{money(project.arv)}</td></tr>
              <tr><td className="muted">Loan · {project.lender_name || "no lender set"}</td><td className="num">{money(project.loan_amount)}</td></tr>
              <tr><td className="muted">Income logged</td><td className="num">{money(f.incomeTotal)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="h4" style={{ fontWeight: 600, marginBottom: 12 }}>Timeline</h2>
          <table className="data" style={{ fontSize: 14 }}>
            <tbody>
              <tr><td className="muted">Start</td><td className="num">{dateFmt(project.start_date)}</td></tr>
              <tr><td className="muted">Target finish</td><td className="num">{dateFmt(project.target_end_date)}</td></tr>
              <tr><td className="muted">Created</td><td className="num">{dateFmt(project.created_at.slice(0, 10))}</td></tr>
            </tbody>
          </table>
          {project.notes && (
            <>
              <h3 className="small" style={{ fontWeight: 600, margin: "16px 0 4px" }}>Notes</h3>
              <p className="small secondary" style={{ whiteSpace: "pre-wrap" }}>{project.notes}</p>
            </>
          )}
        </div>
      </div>

      <details className="card" style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }}>Edit project details</summary>
        <form action={updateProject} style={{ marginTop: 20 }}>
          <input type="hidden" name="project_id" value={project.id} />
          <ProjectFormFields project={project} />
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
        <form action={deleteProject} style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
          <input type="hidden" name="project_id" value={project.id} />
          <button type="submit" className="btn btn-danger-ghost btn-sm">
            Delete this project and all its records
          </button>
        </form>
      </details>
    </>
  );
}
