import { getCohort, loadCohortRules, loadCohorts } from "./threatIngest.js";

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim();
}

/**
 * Rule-based event → cohort mapping (no individual profiling).
 * @param {object} event
 * @returns {{ cohortIds: string[], reasons: { ruleId: string, cohortId: string, reason: string }[], cohorts: object[] }}
 */
export function mapEventToCohorts(event) {
  const rules = loadCohortRules();
  const products = new Set((event?.products ?? []).map(norm));
  const technologies = new Set((event?.technologies ?? []).map(norm));

  const cohortIds = new Set();
  const reasons = [];

  for (const rule of rules) {
    const matchProducts = rule.match?.products ?? [];
    const matchTechs = rule.match?.technologies ?? [];
    const productHit = matchProducts.some((p) => products.has(norm(p)));
    const techHit = matchTechs.some((t) => technologies.has(norm(t)));
    if (!productHit && !techHit) continue;

    for (const cohortId of rule.cohortIds ?? []) {
      cohortIds.add(cohortId);
      reasons.push({
        ruleId: rule.ruleId,
        cohortId,
        reason: rule.reason,
      });
    }
  }

  // Fallback: suggestedPretexts on the event itself
  for (const sp of event?.suggestedPretexts ?? []) {
    if (sp.cohortId) {
      cohortIds.add(sp.cohortId);
      if (!reasons.some((r) => r.cohortId === sp.cohortId)) {
        reasons.push({
          ruleId: "SUGGESTED_PRETEXT",
          cohortId: sp.cohortId,
          reason: sp.pretextHint || "Suggested on the advisory seed",
        });
      }
    }
  }

  const ids = [...cohortIds];
  const cohorts = ids.map((id) => getCohort(id)).filter(Boolean);

  return { cohortIds: ids, reasons, cohorts };
}

export function listAllCohorts() {
  return loadCohorts();
}
