import type { Metadata } from "next";
import getDb, { HoldingCostItem, Project } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addHoldingCostItem, updateHoldingCostItem, deleteHoldingCostItem } from "@/lib/actions";
import { getDealAnalysis } from "@/lib/analysis";
import { money } from "@/lib/format";
import HoldingCostRow from "./HoldingCostRow";

export const metadata: Metadata = { title: "Holding Costs", robots: { index: false } };

export default async function HoldingCostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const items = getDb()
    .prepare("SELECT * FROM holding_cost_items WHERE project_id = ? ORDER BY sort, id")
    .all(project.id) as HoldingCostItem[];
  const analysis = getDealAnalysis(project.id);

  const monthlyTotal = items.reduce((s, i) => s + i.monthly_amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Holding costs</h2>
          <p className="small secondary">
            What it costs to carry the property each month you own it. Delete lines you
            don&apos;t need, add your own below. Loan interest is calculated automatically
            on the Analysis tab from your loan terms &mdash; it isn&apos;t a line here.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-number" style={{ fontSize: 28 }}>{money(monthlyTotal)}<span className="small muted">/mo</span></div>
          <div className="stat-label">
            {analysis.holdMonths > 0
              ? `${money(analysis.holdingLineTotal)} over ${analysis.holdMonths} month${analysis.holdMonths === 1 ? "" : "s"} held`
              : "set a start date and expected exit date to project a total"}
          </div>
        </div>
      </div>

      {/* One hidden form per row so inputs can live inside table cells */}
      {items.map((item) => (
        <form key={item.id} id={`hf${item.id}`} action={updateHoldingCostItem} />
      ))}

      <div className="table-wrap card" style={{ padding: 0, marginBottom: 24 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Line item</th>
              <th className="num">Monthly $</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <HoldingCostRow
                key={item.id}
                item={item}
                projectId={project.id}
                formId={`hf${item.id}`}
                deleteAction={deleteHoldingCostItem}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{money(monthlyTotal)}/mo</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form action={addHoldingCostItem} className="card" style={{ maxWidth: 420 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 4 }}>Add a line item</h3>
        <p className="small secondary" style={{ marginBottom: 12 }}>
          Anything the template doesn&apos;t cover. Security monitoring, pool service, pest control.
        </p>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required placeholder="Pest control" />
        </div>
        <div className="field">
          <label htmlFor="monthly_amount">Monthly $</label>
          <input id="monthly_amount" name="monthly_amount" inputMode="decimal" placeholder="45" />
        </div>
        <button type="submit" className="btn btn-dark btn-sm">Add line item</button>
      </form>
    </>
  );
}
