import type { Metadata } from "next";
import Link from "next/link";
import { createProject } from "@/lib/actions";
import ProjectFormFields from "../ProjectForm";
import PosthogCapture from "@/app/PosthogCapture";
import { Project } from "@/lib/db";

// Fields the public offer calculator can pre-fill through the URL. Anything
// else in the query string is ignored.
const PREFILL_NUMBERS = ["arv", "purchase_price", "purchase_closing_costs", "monthly_rent", "monthly_operating_expenses"] as const;

function prefillFrom(q: Record<string, string | undefined>): Partial<Project> | undefined {
  const p: Partial<Project> = {};
  for (const k of PREFILL_NUMBERS) {
    const n = parseFloat(q[k] ?? "");
    if (!isNaN(n) && n > 0) p[k] = Math.round(n);
  }
  if (q.exit_strategy === "flip" || q.exit_strategy === "brrrr") p.exit_strategy = q.exit_strategy;
  if (q.notes) p.notes = q.notes.slice(0, 1000);
  return Object.keys(p).length ? p : undefined;
}

export const metadata: Metadata = { title: "New project", robots: { index: false } };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const { error } = q;
  const prefill = prefillFrom(q);
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-head">
        <div>
          <div className="overline">New project</div>
          <h1 className="h2">Set up the project</h1>
          <p className="small secondary" style={{ marginTop: 8 }}>
            The rehab budget comes pre-loaded with 19 standard categories. You set the numbers next.
          </p>
        </div>
      </div>
      <PosthogCapture event="user_signed_up" active={q.welcome === "1"} properties={{ from: "offer_calculator" }} />
      {error && <div className="form-error">{error}</div>}
      {prefill && (
        <div className="form-success">
          Numbers from the offer calculator are filled in below. Add a name and address to save it.
        </div>
      )}
      <form action={createProject} className="card">
        <ProjectFormFields project={prefill} />
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary">Create project</button>
          <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
