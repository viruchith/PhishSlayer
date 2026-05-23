import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo-root `logs/` (works whether cwd is `backend/` or monorepo root). */
export const LOG_DIR = path.resolve(__dirname, "../../logs");

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Append one JSON line to a log file under `logs/`.
 * @param {string} fileName e.g. "backend.log"
 * @param {Record<string, unknown>} record
 */
export function appendJsonLog(fileName, record) {
  try {
    ensureLogDir();
    const fp = path.join(LOG_DIR, fileName);
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        ...record,
      }) + "\n";
    fs.appendFileSync(fp, line, "utf8");
  } catch (err) {
    console.error("[fileLogger]", err?.message ?? err);
  }
}

export function logBackendVerbose(component, message, extra = {}) {
  appendJsonLog("backend.log", { component, message, ...extra });
}

export function logClientEvents(events) {
  for (const ev of events) {
    appendJsonLog("frontend.log", {
      component: "client",
      level: ev.level ?? "info",
      message: ev.message ?? "event",
      url: ev.url,
      context: ev.context,
      stack: ev.stack,
      clientTs: ev.ts,
    });
  }
}
