import type { Metadata } from "next";
import getDb, { Photo, Project } from "@/lib/db";
import { requireUser, getOwnedProject } from "@/lib/auth";
import { addPhotos, updatePhoto, deletePhoto } from "@/lib/actions";
import { dateFmt } from "@/lib/format";

export const metadata: Metadata = { title: "Photos", robots: { index: false } };

const PHASES: { value: Photo["phase"]; label: string }[] = [
  { value: "before", label: "Before" },
  { value: "progress", label: "In progress" },
  { value: "after", label: "Finished" },
];

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = getOwnedProject(Number(id), user.id) as Project;
  const photos = getDb()
    .prepare("SELECT * FROM photos WHERE project_id = ? ORDER BY phase, created_at DESC")
    .all(project.id) as Photo[];

  const inReportCount = photos.filter((p) => p.in_report).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="h3">Project photos</h2>
          <p className="small secondary">
            {photos.length} photos · {inReportCount} marked for the lender report.
            Finished photos go in the report automatically. Uncheck any you want left out.
          </p>
        </div>
      </div>

      <form action={addPhotos} className="card" style={{ marginBottom: 24 }}>
        <h3 className="h4" style={{ fontWeight: 600, marginBottom: 12 }}>Add photos</h3>
        <input type="hidden" name="project_id" value={project.id} />
        <div className="form-grid-3">
          <div className="field">
            <label htmlFor="photos">Photos (select multiple)</label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple required />
          </div>
          <div className="field">
            <label htmlFor="phase">Stage</label>
            <select id="phase" name="phase" defaultValue="progress">
              {PHASES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="caption">Caption (applies to all selected)</label>
            <input id="caption" name="caption" placeholder="Kitchen after new cabinets and counters" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Upload</button>
      </form>

      {photos.length === 0 ? (
        <div className="empty">
          <p className="small">
            No photos yet. Add before photos when you buy, progress photos as you go, and
            finished photos for the report.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {photos.map((photo) => (
            <div key={photo.id} className="card" style={{ padding: 12 }}>
              <a
                href={`/api/files/${project.id}/${photo.filename}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${project.id}/${photo.filename}`}
                  alt={photo.caption || `${photo.phase} photo`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 8,
                    background: "var(--color-cream-alt)",
                  }}
                />
              </a>
              <form action={updatePhoto} style={{ marginTop: 10 }}>
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <input
                  name="caption"
                  defaultValue={photo.caption}
                  placeholder="Caption"
                  style={{ fontSize: 13, padding: "6px 10px", marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select name="phase" defaultValue={photo.phase} style={{ width: 120, fontSize: 13, padding: "6px 10px" }}>
                    {PHASES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 400, margin: 0 }}>
                    <input type="checkbox" name="in_report" defaultChecked={!!photo.in_report} style={{ width: "auto" }} />
                    In report
                  </label>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "space-between" }}>
                  <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                  <button type="submit" formAction={deletePhoto} className="btn btn-danger-ghost btn-sm" aria-label="Delete photo">
                    ✕
                  </button>
                </div>
              </form>
              <p className="small muted" style={{ marginTop: 6 }}>{dateFmt(photo.created_at.slice(0, 10))}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
