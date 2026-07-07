import type { Metadata } from "next";
import getDb, { BudgetItem, Draw, Photo, Project, Transaction, getProjectFinancials } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { saveCompletedSummary } from "@/lib/actions";
import { money, money2, pct, dateFmt, STATUS_LABELS, TYPE_LABELS, STRATEGY_LABELS } from "@/lib/format";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "Lender report", robots: { index: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const db = getDb();
  const f = getProjectFinancials(project.id);
  const items = db
    .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY sort, id")
    .all(project.id) as BudgetItem[];
  const draws = db
    .prepare("SELECT * FROM draws WHERE project_id = ? ORDER BY draw_number")
    .all(project.id) as Draw[];
  const txs = db
    .prepare("SELECT * FROM transactions WHERE project_id = ? ORDER BY tx_date, id")
    .all(project.id) as Transaction[];
  const reportPhotos = db
    .prepare(
      "SELECT * FROM photos WHERE project_id = ? AND in_report = 1 ORDER BY CASE phase WHEN 'before' THEN 0 WHEN 'progress' THEN 1 ELSE 2 END, created_at"
    )
    .all(project.id) as Photo[];

  // Work completed: categories with actual spend, with their scope notes
  const completedWork = items
    .filter((i) => (f.spentByCategory[i.category] || 0) > 0)
    .map((i) => ({ category: i.category, scope: i.description, spent: f.spentByCategory[i.category] || 0 }));

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h2 className="h3">Lender report</h2>
          <p className="small secondary">
            Print or save as PDF to send to your lender. Or download the raw data:{" "}
            <a href={`/api/export/${project.id}/budget`} style={{ fontWeight: 600, textDecoration: "underline" }}>budget CSV</a>,{" "}
            <a href={`/api/export/${project.id}/transactions`} style={{ fontWeight: 600, textDecoration: "underline" }}>transactions CSV</a>,{" "}
            <a href={`/api/export/${project.id}/draws`} style={{ fontWeight: 600, textDecoration: "underline" }}>draws CSV</a>.
          </p>
        </div>
        <PrintButton />
      </div>

      <details className="card no-print" style={{ marginBottom: 24 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }}>
          Edit the work summary that appears on the report
        </summary>
        <form action={saveCompletedSummary} style={{ marginTop: 16 }}>
          <input type="hidden" name="project_id" value={project.id} />
          <div className="field">
            <label htmlFor="completed_summary">Work completed summary</label>
            <textarea
              id="completed_summary"
              name="completed_summary"
              rows={4}
              defaultValue={project.completed_summary}
              placeholder="Full cosmetic rehab. New roof, full interior paint, LVP flooring throughout, new kitchen cabinets and counters, both baths updated."
            />
            <p className="small muted" style={{ marginTop: 4 }}>
              Plain language. What was done to the property. This prints at the top of the
              Work Completed section, followed by the per-category breakdown.
            </p>
          </div>
          <button type="submit" className="btn btn-dark btn-sm">Save summary</button>
        </form>
      </details>

      <div className="report-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-dark)", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div className="overline">Project status report</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{project.name}</h1>
            <p className="small secondary">
              {project.address}, {project.city}, {project.state} {project.zip}
            </p>
            <p className="small muted">
              {TYPE_LABELS[project.property_type]} · {STRATEGY_LABELS[project.strategy]} · {STATUS_LABELS[project.status]}
              {project.units > 1 ? ` · ${project.units} units` : ""}
              {project.sqft ? ` · ${project.sqft.toLocaleString()} sqft` : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="small" style={{ fontWeight: 600 }}>Prepared by {user.name}</p>
            <p className="small muted">{today}</p>
            {project.lender_name && <p className="small muted">For: {project.lender_name}</p>}
          </div>
        </div>

        {/* Deal summary */}
        <h2 className="overline" style={{ marginBottom: 8 }}>Deal summary</h2>
        <table className="data" style={{ marginBottom: 28 }}>
          <tbody>
            <tr>
              <td className="muted">Purchase price</td><td className="num">{money(project.purchase_price)}</td>
              <td className="muted">Rehab budget</td><td className="num">{money(f.budgetTotal)}</td>
            </tr>
            <tr>
              <td className="muted">Spent to date</td><td className="num">{money(f.spentTotal)}</td>
              <td className="muted">Budget remaining</td><td className="num">{money(f.budgetRemaining)}</td>
            </tr>
            <tr>
              <td className="muted">All-in to date</td><td className="num" style={{ fontWeight: 700 }}>{money(f.allIn)}</td>
              <td className="muted">After repair value (ARV)</td><td className="num">{money(project.arv)}</td>
            </tr>
            <tr>
              <td className="muted">All-in as % of ARV</td>
              <td className="num" style={{ fontWeight: 700 }}>{pct(f.allInPctOfArv)}</td>
              <td className="muted">Loan amount</td><td className="num">{money(project.loan_amount)}</td>
            </tr>
            <tr>
              <td className="muted">Draws funded</td><td className="num">{money(f.drawsFunded)}</td>
              <td className="muted">Timeline</td>
              <td className="num">{dateFmt(project.start_date)} → {dateFmt(project.target_end_date)}</td>
            </tr>
          </tbody>
        </table>

        {/* Work completed */}
        {(project.completed_summary || completedWork.length > 0) && (
          <>
            <h2 className="overline" style={{ marginBottom: 8 }}>Work completed</h2>
            {project.completed_summary && (
              <p className="small" style={{ marginBottom: 12, whiteSpace: "pre-wrap" }}>
                {project.completed_summary}
              </p>
            )}
            {completedWork.length > 0 && (
              <table className="data" style={{ marginBottom: 28 }}>
                <thead>
                  <tr>
                    <th>Scope of work</th>
                    <th>Detail</th>
                    <th className="num">Cost to date</th>
                  </tr>
                </thead>
                <tbody>
                  {completedWork.map((w) => (
                    <tr key={w.category}>
                      <td style={{ fontWeight: 500 }}>{w.category}</td>
                      <td className="secondary">{w.scope}</td>
                      <td className="num">{money(w.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Budget vs actual */}
        <h2 className="overline" style={{ marginBottom: 8 }}>Budget vs. actual</h2>
        <table className="data" style={{ marginBottom: 28 }}>
          <thead>
            <tr>
              <th>Category</th><th>Scope</th>
              <th className="num">Budget</th><th className="num">Actual</th><th className="num">Variance</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((i) => i.amount > 0 || (f.spentByCategory[i.category] || 0) > 0).map((i) => {
              const actual = f.spentByCategory[i.category] || 0;
              return (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.category}</td>
                  <td className="secondary">{i.description}</td>
                  <td className="num">{money(i.amount)}</td>
                  <td className="num">{money(actual)}</td>
                  <td className="num" style={i.amount - actual < 0 ? { color: "var(--color-danger)", fontWeight: 600 } : undefined}>
                    {money(i.amount - actual)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td className="num">{money(f.budgetTotal)}</td>
              <td className="num">{money(f.spentTotal)}</td>
              <td className="num">{money(f.budgetRemaining)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Draw schedule */}
        <h2 className="overline" style={{ marginBottom: 8 }}>Draw schedule</h2>
        {draws.length === 0 ? (
          <p className="small muted" style={{ marginBottom: 28 }}>No draws recorded.</p>
        ) : (
          <table className="data" style={{ marginBottom: 28 }}>
            <thead>
              <tr>
                <th>Draw</th><th>Requested</th><th>Funded</th><th>Work covered</th>
                <th className="num">Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr key={d.id}>
                  <td>#{d.draw_number}</td>
                  <td>{dateFmt(d.date_requested)}</td>
                  <td>{dateFmt(d.date_funded)}</td>
                  <td className="secondary">{d.notes}</td>
                  <td className="num">{money(d.amount)}</td>
                  <td style={{ textTransform: "capitalize" }}>{d.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Funded to date</td>
                <td className="num">{money(f.drawsFunded)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Ledger */}
        <h2 className="overline" style={{ marginBottom: 8 }}>Transaction ledger</h2>
        {txs.length === 0 ? (
          <p className="small muted">No transactions recorded.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Date</th><th>Vendor</th><th>Category</th><th>Description</th><th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateFmt(t.tx_date)}</td>
                  <td>{t.vendor}</td>
                  <td>{t.category}</td>
                  <td className="secondary">{t.description}</td>
                  <td className="num">{t.tx_type === "income" ? "+" : ""}{money2(t.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total expenses</td>
                <td className="num">{money2(f.spentTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Photos */}
        {reportPhotos.length > 0 && (
          <>
            <h2 className="overline" style={{ margin: "28px 0 8px" }}>Property photos</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                breakInside: "avoid",
              }}
            >
              {reportPhotos.map((photo) => (
                <figure key={photo.id} style={{ margin: 0, breakInside: "avoid" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${project.id}/${photo.filename}`}
                    alt={photo.caption || `${photo.phase} photo`}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                  <figcaption className="small muted" style={{ marginTop: 4 }}>
                    {photo.phase === "before" ? "Before" : photo.phase === "after" ? "Finished" : "In progress"}
                    {photo.caption ? ` — ${photo.caption}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        <p className="small muted" style={{ marginTop: 28, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
          Generated by RenovationLedger on {today}. Figures reflect entries recorded as of this date.
        </p>
      </div>
    </>
  );
}
