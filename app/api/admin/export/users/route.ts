import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const users = getDb()
    .prepare(
      `SELECT u.email, u.name, u.plan, u.created_at, COUNT(p.id) as project_count
       FROM users u
       LEFT JOIN projects p ON p.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at`
    )
    .all() as { email: string; name: string; plan: string; created_at: string; project_count: number }[];

  const rows = [
    ["Email", "Name", "Plan", "Projects", "Signed Up"],
    ...users.map((u) => [u.email, u.name, u.plan, u.project_count, u.created_at]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="renovationledger-users.csv"`,
    },
  });
}
