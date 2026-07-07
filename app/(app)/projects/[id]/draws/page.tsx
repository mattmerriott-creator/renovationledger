import type { Metadata } from "next";
import getDb, { Project, Draw } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addDraw, updateDrawStatus, deleteDraw } from "@/lib/actions";
import { money, dateFmt } from "@/lib/format";

export const metadata: Metadata = { title: "Draws", robots: { index: false } };

const DRAW_STATUS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  funded: "Funded",
};

export default async function DrawsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const draws = getDb()
    .prepare("SELECT * FROM draws WHERE project_id = ? ORDER BY draw_number")
    .all(project.id) as Draw[];

  const funded = draws.filter((d) => d.status === "funded").reduce((s, d) => s + d.amount, 0);
  const pending = draws.filter((d) => d.status !== "funded").reduce((s, d) => s + d.amount, 0);
  const remaining = project.loan_amount - funded;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Draw schedule</h2>
          <p className="small secondary">
            Loan {money(project.loan_amount)}{project.lender_name ? ` · ${project.lender_name}` : ""} ·{" "}
            <a href={`/api/export/${project.id}/draws`} style={{ fontWeight: 600, textDecoration: "underline" }}>
              Download CSV
            </a>
          </p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card card-dark">
          <div className="stat-number" style={{ fontSize: 32 }}>{money(funded)}</div>
          <div className="stat-label">Funded to date</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={{ fontSize: 32 }}>{money(pending)}</div>
          <div className="stat-label">Requested / approved, not funded</div>
        </div>
        <div className="card card-cream">
          <div className="stat-number" style={{ fontSize: 32, ...(remaining < 0 ? { color: "var(--color-danger)" } : {}) }}>
            {money(remaining)}
          </div>
          <div className="stat-label">Left on the loan</div>
        </div>
      </div>

      <form action={addDraw} className="card" style={{ marginBottom: 24 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 12 }}>Request a draw</h3>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="form-grid-3">
          <div className="field">
            <label htmlFor="amount">Amount ($)</label>
            <input id="amount" name="amount" inputMode="decimal" required placeholder="15000" />
          </div>
          <div className="field">
            <label htmlFor="date_requested">Date requested</label>
            <input id="date_requested" name="date_requested" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="requested">
              <option value="requested">Requested</option>
              <option value="approved">Approved</option>
              <option value="funded">Funded</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Work covered</label>
          <input id="notes" name="notes" placeholder="Roof complete, rough-in electrical and plumbing" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Add draw</button>
      </form>

      {draws.length === 0 ? (
        <div className="empty">
          <p className="small">No draws yet. Add the first one above. Draws are numbered automatically.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Draw</th>
                <th>Requested</th>
                <th>Funded</th>
                <th>Work covered</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>#{d.draw_number}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{dateFmt(d.date_requested)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{dateFmt(d.date_funded)}</td>
                  <td className="secondary">{d.notes}</td>
                  <td className="num">{money(d.amount)}</td>
                  <td>
                    <form action={updateDrawStatus} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="draw_id" value={d.id} />
                      <select name="status" defaultValue={d.status} style={{ width: 130, fontSize: 13, padding: "6px 10px" }}>
                        {Object.entries(DRAW_STATUS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteDraw}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="draw_id" value={d.id} />
                      <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label="Delete draw">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="num">{money(funded + pending)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
