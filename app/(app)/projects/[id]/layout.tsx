import { notFound } from "next/navigation";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { Project } from "@/lib/db";
import { STATUS_LABELS, TYPE_LABELS, STRATEGY_LABELS } from "@/lib/format";
import SubNav from "./SubNav";

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
        <span className={project.status === "active" ? "tag tag-accent" : "tag tag-dark"}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>
      <SubNav projectId={project.id} />
      {children}
    </>
  );
}
