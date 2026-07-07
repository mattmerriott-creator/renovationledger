import type { Metadata } from "next";
import getDb, { Project, Transaction, BudgetItem } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addTransaction, deleteTransaction } from "@/lib/actions";
import { money2, dateFmt } from "@/lib/format";
import ReceiptField from "./ReceiptField";

export const metadata: Metadata = { title: "Transactions", robots: { index: false } };

export default async function TransactionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const db = getDb();
  const txs = db
    .prepare("SELECT * FROM transactions WHERE project_id = ? ORDER BY tx_date DESC, id DESC")
    .all(project.id) as Transaction[];
  const categories = (db
    .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY sort, id")
    .all(project.id) as BudgetItem[]).map((b) => b.category);

  const spent = txs.filter((t) => t.tx_type === "expense").reduce((s, t) => s + t.amount, 0);
  const income = txs.filter((t) => t.tx_type === "income").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Transactions</h2>
          <p className="small secondary">
            {money2(spent)} spent · {money2(income)} income · {txs.length} entries ·{" "}
            <a href={`/api/export/${project.id}/transactions`} style={{ fontWeight: 600, textDecoration: "underline" }}>
              Download CSV
            </a>
          </p>
        </div>
      </div>

      <form action={addTransaction} className="card" style={{ marginBottom: 24 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 12 }}>Log a transaction</h3>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="form-grid-3">
          <div className="field">
            <label htmlFor="tx_date">Date</label>
            <input id="tx_date" name="tx_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field">
            <label htmlFor="vendor">Vendor / payee</label>
            <input id="vendor" name="vendor" placeholder="Lowe's" />
          </div>
          <div className="field">
            <label htmlFor="amount">Amount ($)</label>
            <input id="amount" name="amount" inputMode="decimal" required placeholder="418.62" />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="field">
            <label htmlFor="tx_type">Type</label>
            <select id="tx_type" name="tx_type" defaultValue="expense">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Budget category</label>
            <select id="category" name="category" defaultValue="">
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" placeholder="Flooring material, LVP" />
          </div>
        </div>
        <ReceiptField categories={categories} />
        <button type="submit" className="btn btn-primary btn-sm">Add transaction</button>
      </form>

      {txs.length === 0 ? (
        <div className="empty">
          <p className="small">No transactions yet. Log the first receipt above and it lands against the budget automatically.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>Receipt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateFmt(t.tx_date)}</td>
                  <td>{t.vendor || "—"}</td>
                  <td>
                    {t.category ? <span className="tag tag-outline">{t.category}</span> : <span className="muted">—</span>}
                  </td>
                  <td className="secondary">{t.description}</td>
                  <td className="num" style={t.tx_type === "income" ? { color: "#3d7a2f", fontWeight: 600 } : undefined}>
                    {t.tx_type === "income" ? "+" : ""}{money2(t.amount)}
                  </td>
                  <td>
                    {t.receipt_file ? (
                      <a
                        href={`/api/files/${project.id}/${t.receipt_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-cta"
                        aria-label="View receipt"
                        title={t.receipt_name}
                      >
                        ↗
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="tx_id" value={t.id} />
                      <button type="submit" className="btn btn-danger-ghost btn-sm" aria-label="Delete transaction">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
