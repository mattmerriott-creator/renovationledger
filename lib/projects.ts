// Shared by the "new project" form action and the REST API's POST
// /api/v1/projects — one place that inserts a project row and seeds its
// default budget/holding-cost templates, so the two callers can't drift.
import getDb from "./db";
import { DEFAULT_BUDGET_TEMPLATE, DEFAULT_HOLDING_COST_TEMPLATE } from "./budget";

export type ProjectInput = {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
  strategy?: string;
  status?: string;
  purchase_price?: number;
  arv?: number;
  loan_amount?: number;
  lender_name?: string;
  units?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  start_date?: string;
  target_end_date?: string;
  notes?: string;
  exit_strategy?: string;
  loan_type?: string;
  loan_term_months?: number;
  interest_rate?: number;
  points?: number;
  down_payment?: number;
  purchase_closing_costs?: number;
  realtor_fee_pct?: number;
  selling_closing_costs?: number;
  refinance_ltv_pct?: number;
  refinance_closing_costs?: number;
  exit_date?: string;
  monthly_rent?: number;
  monthly_operating_expenses?: number;
  refinance_rate?: number;
  refinance_term_months?: number;
};

export function createProjectRecord(
  userId: number,
  input: ProjectInput
): { projectId: number; isFirstProject: boolean } {
  const db = getDb();
  const isFirstProject =
    (db.prepare("SELECT COUNT(*) c FROM projects WHERE user_id = ?").get(userId) as { c: number }).c === 0;

  const result = db
    .prepare(
      `INSERT INTO projects
        (user_id, name, address, city, state, zip, property_type, strategy, status,
         purchase_price, arv, loan_amount, lender_name, units, beds, baths, sqft,
         start_date, target_end_date, notes,
         exit_strategy, loan_type, loan_term_months, interest_rate, points, down_payment,
         purchase_closing_costs, realtor_fee_pct, selling_closing_costs, refinance_ltv_pct,
         refinance_closing_costs, exit_date, monthly_rent, monthly_operating_expenses,
         refinance_rate, refinance_term_months)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      userId, input.name, input.address, input.city ?? "", (input.state ?? "").toUpperCase(), input.zip ?? "",
      input.property_type || "single_family",
      input.strategy || "rehab",
      input.status || "planning",
      input.purchase_price ?? 0, input.arv ?? 0, input.loan_amount ?? 0, input.lender_name ?? "",
      Math.max(1, Math.round(input.units ?? 0)), input.beds ?? 0, input.baths ?? 0, Math.round(input.sqft ?? 0),
      input.start_date ?? "", input.target_end_date ?? "", input.notes ?? "",
      input.exit_strategy || "flip", input.loan_type ?? "", Math.round(input.loan_term_months ?? 0),
      input.interest_rate ?? 0, input.points ?? 0, input.down_payment ?? 0,
      input.purchase_closing_costs ?? 0, input.realtor_fee_pct || 6, input.selling_closing_costs ?? 0,
      input.refinance_ltv_pct || 75, input.refinance_closing_costs ?? 0, input.exit_date ?? "",
      input.monthly_rent ?? 0, input.monthly_operating_expenses ?? 0,
      input.refinance_rate ?? 0, Math.round(input.refinance_term_months ?? 0) || 360
    );
  const projectId = Number(result.lastInsertRowid);

  const insert = db.prepare(
    "INSERT INTO budget_items (project_id, category, amount, sort, unit) VALUES (?, ?, 0, ?, ?)"
  );
  DEFAULT_BUDGET_TEMPLATE.forEach((t, i) => insert.run(projectId, t.category, i, t.unit));

  const insertHolding = db.prepare(
    "INSERT INTO holding_cost_items (project_id, name, monthly_amount, sort) VALUES (?, ?, 0, ?)"
  );
  DEFAULT_HOLDING_COST_TEMPLATE.forEach((name, i) => insertHolding.run(projectId, name, i));

  return { projectId, isFirstProject };
}
