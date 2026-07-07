"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import getDb, { Photo, Transaction } from "./db";
import { DEFAULT_BUDGET_TEMPLATE, BUDGET_UNITS } from "./budget";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  requireUser,
  getOwnedProject,
} from "./auth";
import { saveUpload, deleteUpload, deleteProjectUploads } from "./files";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const n = parseFloat(String(fd.get(key) ?? "").replace(/[$,]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ---------- Auth ----------

export async function signup(fd: FormData) {
  const name = str(fd, "name");
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");

  if (!name || !email || !email.includes("@")) redirect("/signup?error=Enter your name and a valid email.");
  if (password.length < 8) redirect("/signup?error=Password must be at least 8 characters.");

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) redirect("/signup?error=An account with that email already exists. Try logging in.");

  const result = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, hashPassword(password));
  await createSession(Number(result.lastInsertRowid));
  redirect("/dashboard");
}

export async function login(fd: FormData) {
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect("/login?error=Wrong email or password.");
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Projects ----------

export async function createProject(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name");
  const address = str(fd, "address");
  if (!name || !address) redirect("/projects/new?error=Project name and address are required.");

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO projects
        (user_id, name, address, city, state, zip, property_type, strategy, status,
         purchase_price, arv, loan_amount, lender_name, units, beds, baths, sqft,
         start_date, target_end_date, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      user.id, name, address, str(fd, "city"), str(fd, "state").toUpperCase(), str(fd, "zip"),
      str(fd, "property_type") || "single_family",
      str(fd, "strategy") || "rehab",
      str(fd, "status") || "planning",
      num(fd, "purchase_price"), num(fd, "arv"), num(fd, "loan_amount"), str(fd, "lender_name"),
      Math.max(1, Math.round(num(fd, "units"))), num(fd, "beds"), num(fd, "baths"), Math.round(num(fd, "sqft")),
      str(fd, "start_date"), str(fd, "target_end_date"), str(fd, "notes")
    );
  const projectId = Number(result.lastInsertRowid);

  // Seed the default budget template at $0 so the budget page is ready to fill in
  const insert = db.prepare(
    "INSERT INTO budget_items (project_id, category, amount, sort, unit) VALUES (?, ?, 0, ?, ?)"
  );
  DEFAULT_BUDGET_TEMPLATE.forEach((t, i) => insert.run(projectId, t.category, i, t.unit));

  redirect(`/projects/${projectId}`);
}

export async function updateProject(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("project_id"));
  if (!getOwnedProject(id, user.id)) redirect("/dashboard");

  getDb()
    .prepare(
      `UPDATE projects SET name=?, address=?, city=?, state=?, zip=?, property_type=?, strategy=?,
        status=?, purchase_price=?, arv=?, loan_amount=?, lender_name=?, units=?, beds=?, baths=?,
        sqft=?, start_date=?, target_end_date=?, notes=? WHERE id=? AND user_id=?`
    )
    .run(
      str(fd, "name"), str(fd, "address"), str(fd, "city"), str(fd, "state").toUpperCase(), str(fd, "zip"),
      str(fd, "property_type"), str(fd, "strategy"), str(fd, "status"),
      num(fd, "purchase_price"), num(fd, "arv"), num(fd, "loan_amount"), str(fd, "lender_name"),
      Math.max(1, Math.round(num(fd, "units"))), num(fd, "beds"), num(fd, "baths"), Math.round(num(fd, "sqft")),
      str(fd, "start_date"), str(fd, "target_end_date"), str(fd, "notes"),
      id, user.id
    );
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("project_id"));
  if (getOwnedProject(id, user.id)) deleteProjectUploads(id);
  getDb().prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, user.id);
  redirect("/dashboard");
}

// ---------- Budget ----------

// Pull qty/unit/unit_cost/amount off the form. If both qty and unit cost are
// set, the line total is calculated; otherwise the typed amount stands.
function budgetLineValues(fd: FormData) {
  const qty = num(fd, "qty");
  const unitCost = num(fd, "unit_cost");
  const unit = (BUDGET_UNITS as readonly string[]).includes(str(fd, "unit")) ? str(fd, "unit") : "job";
  const amount = qty > 0 && unitCost > 0 ? Math.round(qty * unitCost * 100) / 100 : num(fd, "amount");
  return { qty, unit, unitCost, amount };
}

