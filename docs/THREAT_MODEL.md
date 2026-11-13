# Threat model (lightweight)

**Scope:** the local PHISH SLAYER proof of concept. Not a formal STRIDE assessment or certification artifact.

**What it tries to protect (in a real deployment of the *idea*):** employees from poorly designed or unethical simulations; organizations from leaking internal metadata into model prompts or generated text; the public from misuse of the generator as a real spear-phishing aid.

**Who could misuse it:** a curious insider running the generator against real CMDB exports; an attacker who copies prompts/patterns; a well-meaning trainer who personalizes past ethical lines.

---

## Risks

| Risk | Why it matters | PoC mitigation | Status |
|------|----------------|----------------|--------|
| Use as a real spear-phishing generator | Same techniques can harm real people | Synthetic CMDB only; no dispatch code; README/status labeling; responsible-use docs | **Implemented (PoC)** — soft controls; not a hard prevention of copy-paste misuse |
| Leaking internal data through prompts or generated text | CMDB fields and LLM provider logs may retain content | Field allowlist; PII strip in mock bridge; prompt boundary; advise local models for sensitive data | **Implemented (PoC)** for allowlist/strip; provider terms remain outside our control |
| Prompt injection via asset / CMDB fields | Malicious values could steer the model | Delimiters, control-char strip, length caps; treat values as data | **Implemented (PoC)** — shallow hygiene, not a full injection defense |
| Per-person profiling / adaptive pressure | Privacy and labor-law harm; trust erosion | No adaptive difficulty in PoC; concept doc warns against individual scoring | **Idea only** for any future adaptive system; **documented** concern |
| LLM provider data handling | Cloud APIs may log or train per their terms | Optional key; mock fallback; docs state provider terms apply | **Documented**; not contractually controlled by this repo |
| Content that exploits trauma or HR crises | Harmful “training” and legal exposure | Deterministic policy filter; human approval; blocked drafts cannot stage | **Implemented (PoC)** — keyword filter only |
| Mistaken belief the tool is production-ready | Unsafe deployment assumptions | Explicit PoC status in README and concept docs | **Implemented (docs)** |

---

## Trust boundaries (PoC)

```text
[Browser UI] --HTTP--> [Fastify API] --> [synthetic CMDB]
                              |--> [allowlist + sanitize] --> [Gemini or mock]
                              |--> [content policy] --> [in-memory telemetry]
```

There is no authentication boundary: anyone who can reach the local ports can generate and stage. That is acceptable only because the intended use is **local demo on synthetic data**.

---

## Out of scope for this document

Enterprise IdP, mTLS, immutable audit ledgers, and red-team certification of the policy filter. See [CONCEPT.md](./CONCEPT.md) “If this were taken further.”
