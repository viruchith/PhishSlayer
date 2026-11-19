# Phish4Good

Open-source **Threat-to-Training** platform: convert trusted cyber advisories and real-world events into safe, role-relevant security exercises — with grounding, policy validation, and mandatory human approval.

**Tagline:** Training at the speed of attackers.

**Status:** Hackathon proof of concept. Not production software. Goal is defender training, not better phishing.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CI](https://github.com/viruchith/Phish4Good/actions/workflows/ci.yml/badge.svg)](https://github.com/viruchith/Phish4Good/actions/workflows/ci.yml)

## The problem

Attackers weaponize outages, CVEs, and breaches within hours. Annual awareness modules cannot keep pace, and the same generic content rarely matches the pretext each role actually faces. Hand-built simulations arrive after the attacker’s window has closed.

## The idea

**Phish4Good** turns a trusted advisory or event into a cohort-relevant exercise in hours instead of weeks:

1. **Ingest** — store the advisory with its source link (allow-listed)  
2. **Identify cohorts** — map product/technology → role groups (no individual profiling)  
3. **Generate** — draft a simulation grounded in cited facts + red flags (Gemini optional; mock fallback)  
4. **Validate** — privacy, safety, grounding, and sandbox-link checks  
5. **Human approval** — approve / edit / reject; nothing ships without a reviewer  
6. **Deliver** — sandboxed inbox only (no real email); clicks recorded; no credentials collected  
7. **Debrief** — how the pretext worked, red flags, and how to verify via official channels  

Optional **Mode B (CASE)** still explores CMDB-personalized drafts for technical audiences.

Full problem statement and outcomes: [Phish4Good_HackathonProposal.md](./Phish4Good_HackathonProposal.md).

## Worked examples (seeded in the PoC)

| Triggering event | Cohort | Pretext the exercise models | Verify officially |
|---|---|---|---|
| Microsoft 365 outage (Nov 2026) | All staff / helpdesk | Fake service-health “Restore Messages” lure citing `EX1550543` | M365 admin center or internal IT status — never the email link |
| nginx2root | Platform / DevOps / SRE | Fake urgent mitigation download | Vendor advisory + internal patch process |
| php2shell | App developers / hosting | Fake hotfix / failed-scan package | Official package source + security ticket queue |
| Java4Shell (CVE-2026-114938) | Platform + JVM app teams | Fake OpenJDK / scanner hotfix | [calif.io/java4shell](https://calif.io/java4shell) + internal patch management |
| Ruby2Shell | Rails/Sinatra + self-hosted Ruby stacks | Fake emergency Ruby upgrade package | [verialabs.com/ruby2shell](https://verialabs.com/ruby2shell/) + change control |

## See it in action

![Demo placeholder](docs/demo.gif)

<!-- TODO (maintainer): record a short demo GIF of Threat-to-Training pipeline and replace docs/demo.gif -->

**Demo path:** Threat-to-Training tab → `EVT-M365-2026-11` → generate → validate → approve → sandbox click → debrief. Step-by-step: [docs/PHISH4GOOD_POC.md](./docs/PHISH4GOOD_POC.md).

## What the PoC does / does not do

**Does**

- Seeded advisories (M365, nginx2root, php2shell, Java4Shell, Ruby2Shell) + rule-based cohort mapping  
- End-to-end Mode A pipeline: generate → validate → approve → sandbox inbox → debrief + aggregate metrics  
- Grounded generation with citations / red flags / `verifyOfficially` (Gemini toggle + mock fallback)  
- Deterministic policy + grounding + sandbox-link validation (hard gate on approve)  
- Optional Mode B: synthetic CMDB + Gemini/mock personalized CASE drafts  
- In-memory stores only (cleared on process restart)

**Does not**

- Send email, Slack, Teams, or any real messages  
- Live web scrapers or real CMDB / IdP connectors  
- Persist to PostgreSQL (proposal future; PoC is JSON/memory)  
- Authenticate users / RBAC / immutable production audit ledger  
- Collect credentials or ship reusable attack kits  

## Quick start

Requires Node.js 20+ and [pnpm](https://pnpm.io/) (`corepack enable`).

```bash
pnpm install
pnpm run dev
```

- Frontend: http://127.0.0.1:5173  
- Backend health: http://127.0.0.1:8787/api/health  

Optional: copy [`.env.example`](./.env.example) to `.env` and set `GEMINI_API_KEY` (default model `gemini-3.5-flash-lite`). Without a key, generation uses local mock templates end-to-end.

Other scripts: `pnpm run lint` · `pnpm run test` · `pnpm run build` · `pnpm run check-grounding`

## Open questions / hypotheses

- Does event-driven training shrink time-to-exercise vs calendar modules while a pretext is still live?  
- Do cohort-mapped pretexts improve recognition vs one-size-fits-all content?  
- Do red-flag + “verify officially” debriefs build verification habits better than click-shame pages?  
- Do grounding + policy gates keep automation safe enough for human approvers to trust?  
- Where does personalization (Mode B) cross ethical lines?

See [docs/HYPOTHESES.md](./docs/HYPOTHESES.md).

## Safety & responsible use

- **Grounded, not invented** — claims must cite the advisory; unsupported drafts fail validation  
- **Safe by construction** — sandbox links only; no credential capture; no external send  
- **Privacy-preserving** — Mode A is cohort-level; aggregate metrics, not individual scorecards  
- **Human in the loop** — every release needs approval  
- **Defender-focused** — training content with debrief, not attack kits  

All employees and assets in this repo are synthetic. Do not run simulations against real people without explicit organizational authorization. See [docs/RESPONSIBLE_USE.md](./docs/RESPONSIBLE_USE.md) and [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md).

## Docs

- [Hackathon proposal](./Phish4Good_HackathonProposal.md)  
- [PoC demo script + API map](./docs/PHISH4GOOD_POC.md)  
- [Concept & design](./docs/CONCEPT.md)  
- [Hypotheses](./docs/HYPOTHESES.md) · [Threat model](./docs/THREAT_MODEL.md) · [Responsible use](./docs/RESPONSIBLE_USE.md)  
- [MCP notes](./MCP_ARCHITECTURE.md) · [Scenario examples](./EXAMPLES.md)  
- [Backend](./backend/README.md) · [Frontend](./frontend/README.md)  

Licensed under [GPL-3.0](./LICENSE).
