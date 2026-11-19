import { checkContentPolicy } from "./contentPolicy.js";

const SANDBOX_HOSTS = ["localhost", "127.0.0.1", "synthetic.phish4good.local"];
const CREDENTIAL_RE =
  /\b(password|passwd|credit[\s-]?card|ssn|social security|enter your (credentials|password)|login form)\b/i;
const EXTERNAL_HREF_RE = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;

/**
 * Collect citation / fact vocabulary from an advisory event.
 */
export function collectEventVocabulary(event) {
  const labels = new Set();
  const claims = new Set();
  for (const fact of event?.keyFacts ?? []) {
    if (fact.citationLabel) labels.add(String(fact.citationLabel));
    if (fact.claim) claims.add(String(fact.claim));
  }
  if (event?.title) claims.add(event.title);
  if (event?.eventId) labels.add(event.eventId);
  return { labels, claims };
}

/**
 * Grounding for Mode A: citations must reference event keyFacts labels,
 * and body should not invent unrelated CVE/incident IDs.
 */
export function checkEventGrounding(exercise, event) {
  const failures = [];
  const vocab = collectEventVocabulary(event);
  const citations = Array.isArray(exercise?.citations) ? exercise.citations : [];

  if (citations.length === 0) {
    failures.push({ kind: "citations", value: null, detail: "at least one citation required" });
  }

  for (const c of citations) {
    const label = typeof c === "string" ? c : c?.label || c?.citationLabel || "";
    if (!label) {
      failures.push({ kind: "citations", value: c, detail: "empty citation" });
      continue;
    }
    const ok = [...vocab.labels].some(
      (l) => l.toLowerCase() === label.toLowerCase() || label.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(label.toLowerCase()),
    );
    if (!ok) {
      failures.push({
        kind: "citations",
        value: label,
        detail: "citation not found in event keyFacts",
      });
    }
  }

  // Flag invented CVE / incident tokens not in vocabulary
  const text = `${exercise?.subject ?? ""}\n${exercise?.body_html ?? ""}`;
  const cveHits = text.match(/\bCVE-\d{4}-[A-Z0-9]+\b/gi) ?? [];
  const incidentHits = text.match(/\bEX\d{6,}\b/g) ?? [];
  for (const token of [...cveHits, ...incidentHits]) {
    const inVocab = [...vocab.labels, ...vocab.claims].some((v) =>
      String(v).toUpperCase().includes(token.toUpperCase()),
    );
    if (!inVocab) {
      failures.push({
        kind: "ungrounded_token",
        value: token,
        detail: "identifier not present in advisory keyFacts",
      });
    }
  }

  return { ok: failures.length === 0, failures };
}

function isSandboxUrl(href) {
  const h = String(href).trim();
  if (h.startsWith("#") || h.startsWith("/")) return true;
  if (h === "#" || h.toLowerCase().startsWith("javascript:")) return false;
  try {
    const u = new URL(h, "http://synthetic.phish4good.local");
    if (u.protocol === "http:" || u.protocol === "https:") {
      return SANDBOX_HOSTS.some((host) => u.hostname === host || u.hostname.endsWith(`.${host}`));
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Full Mode A exercise validation (policy + grounding + safety).
 */
export function validateExercise(exercise, event) {
  const checks = [];

  const policy = checkContentPolicy(exercise);
  checks.push({
    id: "content_policy",
    ok: policy.allowed,
    detail: policy.allowed ? null : policy.reason,
    ruleId: policy.ruleId,
  });

  const grounding = checkEventGrounding(exercise, event);
  checks.push({
    id: "grounding",
    ok: grounding.ok,
    detail: grounding.ok ? null : grounding.failures,
  });

  const redFlags = Array.isArray(exercise?.redFlags) ? exercise.redFlags : [];
  checks.push({
    id: "red_flags",
    ok: redFlags.length > 0,
    detail: redFlags.length > 0 ? null : "redFlags must be non-empty",
  });

  const verify =
    typeof exercise?.verifyOfficially === "string" ? exercise.verifyOfficially.trim() : "";
  checks.push({
    id: "verify_officially",
    ok: verify.length > 0,
    detail: verify.length > 0 ? null : "verifyOfficially required",
  });

  const body = String(exercise?.body_html ?? "");
  const subject = String(exercise?.subject ?? "");
  const hay = `${subject}\n${body}`;

  if (CREDENTIAL_RE.test(hay)) {
    checks.push({
      id: "no_credential_capture",
      ok: false,
      detail: "Draft appears to solicit credentials or payment data",
    });
  } else {
    checks.push({ id: "no_credential_capture", ok: true, detail: null });
  }

  const badHrefs = [];
  let m;
  const re = new RegExp(EXTERNAL_HREF_RE.source, EXTERNAL_HREF_RE.flags);
  while ((m = re.exec(body)) !== null) {
    if (!isSandboxUrl(m[1])) badHrefs.push(m[1]);
  }
  checks.push({
    id: "sandbox_links_only",
    ok: badHrefs.length === 0,
    detail: badHrefs.length === 0 ? null : { badHrefs },
  });

  const allowed = checks.every((c) => c.ok);
  return {
    allowed,
    checks,
    contentPolicy: policy,
    grounding,
  };
}
