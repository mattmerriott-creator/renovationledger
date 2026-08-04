import type { Metadata } from "next";
import getDb, { Project, Transaction, TransactionItem, BudgetItem } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/transactions";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addTransaction, updateTransaction, deleteTransaction } from "@/lib/actions";
import { money2 } from "@/lib/format";
import ReceiptField from "./ReceiptField";
import TransactionLineItems from "./TransactionLineItems";
import TransactionRow from "./TransactionRow";

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

  const itemsByTx = new Map<number, TransactionItem[]>();
  if (txs.length > 0) {
    const placeholders = txs.map(() => "?").join(",");
    const allItems = db
      .prepare(`SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders}) ORDER BY id`)
      .all(...txs.map((t) => t.id)) as TransactionItem[];
    for (const it of allItems) {
      const list = itemsByTx.get(it.transaction_id) || [];
      list.push(it);
      itemsByTx.set(it.transaction_id, list);
    }
  }

  const expenseTotal = txs.filter((t) => t.tx_type === "expense").reduce((s, t) => s + t.amount, 0);
  const returnsTotal = txs.filter((t) => t.tx_type === "return").reduce((s, t) => s + t.amount, 0);
  const netSpent = expenseTotal - returnsTotal;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Transactions</h2>
          <p className="small secondary">
            {money2(netSpent)} spent{returnsTotal > 0 ? ` (net of ${money2(returnsTotal)} returned)` : ""} ·{" "}
            {txs.length} entries ·{" "}
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
            <label htmlFor="tx_type">Type</label>
            <select id="tx_type" name="tx_type" defaultValue="expense">
              <option value="expense">Expense</option>
              <option value="return">Return</option>
            </select>
          </div>
        </div>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="payment_method">Payment method</label>
          <select id="payment_method" name="payment_method" defaultValue="">
            <option value="">Not specified</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <TransactionLineItems categories={categories} />
        <ReceiptField categories={categories} />
        <button type="submit" className="btn btn-primary btn-sm">Add transaction</button>
      </form>

      {txs.length === 0 ? (
        <div className="empty">
          <p className="small">No transactions yet. Log the first receipt above and it lands against the budget automatically.</p>
        </div>
      ) : (
        <>
          {/* One hidden form per row so an edit's inputs (which live inside
              table cells) can submit without nesting a <form> in the table. */}
          {txs.map((t) => (
            <form key={t.id} id={`txf${t.id}`} action={updateTransaction} />
          ))}
          <div className="table-wrap card" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Payment</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th>Receipt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <TransactionRow
                    key={t.id}
                    t={t}
                    items={itemsByTx.get(t.id) || []}
                    categories={categories}
                    projectId={project.id}
                    formId={`txf${t.id}`}
                    deleteAction={deleteTransaction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
