import fs from "fs";
import path from "path";
import crypto from "crypto";

// Uploaded receipts and photos live on disk under uploads/<projectId>/.
// Served only through the authenticated /api/files route.

const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif", ".pdf"]);
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export function projectDir(projectId: number): string {
  return path.join(UPLOADS_ROOT, String(projectId));
}

export async function saveUpload(file: File, projectId: number): Promise<string | null> {
  if (!file || file.size === 0 || file.size > MAX_UPLOAD_BYTES) return null;
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;

  const dir = projectDir(projectId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

export function deleteProjectUploads(projectId: number) {
  try {
    fs.rmSync(projectDir(projectId), { recursive: true, force: true });
  } catch {
    // nothing to remove
  }
}

export function deleteUpload(projectId: number, filename: string) {
  const safe = path.basename(filename);
  if (!safe) return;
  const full = path.join(projectDir(projectId), safe);
  try {
    fs.unlinkSync(full);
  } catch {
    // already gone
  }
}

export function readUpload(projectId: number, filename: string): Buffer | null {
  const safe = path.basename(filename);
  if (!safe) return null;
  const full = path.join(projectDir(projectId), safe);
  try {
    return fs.readFileSync(full);
  } catch {
    return null;
  }
}

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}
