// Deal analysis: turns purchase price, rehab budget, holding costs, and loan
// terms into a profit (flip) or cash-left-in-deal + DSCR (BRRRR) read on a
// project. Shared by the Overview stat cards and the Analysis tab so the
// numbers can never drift apart between the two views.

import getDb, { Project, HoldingCostItem, getProjectFinancials } from "./db";

// Standard amortized monthly payment (principal + interest only).
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

function monthsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months);
}

type DealAnalysisBase = {
  holdMonths: number;
  holdingLineTotal: number; // sum of monthly holding-cost lines x months held
  loanInterestCarry: number; // loan_amount x rate/12 x months held
  holdingCostTotal: number; // holdingLineTotal + loanInterestCarry
  pointsCost: number;
  allInCost: number; // purchase + purchase closing costs + rehab budget + holding + points
  cashInvested: number; // down payment + purchase closing costs + points + holding costs
  allInPctOfArv: number | null;
};

export type FlipAnalysis = DealAnalysisBase & {
  exitStrategy: "flip";
  salePrice: number;
  realtorFee: number;
  sellingClosingCosts: number;
  netProfit: number;
  roi: number | null; // percent
};

export type BrrrrAnalysis = DealAnalysisBase & {
  exitStrategy: "brrrr";
  newLoanAmount: number;
  cashOutAtRefi: number;
  cashLeftInDeal: number;
  newLoanMonthlyPayment: number;
  noi: number;
  dscr: number | null;
  monthlyCashFlow: number;
};

export type DealAnalysis = FlipAnalysis | BrrrrAnalysis;

export function getDealAnalysis(projectId: number): DealAnalysis {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project;
  const f = getProjectFinancials(projectId);
  const holdingItems = db
    .prepare("SELECT * FROM holding_cost_items WHERE project_id = ?")
    .all(projectId) as HoldingCostItem[];

  const holdMonths = monthsBetween(project.start_date, project.exit_date || project.target_end_date);
  const holdingLineMonthly = holdingItems.reduce((s, i) => s + i.monthly_amount, 0);
  const holdingLineTotal = holdingLineMonthly * holdMonths;
  const loanInterestCarry = project.loan_amount * (project.interest_rate / 100 / 12) * holdMonths;
  const holdingCostTotal = holdingLineTotal + loanInterestCarry;
  const pointsCost = project.loan_amount * (project.points / 100);

  const allInCost =
    project.purchase_price + project.purchase_closing_costs + f.budgetTotal + holdingCostTotal + pointsCost;
  const cashInvested = project.down_payment + project.purchase_closing_costs + pointsCost + holdingCostTotal;
  const allInPctOfArv = project.arv ? (allInCost / project.arv) * 100 : null;

  const base: DealAnalysisBase = {
    holdMonths,
    holdingLineTotal,
    loanInterestCarry,
    holdingCostTotal,
    pointsCost,
    allInCost,
    cashInvested,
    allInPctOfArv,
  };

  if (project.exit_strategy === "brrrr") {
    const newLoanAmount = project.arv * (project.refinance_ltv_pct / 100);
    const cashOutAtRefi = newLoanAmount - project.loan_amount - project.refinance_closing_costs;
    const cashLeftInDeal = cashInvested - cashOutAtRefi;
    const newLoanMonthlyPayment = monthlyPayment(newLoanAmount, project.refinance_rate, project.refinance_term_months);
    const noi = project.monthly_rent - project.monthly_operating_expenses;
    const dscr = newLoanMonthlyPayment > 0 ? noi / newLoanMonthlyPayment : null;
    const monthlyCashFlow = noi - newLoanMonthlyPayment;
    return {
      ...base,
      exitStrategy: "brrrr",
      newLoanAmount,
      cashOutAtRefi,
      cashLeftInDeal,
      newLoanMonthlyPayment,
      noi,
      dscr,
      monthlyCashFlow,
    };
  }

  const salePrice = project.arv;
  const realtorFee = salePrice * (project.realtor_fee_pct / 100);
  const sellingClosingCosts = project.selling_closing_costs;
  const netProfit = salePrice - allInCost - realtorFee - sellingClosingCosts;
  const roi = cashInvested > 0 ? (netProfit / cashInvested) * 100 : null;
  return { ...base, exitStrategy: "flip", salePrice, realtorFee, sellingClosingCosts, netProfit, roi };
}
