/**
 * Deterministic content-policy filter for simulation drafts.
 * Blocks sensitive personal / HR / legal threat themes unsuitable for awareness drills.
 */

const RULES = [
  {
    id: "layoffs",
    reason: "Drafts about layoffs, RIFs, or job elimination are prohibited.",
    patterns: [
      /\blayoff/i,
      /\blaid[\s-]?off/i,
      /\breduction in force\b/i,
      /\bRIF\b/,
      /\bjob eliminat/i,
      /\bworkforce reduction\b/i,
    ],
  },
  {
    id: "compensation",
    reason: "Drafts about bonuses, salaries, or compensation are prohibited.",
    patterns: [
      /\bbonus(es)?\b/i,
      /\bcompensation\b/i,
      /\bsalary\b/i,
      /\bpay[\s-]?raise\b/i,
      /\bstock options?\b/i,
      /\bRSUs?\b/,
    ],
  },
  {
    id: "health_family",
    reason: "Drafts about health or family matters are prohibited.",
    patterns: [
      /\bmedical (leave|record|emergency)\b/i,
      /\bhealth insurance\b/i,
      /\bdiagnos(is|ed)\b/i,
      /\bfamily emergency\b/i,
      /\bsick leave\b/i,
      /\bhospitaliz/i,
    ],
  },
  {
    id: "bereavement",
    reason: "Drafts about bereavement or death are prohibited.",
    patterns: [/\bbereavement\b/i, /\bfuneral\b/i, /\bpassed away\b/i, /\bcondolence/i],
  },
  {
    id: "discipline",
    reason: "Drafts about employee discipline or termination proceedings are prohibited.",
    patterns: [
      /\bdisciplinary\b/i,
      /\bperformance improvement plan\b/i,
      /\bPIP\b/,
      /\btermination hearing\b/i,
      /\bwrite[\s-]?up\b/i,
    ],
  },
  {
    id: "legal_immigration",
    reason: "Drafts about legal action or immigration threats are prohibited.",
    patterns: [
      /\bdeport(ation|ed)?\b/i,
      /\bvisa (revok|cancel|expir)/i,
      /\bimmigration (status|enforcement)\b/i,
      /\blegal action against you\b/i,
      /\blawsuit against you\b/i,
      /\barrest warrant\b/i,
    ],
  },
];

export function checkContentPolicy(simulation) {
  const subject = String(simulation?.subject ?? "");
  const pretext = String(simulation?.pretext_type ?? "");
  const body = String(simulation?.body_html ?? "");
  const haystack = `${subject}\n${pretext}\n${body}`;

  for (const rule of RULES) {
    for (const re of rule.patterns) {
      if (re.test(haystack)) {
        return {
          allowed: false,
          ruleId: rule.id,
          reason: rule.reason,
        };
      }
    }
  }

  return { allowed: true, ruleId: null, reason: null };
}

export { RULES as CONTENT_POLICY_RULES };
