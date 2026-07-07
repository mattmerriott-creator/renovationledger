import type { Metadata } from "next";
import getDb, { BudgetItem, Project, getProjectFinancials } from "@/lib/db";
import { BUDGET_UNITS, UNIT_LABELS } from "@/lib/budget";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addBudgetItem, updateBudgetItem, deleteBudgetItem } from "@/lib/actions";
import { money } from "@/lib/format";
import BudgetRow from "./BudgetRow";

export const metadata: Metadata = { title: "Budget", robots: { index: false } };

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const items = getDb()
    .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY sort, id")
    .all(project.id) as BudgetItem[];
  const f = getProjectFinancials(project.id);

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Rehab budget</h2>
          <p className="small secondary">
            Starts from the default template. Delete lines you don&apos;t need, add your own below.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-number" style={{ fontSize: 28 }}>{money(f.budgetTotal)}</div>
          <div className="stat-label">budgeted · {money(f.spentTotal)} spent</div>
        </div>
      </div>

      {/* Pricing key */}
      <div className="card card-cream" style={{ marginBottom: 24 }}>
        <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
          Two ways to price a line
        </p>
        <p className="small secondary" style={{ marginBottom: 10 }}>
          Type a flat total in the Budget column. Or enter a Qty and a Unit cost and the
          budget calculates itself: 1,250 sqft of flooring at $4.50 = $5,625. 12 windows
          at $150 = $1,800. Clear Qty or Unit cost to go back to a typed total.
        </p>
        <p className="small secondary" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          {BUDGET_UNITS.map((u) => (
            <span key={u}>
              <strong style={{ color: "var(--color-text-primary)" }}>{u}</strong> = {UNIT_LABELS[u]}
            </span>
          ))}
        </p>
      </div>

      {/* One hidden form per row so inputs can live inside table cells */}
      {items.map((item) => (
        <form key={item.id} id={`bf${item.id}`} action={updateBudgetItem} />
      ))}

      <div className="table-wrap card" style={{ padding: 0, marginBottom: 24 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Category</th>
              <th className="num">Qty</th>
              <th>Unit</th>
              <th className="num">Unit cost</th>
              <th className="num">Budget</th>
              <th>Scope notes</th>
              <th className="num">Actual</th>
              <th className="num">Variance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <BudgetRow
                key={item.id}
                item={item}
                actual={f.spentByCategory[item.category] || 0}
                projectId={project.id}
                formId={`bf${item.id}`}
                deleteAction={deleteBudgetItem}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td className="num">{money(f.budgetTotal)}</td>
              <td></td>
              <td className="num">{money(f.spentTotal)}</td>
              <td className="num" style={f.budgetRemaining < 0 ? { color: "var(--color-danger)" } : undefined}>
                {money(f.budgetRemaining)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form action={addBudgetItem} className="card" style={{ maxWidth: 760 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 4 }}>Add a category</h3>
        <p className="small secondary" style={{ marginBottom: 12 }}>
          Anything the template doesn&apos;t cover. Septic, pool, detached garage, whatever the job needs.
        </p>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="category">Category name</label>
            <input id="category" name="category" required placeholder="Septic" />
          </div>
          <div className="field">
            <label htmlFor="description">Scope notes</label>
            <input id="description" name="description" placeholder="New aerobic system" />
          </div>
        </div>
        <div className="form-grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 16px" }}>
          <div className="field">
            <label htmlFor="qty">Qty (optional)</label>
            <input id="qty" name="qty" inputMode="decimal" placeholder="1" />
          </div>
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select id="unit" name="unit" defaultValue="job">
              {BUDGET_UNITS.map((u) => (
                <option key={u} value={u}>{u} — {UNIT_LABELS[u]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="unit_cost">Unit cost (optional)</label>
            <input id="unit_cost" name="unit_cost" inputMode="decimal" placeholder="8500" />
          </div>
          <div className="field">
            <label htmlFor="amount">Or flat budget ($)</label>
            <input id="amount" name="amount" inputMode="decimal" placeholder="8500" />
          </div>
        </div>
        <button type="submit" className="btn btn-dark btn-sm">Add category</button>
      </form>
    </>
  );
}
