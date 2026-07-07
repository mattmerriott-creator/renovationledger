import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DEFAULT_BUDGET_TEMPLATE } from "./budget";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "buildledger.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT 'single_family',
      strategy TEXT NOT NULL DEFAULT 'rehab',
      status TEXT NOT NULL DEFAULT 'planning',
      purchase_price REAL NOT NULL DEFAULT 0,
      arv REAL NOT NULL DEFAULT 0,
      loan_amount REAL NOT NULL DEFAULT 0,
      lender_name TEXT NOT NULL DEFAULT '',
      units INTEGER NOT NULL DEFAULT 1,
      beds REAL NOT NULL DEFAULT 0,
      baths REAL NOT NULL DEFAULT 0,
      sqft INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      target_end_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      tx_date TEXT NOT NULL,
      vendor TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tx_type TEXT NOT NULL DEFAULT 'expense',
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS draws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      draw_number INTEGER NOT NULL,
      date_requested TEXT NOT NULL DEFAULT '',
      date_funded TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'requested',
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT 'progress',
      in_report INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_budget_project ON budget_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_tx_project ON transactions(project_id);
    CREATE INDEX IF NOT EXISTS idx_draws_project ON draws(project_id);
  `);

  addColumnIfMissing(db, "transactions", "receipt_file", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "transactions", "receipt_name", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "projects", "completed_summary", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "budget_items", "qty", "REAL NOT NULL DEFAULT 0");
  const unitAdded = addColumnIfMissing(db, "budget_items", "unit", "TEXT NOT NULL DEFAULT 'job'");
  addColumnIfMissing(db, "budget_items", "unit_cost", "REAL NOT NULL DEFAULT 0");

  // One-time backfill: rows created before units existed get the template's
  // default unit for their category. Runs only when the column is first added.
  if (unitAdded) {
    const setUnit = db.prepare("UPDATE budget_items SET unit = ? WHERE category = ?");
    for (const t of DEFAULT_BUDGET_TEMPLATE) setUnit.run(t.unit, t.category);
  }
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, def: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    return true;
  }
  return false;
}

export default getDb;

// ---- Types ----

export type User = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  plan: string;
  created_at: string;
};

export type Project = {
  id: number;
  user_id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: "single_family" | "multi_family";
  strategy: "rehab" | "new_build";
  status: "planning" | "active" | "complete" | "sold";
  purchase_price: number;
  arv: number;
  loan_amount: number;
  lender_name: string;
  units: number;
  beds: number;
  baths: number;
  sqft: number;
  start_date: string;
  target_end_date: string;
  notes: string;
  completed_summary: string;
  created_at: string;
};

export type BudgetItem = {
  id: number;
  project_id: number;
  category: string;
  description: string;
  amount: number;
  sort: number;
  qty: number;
  unit: string;
  unit_cost: number;
};

export type Transaction = {
  id: number;
  project_id: number;
  tx_date: string;
  vendor: string;
  category: string;
  description: string;
  tx_type: "expense" | "income";
  amount: number;
  receipt_file: string;
  receipt_name: string;
};

export type Photo = {
  id: number;
  project_id: number;
  filename: string;
  original_name: string;
  caption: string;
  phase: "before" | "progress" | "after";
  in_report: number;
  created_at: string;
};

export type Draw = {
  id: number;
  project_id: number;
  draw_number: number;
  date_requested: string;
  date_funded: string;
  amount: number;
  status: "requested" | "approved" | "funded";
  notes: string;
};

// Budget units and the default category template live in lib/budget.ts
// (kept separate so client components can import them without pulling in SQLite).

// ---- Project financial rollup ----

export type ProjectFinancials = {
  budgetTotal: number;
  spentTotal: number;
  incomeTotal: number;
  drawsFunded: number;
  drawsRequested: number;
  allIn: number; // purchase + spent
  allInPctOfArv: number | null;
  budgetRemaining: number;
  spentByCategory: Record<string, number>;
};

export function getProjectFinancials(projectId: number): ProjectFinancials {
  const d = getDb();
  const project = d.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project;
  const budgetTotal = (d.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM budget_items WHERE project_id = ?"
  ).get(projectId) as { t: number }).t;
  const spentTotal = (d.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM transactions WHERE project_id = ? AND tx_type = 'expense'"
  ).get(projectId) as { t: number }).t;
  const incomeTotal = (d.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM transactions WHERE project_id = ? AND tx_type = 'income'"
  ).get(projectId) as { t: number }).t;
  const drawsFunded = (d.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM draws WHERE project_id = ? AND status = 'funded'"
  ).get(projectId) as { t: number }).t;
  const drawsRequested = (d.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM draws WHERE project_id = ? AND status != 'funded'"
  ).get(projectId) as { t: number }).t;
  const rows = d.prepare(
    "SELECT category, COALESCE(SUM(amount),0) t FROM transactions WHERE project_id = ? AND tx_type = 'expense' GROUP BY category"
  ).all(projectId) as { category: string; t: number }[];
  const spentByCategory: Record<string, number> = {};
  for (const r of rows) spentByCategory[r.category] = r.t;

  const allIn = (project?.purchase_price || 0) + spentTotal;
  return {
    budgetTotal,
    spentTotal,
    incomeTotal,
    drawsFunded,
    drawsRequested,
    allIn,
    allInPctOfArv: project?.arv ? (allIn / project.arv) * 100 : null,
    budgetRemaining: budgetTotal - spentTotal,
    spentByCategory,
  };
}
