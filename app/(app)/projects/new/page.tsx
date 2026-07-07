import type { Metadata } from "next";
import Link from "next/link";
import { createProject } from "@/lib/actions";
import ProjectFormFields from "../ProjectForm";

export const metadata: Metadata = { title: "New project", robots: { index: false } };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
      {error && <div className="form-error">{error}</div>}
      <form action={createProject} className="card">
        <ProjectFormFields />
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary">Create project</button>
          <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
