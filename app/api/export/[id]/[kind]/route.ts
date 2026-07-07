import { NextRequest, NextResponse } from "next/server";
import getDb, { BudgetItem, Draw, Project, Transaction, getProjectFinancials } from "@/lib/db";
import { getCurrentUser, getOwnedProject } from "@/lib/auth";

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const { id, kind } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const project = getOwnedProject(Number(id), user.id) as Project | undefined;
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  let rows: (string | number)[][];

  if (kind === "transactions") {
    const txs = db
      .prepare("SELECT * FROM transactions WHERE project_id = ? ORDER BY tx_date, id")
      .all(project.id) as Transaction[];
    rows = [
      ["Date", "Vendor", "Category", "Description", "Type", "Amount"],
      ...txs.map((t) => [t.tx_date, t.vendor, t.category, t.description, t.tx_type, t.amount.toFixed(2)]),
    ];
  } else if (kind === "budget") {
    const f = getProjectFinancials(project.id);
    const items = db
      .prepare("SELECT * FROM budget_items WHERE project_id = ? ORDER BY sort, id")
      .all(project.id) as BudgetItem[];
    rows = [
      ["Category", "Scope", "Qty", "Unit", "Unit Cost", "Budget", "Actual", "Variance"],
      ...items.map((i) => {
        const actual = f.spentByCategory[i.category] || 0;
        return [
          i.category, i.description,
          i.qty ? String(i.qty) : "", i.qty ? i.unit : "", i.unit_cost ? i.unit_cost.toFixed(2) : "",
          i.amount.toFixed(2), actual.toFixed(2), (i.amount - actual).toFixed(2),
        ];
      }),
      ["TOTAL", "", "", "", "", f.budgetTotal.toFixed(2), f.spentTotal.toFixed(2), f.budgetRemaining.toFixed(2)],
    ];
  } else if (kind === "draws") {
    const draws = db
      .prepare("SELECT * FROM draws WHERE project_id = ? ORDER BY draw_number")
      .all(project.id) as Draw[];
    rows = [
      ["Draw #", "Date Requested", "Date Funded", "Work Covered", "Amount", "Status"],
      ...draws.map((d) => [d.draw_number, d.date_requested, d.date_funded, d.notes, d.amount.toFixed(2), d.status]),
    ];
  } else {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${kind}.csv"`,
    },
  });
}
