# Hypotheses (open research protocol)

No results are claimed in this repository. Each item is a **testable question** someone could study with authorization, synthetic or consented data, and a pre-registered plan.

---

### H1 — Context-grounded lures vs strong generic lures

**Claim:** Simulations that cite verifiable CMDB anchors (project IDs, tool monitors, file names) change report/click behavior compared with well-made generic templates.

**Why it might be wrong:** Employees may already ignore both; novelty of any new format may dominate; generics can be highly polished.

**How to test:** Authorized A/B (or within-subject) pilot; matched urgency/length; same delivery channel; pre-register primary metric (e.g. report rate); compare grounded vs generic arms. Do not treat this PoC’s in-memory toggles as evidence.

---

### H2 — Specific debrief vs generic training

**Claim:** A short debrief that points to the *verifiable* red flag in *this* message improves short-term recognition more than a generic “you clicked a phish” page.

**Why it might be wrong:** Attention and fatigue may swamp content differences; one-shot effects may not persist.

**How to test:** Randomize debrief style after a simulated click; measure immediate quiz / next-simulation performance; optional delayed follow-up. Keep debriefs non-punitive.

---

### H3 — Grounding reduces hallucinated internal detail

**Claim:** Constraining the model to allowlisted CMDB fields, then checking drafts against the source record, catches invented project IDs, file names, tools, and people.

**Why it might be wrong:** Models paraphrase or truncate IDs; fuzzy matches create false fails; checkers miss near-miss hallucinations.

**How to test:** Run `pnpm run check-grounding` (mock provider) as a baseline; with a live model, sample N drafts per employee, score automatic check vs human review of mismatches.

---

### H4 — Is CMDB the right context source?

**Claim:** CMDB/asset metadata is a useful grounding source for technical audiences; other sources (project trackers, directories, calendars) may be better for some roles.

**Why it might be wrong:** CMDB data is stale or irrelevant to day-to-day mail; calendar/ticket context may feel more “real” and riskier ethically.

**How to test:** Blind plausibility ratings by practitioners for drafts grounded in different sources; track which anchors analysts keep vs edit away.

---

### H5 — Where personalization crosses ethical lines

**Claim:** Policy gates (no layoffs, compensation, health/family, bereavement, discipline, legal/immigration threats) plus human review keep personalization on the acceptable side of training use.

**Why it might be wrong:** Professional context can still coerce (fake exec pressure); cultural norms and labor law differ; gates are keyword-shallow.

**How to test:** Red-team the policy filter; works-council / privacy review of example drafts; document prohibited scenarios (see [RESPONSIBLE_USE.md](./RESPONSIBLE_USE.md)). Do not profile individuals for “difficulty” without a separate ethics review.
