/**
 * Buffers client-side verbose events and POSTs them to `/api/client-log`
 * so they are appended to `logs/frontend.log` by the backend.
 */

const buffer = [];
let flushTimer = null;
const MAX_BUFFER = 120;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushNow, 450);
}

async function flushNow() {
  flushTimer = null;
  if (!buffer.length) return;
  const batch = buffer.splice(0, 80);
  try {
    const res = await fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
    if (!res.ok) {
      buffer.unshift(...batch);
    }
  } catch {
    buffer.unshift(...batch);
  }
}

/**
 * @param {"debug"|"info"|"warn"|"error"} level
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function clientVerboseLog(level, message, context = {}) {
  const row = {
    ts: new Date().toISOString(),
    level,
    message,
    context,
    url: typeof globalThis.location !== "undefined" ? globalThis.location.href : "",
  };
  if (import.meta.env?.DEV) {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.debug;
    fn.call(console, "[PhishSlayer]", message, context);
  }
  buffer.push(row);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  scheduleFlush();
}

export function flushClientLogsSync() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!buffer.length) return;
  const body = JSON.stringify({ events: [...buffer] });
  buffer.length = 0;
  try {
    fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("pagehide", flushClientLogsSync);
  globalThis.addEventListener("beforeunload", flushClientLogsSync);
}