export async function addBudgetItem(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const { qty, unit, unitCost, amount } = budgetLineValues(fd);
  getDb()
    .prepare(
      "INSERT INTO budget_items (project_id, category, description, amount, sort, qty, unit, unit_cost) VALUES (?, ?, ?, ?, 999, ?, ?, ?)"
    )
    .run(projectId, str(fd, "category"), str(fd, "description"), amount, qty, unit, unitCost);
  revalidatePath(`/projects/${projectId}/budget`);
}

// A sub-item is a normal budget_items row with parent_id set. Its parent
// becomes a group header once it has at least one of these underneath it.
export async function addBudgetSubItem(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const parentId = Number(fd.get("parent_id"));
  const parent = getDb()
    .prepare("SELECT id FROM budget_items WHERE id = ? AND project_id = ? AND parent_id IS NULL")
    .get(parentId, projectId);
  if (!parent) redirect(`/projects/${projectId}/budget`);
  const { qty, unit, unitCost, amount } = budgetLineValues(fd);
  getDb()
    .prepare(
      "INSERT INTO budget_items (project_id, category, description, amount, sort, qty, unit, unit_cost, parent_id) VALUES (?, ?, ?, ?, 999, ?, ?, ?, ?)"
    )
    .run(projectId, str(fd, "category"), str(fd, "description"), amount, qty, unit, unitCost, parentId);
  revalidatePath(`/projects/${projectId}/budget`);
}

export async function updateBudgetItem(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const { qty, unit, unitCost, amount } = budgetLineValues(fd);
  getDb()
    .prepare(
      "UPDATE budget_items SET amount = ?, description = ?, qty = ?, unit = ?, unit_cost = ? WHERE id = ? AND project_id = ?"
    )
    .run(amount, str(fd, "description"), qty, unit, unitCost, Number(fd.get("item_id")), projectId);
  revalidatePath(`/projects/${projectId}/budget`);
}

export async function deleteBudgetItem(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const itemId = Number(fd.get("item_id"));
  const db = getDb();
  // Deleting a group takes its sub-items with it.
  db.prepare("DELETE FROM budget_items WHERE parent_id = ? AND project_id = ?").run(itemId, projectId);
  db.prepare("DELETE FROM budget_items WHERE id = ? AND project_id = ?").run(itemId, projectId);
  revalidatePath(`/projects/${projectId}/budget`);
}

// ---------- Transactions ----------

// A transaction is a receipt: one vendor, one date, one payment method, one
// or more line items. Each line item can carry its own budget category, and
// the transaction's total is always the sum of its line items.
export async function addTransaction(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");

  let receiptFile = "";
  let receiptName = "";
  const receipt = fd.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const saved = await saveUpload(receipt, projectId);
    if (saved) {
      receiptFile = saved;
      receiptName = receipt.name;
    }
  }

  const itemCategories = fd.getAll("item_category").map(String);
  const itemDescriptions = fd.getAll("item_description").map(String);
  const itemAmounts = fd.getAll("item_amount").map((v) => {
    const n = parseFloat(String(v).replace(/[$,]/g, ""));
    return isNaN(n) ? 0 : n;
  });
  const items = itemCategories
    .map((category, i) => ({
      category: category.trim(),
      description: (itemDescriptions[i] || "").trim(),
      amount: itemAmounts[i] || 0,
    }))
    .filter((it) => it.amount > 0 || it.category || it.description);

  if (items.length === 0) redirect(`/projects/${projectId}/transactions`);

  const total = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const distinctCategories = [...new Set(items.map((it) => it.category).filter(Boolean))];
  const headerCategory = distinctCategories.length === 1 ? distinctCategories[0] : distinctCategories.length > 1 ? "Split" : "";
  const headerDescription = items.length === 1 ? items[0].description : `${items.length} items`;

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO transactions (project_id, tx_date, vendor, category, description, tx_type, amount, payment_method, receipt_file, receipt_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId,
      str(fd, "tx_date") || new Date().toISOString().slice(0, 10),
      str(fd, "vendor"), headerCategory, headerDescription,
      str(fd, "tx_type") === "income" ? "income" : "expense",
      total, str(fd, "payment_method"),
      receiptFile, receiptName
    );
  const txId = Number(result.lastInsertRowid);
  const insertItem = db.prepare(
    "INSERT INTO transaction_items (transaction_id, category, description, amount) VALUES (?, ?, ?, ?)"
  );
  for (const it of items) insertItem.run(txId, it.category, it.description, it.amount);

  revalidatePath(`/projects/${projectId}/transactions`);
}

