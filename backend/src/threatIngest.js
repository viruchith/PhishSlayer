import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");

/** Host suffixes allowed for manual ingest (demo-safe). */
export const SOURCE_ALLOWLIST = [
  "microsoft.com",
  "fortra.com",
  "mimecast.com",
  "calif.io",
  "verialabs.com",
  "synthetic.phish4good.local",
];

/** @type {object[]} */
let eventsStore = [];

function loadJson(name) {
  const raw = readFileSync(join(DATA_DIR, name), "utf8");
  return JSON.parse(raw);
}

export function seedFromDisk() {
  eventsStore = loadJson("threatEvents.json").map((e) => ({ ...e }));
  return eventsStore;
}

export function listEvents() {
  if (eventsStore.length === 0) seedFromDisk();
  return eventsStore;
}

export function getEvent(eventId) {
  return listEvents().find((e) => e.eventId === eventId) ?? null;
}

export function loadCohorts() {
  return loadJson("cohorts.json");
}

export function loadCohortRules() {
  return loadJson("cohortRules.json");
}

export function getCohort(cohortId) {
  return loadCohorts().find((c) => c.cohortId === cohortId) ?? null;
}

function normalizeUrl(url) {
  try {
    const u = new URL(String(url));
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return String(url ?? "").toLowerCase().trim();
  }
}

function hostAllowed(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase();
    return SOURCE_ALLOWLIST.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

/**
 * Manual ingest for live demo. Dedupes by eventId or source.url+title.
 * @param {object} body
 */
export function ingestEvent(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "INVALID_BODY", message: "Advisory body required" };
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const sourceUrl = body.source?.url ?? body.sourceUrl;
  if (!eventId || !title) {
    return { ok: false, error: "INVALID_BODY", message: "eventId and title required" };
  }
  if (!sourceUrl || !hostAllowed(sourceUrl)) {
    return {
      ok: false,
      error: "SOURCE_NOT_ALLOWLISTED",
      message: `Source URL host must be one of: ${SOURCE_ALLOWLIST.join(", ")}`,
    };
  }

  const existing = listEvents();
  const urlKey = normalizeUrl(sourceUrl);
  const dup = existing.find(
    (e) =>
      e.eventId === eventId ||
      (normalizeUrl(e.source?.url) === urlKey && String(e.title).toLowerCase() === title.toLowerCase()),
  );
  if (dup) {
    return { ok: false, error: "DUPLICATE", message: "Event already ingested", event: dup };
  }

  const event = {
    eventId,
    title,
    summary: typeof body.summary === "string" ? body.summary : title,
    publishedAt: body.publishedAt || new Date().toISOString(),
    source: {
      name: body.source?.name || "Manual ingest",
      url: String(sourceUrl),
      allowlisted: true,
    },
    products: Array.isArray(body.products) ? body.products : [],
    technologies: Array.isArray(body.technologies) ? body.technologies : [],
    keyFacts: Array.isArray(body.keyFacts) ? body.keyFacts : [],
    suggestedPretexts: Array.isArray(body.suggestedPretexts) ? body.suggestedPretexts : [],
    verifyOfficiallyDefault:
      typeof body.verifyOfficiallyDefault === "string"
        ? body.verifyOfficiallyDefault
        : "Verify through official internal channels; do not use links from unexpected messages.",
  };

  eventsStore.unshift(event);
  return { ok: true, event };
}

// Seed on module load
seedFromDisk();
