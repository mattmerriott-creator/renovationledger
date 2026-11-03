import { NextRequest, NextResponse } from "next/server";
import getDb, { Project, getProjectFinancials } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { asString, asNumber, parseJsonBody } from "@/lib/api-validate";
import { createProjectRecord } from "@/lib/projects";

export async function GET(req: NextRequest) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const projects = getDb()
    .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
    .all(auth.user.id) as Project[];

  return NextResponse.json({
    projects: projects.map((p) => ({ ...p, financials: getProjectFinancials(p.id) })),
  });
}

export async function POST(req: NextRequest) {
  const auth = authenticateApiRequest(req);
  if ("error" in auth) return auth.error;

  const body = await parseJsonBody(req);
  if (body === null) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const name = asString(body.name)?.trim();
  const address = asString(body.address)?.trim();
  if (!name || !address) {
    return NextResponse.json({ error: "'name' and 'address' are required." }, { status: 400 });
  }

  const { projectId } = createProjectRecord(auth.user.id, {
    name, address,
    city: asString(body.city), state: asString(body.state), zip: asString(body.zip),
    property_type: asString(body.property_type), strategy: asString(body.strategy), status: asString(body.status),
    purchase_price: asNumber(body.purchase_price), arv: asNumber(body.arv), loan_amount: asNumber(body.loan_amount),
    lender_name: asString(body.lender_name),
    units: asNumber(body.units), beds: asNumber(body.beds), baths: asNumber(body.baths), sqft: asNumber(body.sqft),
    start_date: asString(body.start_date), target_end_date: asString(body.target_end_date), notes: asString(body.notes),
    exit_strategy: asString(body.exit_strategy), loan_type: asString(body.loan_type),
    loan_term_months: asNumber(body.loan_term_months),
    interest_rate: asNumber(body.interest_rate), points: asNumber(body.points), down_payment: asNumber(body.down_payment),
    purchase_closing_costs: asNumber(body.purchase_closing_costs), realtor_fee_pct: asNumber(body.realtor_fee_pct),
    selling_closing_costs: asNumber(body.selling_closing_costs),
    refinance_ltv_pct: asNumber(body.refinance_ltv_pct), refinance_closing_costs: asNumber(body.refinance_closing_costs),
    exit_date: asString(body.exit_date),
    monthly_rent: asNumber(body.monthly_rent), monthly_operating_expenses: asNumber(body.monthly_operating_expenses),
    refinance_rate: asNumber(body.refinance_rate), refinance_term_months: asNumber(body.refinance_term_months),
  });

  const project = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project;
  return NextResponse.json({ project }, { status: 201 });
}