export async function deleteTransaction(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const db = getDb();
  const tx = db
    .prepare("SELECT * FROM transactions WHERE id = ? AND project_id = ?")
    .get(Number(fd.get("tx_id")), projectId) as Transaction | undefined;
  if (tx?.receipt_file) deleteUpload(projectId, tx.receipt_file);
  db.prepare("DELETE FROM transactions WHERE id = ? AND project_id = ?")
    .run(Number(fd.get("tx_id")), projectId);
  revalidatePath(`/projects/${projectId}/transactions`);
}

// ---------- Photos ----------

export async function addPhotos(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const phase = ["before", "progress", "after"].includes(str(fd, "phase"))
    ? str(fd, "phase")
    : "progress";
  const caption = str(fd, "caption");
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO photos (project_id, filename, original_name, caption, phase, in_report) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const entry of fd.getAll("photos")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const saved = await saveUpload(entry, projectId);
    if (saved) insert.run(projectId, saved, entry.name, caption, phase, phase === "after" ? 1 : 0);
  }
  revalidatePath(`/projects/${projectId}/photos`);
}

export async function updatePhoto(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  getDb()
    .prepare("UPDATE photos SET caption = ?, phase = ?, in_report = ? WHERE id = ? AND project_id = ?")
    .run(
      str(fd, "caption"),
      ["before", "progress", "after"].includes(str(fd, "phase")) ? str(fd, "phase") : "progress",
      fd.get("in_report") ? 1 : 0,
      Number(fd.get("photo_id")),
      projectId
    );
  revalidatePath(`/projects/${projectId}/photos`);
}

export async function deletePhoto(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const db = getDb();
  const photo = db
    .prepare("SELECT * FROM photos WHERE id = ? AND project_id = ?")
    .get(Number(fd.get("photo_id")), projectId) as Photo | undefined;
  if (photo) {
    deleteUpload(projectId, photo.filename);
    db.prepare("DELETE FROM photos WHERE id = ? AND project_id = ?").run(photo.id, projectId);
  }
  revalidatePath(`/projects/${projectId}/photos`);
}

// ---------- Report ----------

export async function saveCompletedSummary(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  getDb()
    .prepare("UPDATE projects SET completed_summary = ? WHERE id = ? AND user_id = ?")
    .run(str(fd, "completed_summary"), projectId, user.id);
  revalidatePath(`/projects/${projectId}/report`);
}

// ---------- Draws ----------

export async function addDraw(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const db = getDb();
  const next = (db
    .prepare("SELECT COALESCE(MAX(draw_number),0)+1 n FROM draws WHERE project_id = ?")
    .get(projectId) as { n: number }).n;
  const status = str(fd, "status") || "requested";
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO draws (project_id, draw_number, date_requested, date_funded, amount, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    projectId, next,
    str(fd, "date_requested") || today,
    str(fd, "date_funded") || (status === "funded" ? today : ""),
    num(fd, "amount"),
    status,
    str(fd, "notes")
  );
  revalidatePath(`/projects/${projectId}/draws`);
}

export async function updateDrawStatus(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  const status = str(fd, "status");
  const dateFunded =
    status === "funded" ? str(fd, "date_funded") || new Date().toISOString().slice(0, 10) : "";
  getDb()
    .prepare("UPDATE draws SET status = ?, date_funded = ? WHERE id = ? AND project_id = ?")
    .run(status, dateFunded, Number(fd.get("draw_id")), projectId);
  revalidatePath(`/projects/${projectId}/draws`);
}

export async function deleteDraw(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  getDb()
    .prepare("DELETE FROM draws WHERE id = ? AND project_id = ?")
    .run(Number(fd.get("draw_id")), projectId);
  revalidatePath(`/projects/${projectId}/draws`);
}

// ---------- Comps (manual entry) ----------

export async function addComp(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  getDb()
    .prepare(
      `INSERT INTO comps (project_id, address, price, beds, baths, sqft, distance_miles, sold_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId, str(fd, "address"), num(fd, "price"), num(fd, "beds"), num(fd, "baths"),
      Math.round(num(fd, "sqft")), num(fd, "distance_miles"), str(fd, "sold_date"), str(fd, "notes")
    );
  revalidatePath(`/projects/${projectId}/comps`);
}

export async function deleteComp(fd: FormData) {
  const user = await requireUser();
  const projectId = Number(fd.get("project_id"));
  if (!getOwnedProject(projectId, user.id)) redirect("/dashboard");
  getDb()
    .prepare("DELETE FROM comps WHERE id = ? AND project_id = ?")
    .run(Number(fd.get("comp_id")), projectId);
  revalidatePath(`/projects/${projectId}/comps`);
}
