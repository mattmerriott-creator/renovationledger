import type { Metadata } from "next";
import { Project, getProjectFinancials } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { getDealAnalysis } from "@/lib/analysis";
import { money, pct, EXIT_STRATEGY_LABELS, LOAN_TYPE_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Analysis", robots: { index: false } };

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const a = getDealAnalysis(project.id);
  const f = getProjectFinancials(project.id);

  const arvFlag = a.allInPctOfArv !== null && a.allInPctOfArv > 75;
  const dscrFlag = a.exitStrategy === "brrrr" && a.dscr !== null && a.dscr < 1.2;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Deal analysis</h2>
          <p className="small secondary">
            {EXIT_STRATEGY_LABELS[project.exit_strategy]}
            {project.loan_type ? ` · ${LOAN_TYPE_LABELS[project.loan_type] || project.loan_type}` : ""}
            {a.holdMonths > 0 ? ` · ${a.holdMonths} month${a.holdMonths === 1 ? "" : "s"} held` : ""}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          {a.exitStrategy === "flip" ? (
            <>
              <div className="stat-number" style={{ fontSize: 28, color: a.netProfit < 0 ? "var(--color-danger)" : undefined }}>
                {money(a.netProfit)}
              </div>
              <div className="stat-label">projected net profit</div>
            </>
          ) : (
            <>
              <div className="stat-number" style={{ fontSize: 28, color: a.cashLeftInDeal > 0 ? undefined : "#3d7a2f" }}>
                {money(a.cashLeftInDeal)}
              </div>
              <div className="stat-label">cash left in deal after refi</div>
            </>
          )}
        </div>
      </div>

      {(arvFlag || dscrFlag) && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {arvFlag && <div>All-in is {pct(a.allInPctOfArv)} of ARV, above your 75% max.</div>}
          {dscrFlag && <div>DSCR is {a.dscr!.toFixed(2)}x, below your 1.2 minimum.</div>}
        </div>
      )}

      <div className="table-wrap card" style={{ marginBottom: 24 }}>
        <table className="data">
          <thead>
            <tr><th colSpan={2}>All-in cost</th></tr>
          </thead>
          <tbody>
            <tr><td className="muted">Purchase price</td><td className="num">{money(project.purchase_price)}</td></tr>
            <tr><td className="muted">Purchase closing costs</td><td className="num">{money(project.purchase_closing_costs)}</td></tr>
            <tr><td className="muted">Rehab budget</td><td className="num">{money(f.budgetTotal)}</td></tr>
            <tr><td className="muted">Holding costs ({a.holdMonths} mo. of line items)</td><td className="num">{money(a.holdingLineTotal)}</td></tr>
            <tr><td className="muted">Loan interest carry</td><td className="num">{money(a.loanInterestCarry)}</td></tr>
            <tr><td className="muted">Loan points</td><td className="num">{money(a.pointsCost)}</td></tr>
          </tbody>
          <tfoot>
            <tr>
              <td>All-in cost</td>
              <td className="num" style={{ fontWeight: 700 }}>{money(a.allInCost)}</td>
            </tr>
            <tr>
              <td className="muted">All-in as % of ARV ({money(project.arv)})</td>
              <td className="num" style={arvFlag ? { color: "var(--color-danger)", fontWeight: 700 } : { fontWeight: 700 }}>
                {pct(a.allInPctOfArv)}
              </td>
            </tr>
            <tr>
              <td className="muted">Cash invested</td>
              <td className="num">{money(a.cashInvested)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {a.exitStrategy === "flip" ? (
        <div className="table-wrap card">
          <table className="data">
            <thead>
              <tr><th colSpan={2}>Sale</th></tr>
            </thead>
            <tbody>
              <tr><td className="muted">Sale price (ARV)</td><td className="num">{money(a.salePrice)}</td></tr>
              <tr><td className="muted">Realtor fee ({project.realtor_fee_pct}%)</td><td className="num">{money(a.realtorFee)}</td></tr>
              <tr><td className="muted">Selling closing costs</td><td className="num">{money(a.sellingClosingCosts)}</td></tr>
              <tr><td className="muted">All-in cost</td><td className="num">{money(a.allInCost)}</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Net profit</td>
                <td className="num" style={{ fontWeight: 700, color: a.netProfit < 0 ? "var(--color-danger)" : undefined }}>
                  {money(a.netProfit)}
                </td>
              </tr>
              <tr>
                <td className="muted">Cash-on-cash ROI</td>
                <td className="num">{pct(a.roi)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data">
            <thead>
              <tr><th colSpan={2}>Refinance</th></tr>
            </thead>
            <tbody>
              <tr><td className="muted">New loan (ARV × {project.refinance_ltv_pct}%)</td><td className="num">{money(a.newLoanAmount)}</td></tr>
              <tr><td className="muted">Payoff of original loan</td><td className="num">{money(project.loan_amount)}</td></tr>
              <tr><td className="muted">Refinance closing costs</td><td className="num">{money(project.refinance_closing_costs)}</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Cash out at refinance</td>
                <td className="num" style={{ fontWeight: 700 }}>{money(a.cashOutAtRefi)}</td>
              </tr>
              <tr>
                <td className="muted">Cash left in deal</td>
                <td className="num" style={{ fontWeight: 700 }}>{money(a.cashLeftInDeal)}</td>
              </tr>
            </tfoot>
          </table>

          <table className="data" style={{ marginTop: 20 }}>
            <thead>
              <tr><th colSpan={2}>Cash flow, post-refinance</th></tr>
            </thead>
            <tbody>
              <tr><td className="muted">Monthly rent</td><td className="num">{money(project.monthly_rent)}</td></tr>
              <tr><td className="muted">Monthly operating expenses</td><td className="num">{money(project.monthly_operating_expenses)}</td></tr>
              <tr><td className="muted">Net operating income (NOI)</td><td className="num">{money(a.noi)}</td></tr>
              <tr>
                <td className="muted">New loan payment ({project.refinance_rate}% / {project.refinance_term_months} mo.)</td>
                <td className="num">{money(a.newLoanMonthlyPayment)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>DSCR</td>
                <td className="num" style={{ fontWeight: 700, color: dscrFlag ? "var(--color-danger)" : undefined }}>
                  {a.dscr !== null ? `${a.dscr.toFixed(2)}x` : "—"}
                </td>
              </tr>
              <tr>
                <td className="muted">Monthly cash flow</td>
                <td className="num" style={{ fontWeight: 700, color: a.monthlyCashFlow < 0 ? "var(--color-danger)" : undefined }}>
                  {money(a.monthlyCashFlow)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
