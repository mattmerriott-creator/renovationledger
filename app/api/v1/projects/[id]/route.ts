import { NextRequest, NextResponse } from "next/server";
import getDb, { Project, getProjectFinancials } from "@/lib/db";
import { authenticateApiRequest, requireOwnedProjectForApi } from "@/lib/api-auth";
import { asString, asNumber, parseJsonBody } from "@/lib/api-validate";

// Fields a PATCH may touch, split by the JSON type expected. "id", "user_id"
// and "created_at" are deliberately excluded.
const STRING_FIELDS = [
  "name", "address", "city", "state", "zip", "property_type", "strategy", "status",
  "lender_name", "start_date", "target_end_date", "notes",
  "exit_strategy", "loan_type", "exit_date", "completed_summary",
] as const;
const NUMBER_FIELDS = [
  "purchase_price", "arv", "loan_amount", "units", "beds", "baths", "sqft",
  "loan_term_months", "interest_rate", "points", "down_payment",
  "purchase_closing_costs", "realtor_fee_pct", "selling_closing_costs", "refinance_ltv_pct",
  "refinance_closing_costs", "monthly_rent", "monthly_operating_expenses",
  "refinance_rate", "refinance_term_months",
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  return NextResponse.json({ project: owned.project, financials: getProjectFinancials(Number(id)) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const owned = requireOwnedProjectForApi(Number(id), auth.user.id);
  if ("error" in owned) return owned.error;

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const sets: string[] = [];
  const values: (string | number)[] = [];

  for (const field of STRING_FIELDS) {
    if (!(field in body)) continue;
    const s = asString(body[field]);
    if (s === undefined) return NextResponse.json({ error: `'${field}' must be a string.` }, { status: 400 });
    sets.push(`${field} = ?`);
    values.push(field === "state" ? s.toUpperCase() : s);
  }
  for (const field of NUMBER_FIELDS) {
    if (!(field in body)) continue;
    const n = asNumber(body[field]);
    if (n === undefined) return NextResponse.json({ error: `'${field}' must be a number.` }, { status: 400 });
    sets.push(`${field} = ?`);
    values.push(n);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  values.push(Number(id));
  getDb().prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  const project = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(Number(id)) as Project;
  return NextResponse.json({ project });
}
