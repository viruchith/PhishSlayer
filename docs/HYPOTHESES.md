# Hypotheses (open research protocol)

Aligned with the [Phish4Good hackathon proposal](../Phish4Good_HackathonProposal.md). No results are claimed in this repository. Each item is a **testable question** for authorized pilots with synthetic or consented data and a pre-registered plan.

The product thesis: train at the speed of attackers by turning trusted advisories into safe, cohort-relevant exercises — without becoming a better phishing kit.

---

### H1 — Faster time-to-training while the pretext is live

**Claim:** An advisory- or event-driven pipeline (ingest → cohort → generate → validate → approve) produces usable exercises in hours rather than weeks, so employees practice against a pretext while it is still circulating (e.g. M365 outage lures within a day of the disruption).

**Why it might be wrong:** Reviewer backlog dominates; quality edits erase speed gains; attackers move on before any cohort finishes the exercise.

**How to test:** Measure wall-clock from advisory publish (or seed ingest) to first approved exercise for fixed events (M365, Java4Shell, Ruby2Shell). Compare against historical hand-built simulation lead times. Do not treat this PoC’s click-through demo as production throughput.

---

### H2 — Role-relevant (cohort) exercises beat one-size-fits-all modules

**Claim:** Mapping events to role cohorts (platform vs all-staff vs app-dev) improves recognition and report rates versus the same generic module sent to everyone.

**Why it might be wrong:** Cohort rules are too coarse; employees hold multiple roles; novelty of any new content dominates mapping quality.

**How to test:** Authorized A/B by cohort assignment for the same triggering event (e.g. Java4Shell → platform vs all-staff control). Pre-register primary metric (report rate or correct “verify officially” choice). Prefer aggregate cohort reporting — no individual scorecards.

---

### H3 — Verification-habit debriefs beat click-shame pages

**Claim:** A debrief that shows *this* message’s red flags and explicit official verification steps improves short-term verification behavior more than a generic “you clicked a phish” page.

**Why it might be wrong:** Attention and fatigue swamp content differences; one-shot effects do not persist; employees skip the modal.

**How to test:** Randomize debrief style after a simulated sandbox click; measure immediate quiz / next-exercise “verify via official channel” choices; optional delayed follow-up. Keep debriefs non-punitive (proposal: teach verification, not humiliation).

---

### H4 — Grounding + policy validation keep automation safe enough to use

**Claim:** Requiring cited advisory facts, sandbox-only links, no credential solicitation, and mandatory human approval lets teams use LLM generation without releasing unreviewed or invented content.

**Why it might be wrong:** Models paraphrase citations; keyword policy is shallow; reviewers rubber-stamp; attackers copy successful patterns outside the tool.

**How to test:** Score generated drafts with the PoC validator (`exerciseValidator`) plus human review on a fixed advisory set; track false accepts (ungrounded CVE/incident IDs, external URLs) and false rejects. Mode B: keep using `pnpm run check-grounding` for CMDB hallucination checks.

---

### H5 — Aggregate cohort metrics show behavior change without individual profiling

**Claim:** Tracking click / report / debrief (“verified”) rates **by cohort** after each exercise is enough to see whether habits improve, without per-person adaptive difficulty or scorecards.

**Why it might be wrong:** Small cohorts are noisy; Hawthorne effects; managers demand individual ranking anyway.

**How to test:** Pre-register cohort-level metrics matching `/api/metrics`; run repeated exercises on the same cohorts; analyze trends only in aggregate. Document a hard ban on individual risk scores unless a separate ethics/labor review approves it.

---

### H6 — Where personalization (Mode B CASE) crosses ethical lines

**Claim:** Optional CMDB-grounded personalization stays acceptable when limited to professional allowlisted fields, content-policy gates, and human review — and when Mode A remains the default for org-wide event training.

**Why it might be wrong:** Professional context still coerces (fake exec pressure); cultural and labor norms differ; gates are keyword-shallow.

**How to test:** Red-team the policy filter; works-council / privacy review of example drafts; document prohibited scenarios (see [RESPONSIBLE_USE.md](./RESPONSIBLE_USE.md)). Do not profile individuals for “difficulty” without a separate ethics review.
