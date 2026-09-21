import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { put, del } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// /tmp on Vercel functions (bundle dir is read-only); local dir otherwise.
const UPLOADS_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "uploads")
    : path.join(__dirname, "..", "uploads");

// When a BLOB_READ_WRITE_TOKEN is present (i.e. deployed on Vercel) files are
// stored on Vercel Blob (persistent, CDN-served). Otherwise they are written to
// the local uploads/ directory and served via /uploads/ (local dev only).
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

const safeName = (username) =>
  (username || "user").replace(/[^a-z0-9]/gi, "_");

const sanitizeExt = (name) => {
  const ext = path.extname(name || "").toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ".bin";
};

/**
 * Persist an uploaded file (from multer memory storage) and return its public URL.
 * Vercel Blob returns an absolute URL; local disk returns a relative /uploads/... path.
 */
export async function saveUploadedFile(file, { username, folder = "general" } = {}) {
  const key = `${folder}/${safeName(username)}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${sanitizeExt(file.originalname)}`;

  // A Vercel Function's filesystem (including /tmp) is not durable and is not
  // shared between invocations. Never report a successful upload there: the
  // returned /uploads URL would disappear after a recycle or a new deployment.
  if (process.env.VERCEL === "1" && !USE_BLOB) {
    const error = new Error(
      "Persistent upload storage is not configured. Connect Vercel Blob and set BLOB_READ_WRITE_TOKEN.",
    );
    error.code = "UPLOAD_STORAGE_NOT_CONFIGURED";
    throw error;
  }

  if (USE_BLOB) {
    const blob = await put(key, file.buffer, {
      access: "public",
      contentType: file.mimetype || "application/octet-stream",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    try {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    } catch (error) {
      throw new Error(`Uploads dir not writable: ${error.message}`);
    }
  }
  const filename = path.basename(key);
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

/**
 * Best-effort delete of a previously uploaded file (Blob or local disk).
 */
export async function deleteUploadedFile(url) {
  if (!url) return;
  if (USE_BLOB && /^https?:\/\//.test(url)) {
    try {
      await del(url);
    } catch {
      // best effort
    }
    return;
  }
  if (url.startsWith("/uploads/")) {
    fs.unlink(path.join(UPLOADS_DIR, path.basename(url)), () => {});
  }
}
