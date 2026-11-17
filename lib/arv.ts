// ARV can come from comps (the comps' average $/sqft × the property's sqft)
// or be typed in by hand. When it comes from comps, the result is written to
// projects.arv, so every page and the API read one number either way.
import getDb, { Project } from "./db";

export const ARV_SOURCES = ["comps", "manual"] as const;
export type ArvSource = (typeof ARV_SOURCES)[number];

export function isArvSource(v: unknown): v is ArvSource {
  return typeof v === "string" && (ARV_SOURCES as readonly string[]).includes(v);
}

// The ARV comps support, or null when there's no average or no sqft yet.
export function compsArv(avgPpsf: number, sqft: number): number | null {
  return avgPpsf > 0 && sqft > 0 ? Math.round(avgPpsf * sqft) : null;
}

// Recomputes ARV for a project set to "comps", from its saved average and
// current sqft. Leaves ARV alone for manual projects, or when comps can't
// give a number yet (so the typed-in value stays as a fallback).
export function syncCompsArv(projectId: number) {
  const db = getDb();
  const p = db
    .prepare("SELECT arv, arv_source, comps_avg_ppsf, sqft FROM projects WHERE id = ?")
    .get(projectId) as Pick<Project, "arv" | "arv_source" | "comps_avg_ppsf" | "sqft"> | undefined;
  if (!p || p.arv_source !== "comps") return;
  const arv = compsArv(p.comps_avg_ppsf, p.sqft);
  if (arv !== null && arv !== p.arv) db.prepare("UPDATE projects SET arv = ? WHERE id = ?").run(arv, projectId);
}

// Called by the comps page, which has the full comp list (live + manual).
// Saves the new average and updates ARV if the project uses comps.
export function saveCompsAverage(projectId: number, avgPpsf: number) {
  const db = getDb();
  const row = db.prepare("SELECT comps_avg_ppsf FROM projects WHERE id = ?").get(projectId) as
    | { comps_avg_ppsf: number }
    | undefined;
  if (row && row.comps_avg_ppsf !== avgPpsf) {
    db.prepare("UPDATE projects SET comps_avg_ppsf = ? WHERE id = ?").run(avgPpsf, projectId);
  }
  syncCompsArv(projectId);
}
