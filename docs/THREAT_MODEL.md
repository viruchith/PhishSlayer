# Threat model (lightweight)

**Scope:** the local Phish4Good hackathon proof of concept (Threat-to-Training pipeline + optional CASE mode). Not a formal STRIDE assessment or certification artifact.

**Aligned with:** [Phish4Good_HackathonProposal.md](../Phish4Good_HackathonProposal.md) §2.3 and §3.3 (why automation alone is risky; safety guardrails).

**What it tries to protect (in a real deployment of the *idea*):**

- Employees from poorly designed, unethical, or over-realistic simulations  
- Organizations from leaking personal or internal data into model prompts  
- The public from misuse of the generator as a real spear-phishing or exploit-delivery aid  
- Cohort privacy — aggregate outcomes, not individual scorecards  

**Who could misuse it:** a curious insider feeding real advisories + org charts into prompts; an attacker who copies successful exercise patterns; a well-meaning trainer who personalizes past ethical lines or skips human approval.

---

## Risks

| Risk | Why it matters | PoC mitigation | Status |
|------|----------------|----------------|--------|
| Use as a real phishing / lure kit | Same narrative patterns can harm real people | Synthetic data; sandbox delivery only; no credential capture; no external send; defender-focused debrief; responsible-use docs | **Implemented (PoC)** — soft controls; copy-paste misuse still possible |
| Ungrounded / hallucinated “facts” in exercises | Invented CVEs or incident IDs teach the wrong lesson and erode trust | Citations required; event vocabulary grounding; approve blocked if validation fails | **Implemented (PoC)** for Mode A validator |
| External / live malicious links in drafts | Turns training into a drive-by risk | Sandbox-host / relative-link allow-list; validator rejects other `http(s)` hrefs | **Implemented (PoC)** |
| Credential or payment capture in exercises | Training must never harvest secrets | Content heuristics + validator rules; no login forms in delivery UI | **Implemented (PoC)** — keyword/heuristic depth only |
| Personal data in Mode A prompts | Privacy and labor-law exposure | Mode A prompts = advisory + cohort description only; cohort targeting, not individuals | **Implemented (PoC)** |
| Mode B CMDB leakage to LLM provider | Professional metadata and provider logs | Field allowlist; PII strip in mock bridge; optional key + mock fallback; advise local models | **Implemented (PoC)** for allowlist/strip; provider terms outside our control |
| Prompt injection via advisory or CMDB fields | Malicious text could steer the model | Untrusted delimiters; control-char strip; length caps; treat values as data | **Implemented (PoC)** — shallow hygiene |
| Skipping human approval | Automation-alone risk called out in the proposal | Approve API hard-gated on validation; UI requires decide step before inbox fan-out | **Implemented (PoC)** — no auth on who “approves” |
| Individual profiling / adaptive pressure | Privacy, trust, and labor-law harm | Aggregate `/api/metrics` by cohort; concept/hypotheses warn against individual scores | **Documented**; adaptive difficulty **Idea only** |
| Trauma / HR-crisis content | Harmful “training” and legal exposure | Deterministic content-policy filter; human approval | **Implemented (PoC)** — keyword filter only |
| Mistaken belief the tool is production-ready | Unsafe deployment (open ports, real people, real mail) | Explicit PoC status in README / proposal / concept | **Implemented (docs)** |
| LLM provider data handling | Cloud APIs may log or train per their terms | Optional key; mock fallback; docs state provider terms apply | **Documented** |

---

## Trust boundaries (PoC)

```text
[Browser UI]
    |  HTTP (no auth)
    v
[Fastify API]
    |--> [JSON advisory seeds + allow-listed ingest]
    |--> [cohort mapper]
    |--> [Gemini or mock] --Mode A--> [exercise validator] --> [approval store]
    |                                              | approve
    |                                              v
    |                                         [sandbox inbox] --> [debrief / aggregate metrics]
    |
    |--> [synthetic CMDB] --Mode B--> [allowlist + sanitize] --> [Gemini or mock] --> [content policy] --> [telemetry]
```

There is **no authentication boundary**: anyone who can reach the local ports can generate, approve, and open the sandbox inbox. That is acceptable only for **local demo on synthetic data**.

---

## Design constraints (from the proposal)

Any credible Threat-to-Training system must be:

1. **Grounded** in trusted sources (not free-form “news to phish”)  
2. **Constrained** by privacy and safety policy before a human sees the draft  
3. **Controlled** by a human approver before anything is delivered  
4. **Defender-focused** — red flags + official verification, not attack kits  

The PoC encodes these as product requirements; it does not claim they are sufficient for production.

---

## Out of scope for this document

Enterprise IdP, mTLS, immutable multi-tenant audit ledgers, live feed threat intel pipelines, and red-team certification of the policy filter. See [CONCEPT.md](./CONCEPT.md) “If this were taken further.”
