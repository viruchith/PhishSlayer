import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Absolute path to the monorepo root (directory that contains `/backend`). */
export const repoRoot = path.resolve(__dirname, "../../");

/**
 * `.env` candidates (later entries override earlier for duplicate keys).
 * Uses absolute paths derived from this file’s location so loading works
 * even when `process.cwd()` is `frontend/` or another folder.
 */
function getCandidatePaths() {
  return [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, "backend", ".env"),
    path.resolve(process.cwd(), ".env"),
  ].filter((p, i, arr) => arr.indexOf(p) === i);
}

/** Repo-relative paths of `.env` files merged in the last `reloadEnvFromDisk()` run. */
export const mergedEnvSources = [];

function stripBom(s) {
  return s.replace(/^\uFEFF/, "");
}

function looseKeyFromText(text, keyName) {
  const re = new RegExp(`^\\s*(?:export\\s+)?${keyName}\\s*=\\s*(.*)$`, "mi");
  const m = text.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (!v || v.startsWith("#")) return null;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  v = v.replace(/\r$/, "").trim();
  return v || null;
}

function parseEnvFile(absPath) {
  const raw = fs.readFileSync(absPath);
  let text = raw.toString("utf8");
  text = stripBom(text);
  const parsed = dotenv.parse(text);
  if (!parsed.GEMINI_API_KEY) {
    const loose = looseKeyFromText(text, "GEMINI_API_KEY");
    if (loose) parsed.GEMINI_API_KEY = loose;
  }
  if (!parsed.GOOGLE_API_KEY) {
    const loose = looseKeyFromText(text, "GOOGLE_API_KEY");
    if (loose) parsed.GOOGLE_API_KEY = loose;
  }
  return parsed;
}

function applyMergedToProcessEnv(merged) {
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    process.env[key] = String(value);
  }
  for (const key of ["GEMINI_API_KEY", "GOOGLE_API_KEY"]) {
    if (typeof process.env[key] === "string") {
      process.env[key] = stripBom(process.env[key]).trim();
      if (process.env[key] === "") delete process.env[key];
    }
  }
}

/** Re-read all known `.env` files and merge into `process.env` (safe to call multiple times). */
export function reloadEnvFromDisk() {
  mergedEnvSources.length = 0;
  const merged = {};
  const candidates = getCandidatePaths();

  for (const absPath of candidates) {
    if (!fs.existsSync(absPath)) continue;
    try {
      Object.assign(merged, parseEnvFile(absPath));
      const rel = path.relative(repoRoot, absPath).replace(/\\/g, "/");
      mergedEnvSources.push(rel && rel !== ".." ? rel : path.basename(absPath));
    } catch {
      // unreadable / parse error — try next file
    }
  }

  applyMergedToProcessEnv(merged);
}

/** Non-secret diagnostics for `/api/health` and mock fallback responses. */
export function getEnvDiagnostics() {
  const candidates = getCandidatePaths();
  const key = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "");
  return {
    nodeCwd: process.cwd(),
    repoRootBasename: path.basename(repoRoot),
    geminiKeyLength: stripBom(key).trim().length,
    mergedEnvSources: [...mergedEnvSources],
    envCandidates: candidates.map((absPath) => ({
      rel: path.relative(repoRoot, absPath).replace(/\\/g, "/") || path.basename(absPath),
      exists: fs.existsSync(absPath),
    })),
  };
}

reloadEnvFromDisk();
