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
  arv_source?: "comps" | "manual";
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
  monthly_taxes?: number;
  monthly_insurance?: number;
  monthly_hoa?: number;
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
         purchase_price, arv, arv_source, loan_amount, lender_name, units, beds, baths, sqft,
         start_date, target_end_date, notes,
         exit_strategy, loan_type, loan_term_months, interest_rate, points, down_payment,
         purchase_closing_costs, realtor_fee_pct, selling_closing_costs, refinance_ltv_pct,
         refinance_closing_costs, exit_date, monthly_rent, monthly_operating_expenses,
         monthly_taxes, monthly_insurance, monthly_hoa,
         refinance_rate, refinance_term_months)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      userId, input.name, input.address, input.city ?? "", (input.state ?? "").toUpperCase(), input.zip ?? "",
      input.property_type || "single_family",
      input.strategy || "rehab",
      input.status || "planning",
      input.purchase_price ?? 0, input.arv ?? 0,
      // Default: comps, unless an ARV was given without saying where it came from.
      input.arv_source ?? (input.arv ? "manual" : "comps"),
      input.loan_amount ?? 0, input.lender_name ?? "",
      Math.max(1, Math.round(input.units ?? 0)), input.beds ?? 0, input.baths ?? 0, Math.round(input.sqft ?? 0),
      input.start_date ?? "", input.target_end_date ?? "", input.notes ?? "",
      input.exit_strategy || "flip", input.loan_type ?? "", Math.round(input.loan_term_months ?? 0),
      input.interest_rate ?? 0, input.points ?? 0, input.down_payment ?? 0,
      input.purchase_closing_costs ?? 0, input.realtor_fee_pct || 6, input.selling_closing_costs ?? 0,
      input.refinance_ltv_pct || 75, input.refinance_closing_costs ?? 0, input.exit_date ?? "",
      input.monthly_rent ?? 0, input.monthly_operating_expenses ?? 0,
      input.monthly_taxes ?? 0, input.monthly_insurance ?? 0, input.monthly_hoa ?? 0,
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

// Columns of a table, minus the ones a copy must set itself.
function copyableColumns(table: string, skip: string[]): string[] {
  const cols = getDb().prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.map((c) => c.name).filter((c) => !skip.includes(c));
}

// Copies a project as a starting point for a similar deal: every number and
// assumption on the project, the budget (sub-items kept under their groups),
// holding costs and hand-entered comps. Transactions, draws, photos and
// receipts belong to the original deal and are not copied.
// Returns the new project's id, or null if the user doesn't own the source.
export function cloneProjectRecord(userId: number, sourceId: number): number | null {
  const db = getDb();
  const source = db.prepare("SELECT id, name FROM projects WHERE id = ? AND user_id = ?").get(sourceId, userId) as
    | { id: number; name: string }
    | undefined;
  if (!source) return null;

  return db.transaction(() => {
    const projectCols = copyableColumns("projects", ["id", "created_at"]).join(", ");
    const newId = Number(
      db.prepare(`INSERT INTO projects (${projectCols}) SELECT ${projectCols} FROM projects WHERE id = ?`).run(sourceId)
        .lastInsertRowid
    );
    db.prepare(
      "UPDATE projects SET name = ?, status = 'planning', archived = 0, completed_summary = '' WHERE id = ?"
    ).run(`Copy of ${source.name}`.slice(0, 200), newId);

    // Budget: top-level rows first, then sub-items re-pointed at the new parents.
    const budgetCols = copyableColumns("budget_items", ["id", "project_id", "parent_id"]);
    const rows = db
      .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY parent_id IS NOT NULL, sort, id")
      .all(sourceId) as Record<string, unknown>[];
    const insertBudget = db.prepare(
      `INSERT INTO budget_items (project_id, parent_id, ${budgetCols.join(", ")}) VALUES (?, ?, ${budgetCols.map(() => "?").join(", ")})`
    );
    const newIds = new Map<number, number>();
    for (const row of rows) {
      const oldParent = row.parent_id as number | null;
      const parent = oldParent === null ? null : newIds.get(oldParent) ?? null;
      const res = insertBudget.run(newId, parent, ...budgetCols.map((c) => row[c] as never));
      newIds.set(row.id as number, Number(res.lastInsertRowid));
    }

    for (const table of ["holding_cost_items", "comps"]) {
      const cols = copyableColumns(table, ["id", "project_id"]).join(", ");
      db.prepare(`INSERT INTO ${table} (project_id, ${cols}) SELECT ?, ${cols} FROM ${table} WHERE project_id = ?`).run(
        newId,
        sourceId
      );
    }
    return newId;
  })();
}
