import { notFound } from "next/navigation";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { Project } from "@/lib/db";
import { STATUS_LABELS, TYPE_LABELS, STRATEGY_LABELS } from "@/lib/format";
import SubNav from "./SubNav";
import { cloneProject, setProjectArchived } from "@/lib/actions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project | undefined;
  if (!project) notFound();

  return (
    <>
      <div className="page-head no-print">
        <div>
          <div className="overline">
            {TYPE_LABELS[project.property_type]} · {STRATEGY_LABELS[project.strategy]}
          </div>
          <h1 className="h2">{project.name}</h1>
          <p className="small secondary" style={{ marginTop: 4 }}>
            {project.address}, {project.city}, {project.state} {project.zip}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <span className={project.status === "active" ? "tag tag-accent" : "tag tag-dark"}>
            {STATUS_LABELS[project.status]}
            {project.archived ? " · Archived" : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <form action={cloneProject}>
              <input type="hidden" name="project_id" value={project.id} />
              <button type="submit" className="btn btn-ghost btn-sm" title="Copy the numbers, budget, holding costs and comps into a new project">
                Copy as new project
              </button>
            </form>
            <form action={setProjectArchived}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="archived" value={project.archived ? "0" : "1"} />
              <button type="submit" className="btn btn-ghost btn-sm">{project.archived ? "Restore" : "Archive"}</button>
            </form>
          </div>
        </div>
      </div>
      {project.archived ? (
        <div className="card card-cream no-print" style={{ marginBottom: 16, padding: "12px 16px" }}>
          <p className="small">
            <strong>This project is archived.</strong> It&apos;s hidden from your dashboard and left out of portfolio
            totals. Restore it any time with the button above.
          </p>
        </div>
      ) : null}
      <SubNav projectId={project.id} />
      {children}
    </>
  );
}
