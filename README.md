# PHISH SLAYER

Can an LLM, grounded in internal asset context, produce more realistic phishing simulations and better training debriefs — with a human reviewing everything?

**Status:** Proof of concept / research idea. Not production software.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CI](https://github.com/viruchith/PhishSlayer/actions/workflows/ci.yml/badge.svg)](https://github.com/viruchith/PhishSlayer/actions/workflows/ci.yml)

## The idea

Generic phishing templates cause pattern fatigue: people learn “Password expired” and “HR policy update,” not how real attackers work. Real attackers use context — project names, tools, colleagues. This repo explores whether a synthetic CMDB plus an LLM can generate simulations that stay grounded in that metadata, while a human analyst must approve every draft before anything is staged. Nothing is sent to real recipients.

## See it in action

![Demo placeholder](docs/demo.gif)

<!-- TODO (maintainer): record a short demo GIF of generate → review → stage and replace docs/demo.gif -->

**Generic template** vs **context-grounded draft** (fields taken from the synthetic CMDB for `EMP-1002` / Marcus Thorne — `PRJ-TACHYON-SRE`):

| | Generic | Context-grounded (CMDB-anchored) |
|---|---|---|
| Subject | Password Expired — Action Required | `[SIMULATION] DataDog: alert.prod.db.latency on Tachyon Payments Edge` |
| Body | “Your password expires in 24 hours. Click here to reset.” | Mock body cites `PRJ-TACHYON-SRE`, monitor `alert.prod.db.latency`, file `deployment_manifest.yaml`, and Marcus Thorne’s role |
| Grounding | None | Produced by the mock generator; verified with `pnpm run check-grounding` (see `docs/GROUNDING_CHECK_EXAMPLE.txt`) |

Narrative scenario write-ups: [EXAMPLES.md](./EXAMPLES.md). Re-verify locally with `pnpm run check-grounding`.

## What the PoC does / does not do

**Does**

- Synthetic CMDB (fictional employees, projects, assets)
- Mock MCP context route (`GET /api/mcp/context/:employeeId`)
- Gemini generation with automatic mock fallback (no API key required)
- Analyst review dashboard (edit / approve / discard)
- In-memory telemetry staging (cleared on process restart)

**Does not**

- Send email, Slack, Teams, or any real messages
- Connect to real CMDBs or identity systems
- Persist data to a database
- Authenticate users
- Measure real behavior change

## Quick start

Requires Node.js 20+ and [pnpm](https://pnpm.io/) (`corepack enable`).

```bash
pnpm install
pnpm run dev
```

- Frontend: http://127.0.0.1:5173  
- Backend health: http://127.0.0.1:8787/api/health  

Optional: copy [`.env.example`](./.env.example) to `.env` and set `GEMINI_API_KEY`. Without a key, generation uses the local mock scenario end-to-end.

Other scripts: `pnpm run lint` · `pnpm run test` · `pnpm run build` · `pnpm run check-grounding`

## Open questions / hypotheses

- Do context-grounded lures change report/click behavior vs well-made generic lures?
- Does a specific debrief (“here is the verifiable red flag”) beat generic training?
- Does grounding reduce LLM hallucination of internal details, and can that be checked automatically?
- Is a CMDB the right context source, or are trackers / directories / calendars better?
- Where does personalization cross ethical lines?

See [docs/HYPOTHESES.md](./docs/HYPOTHESES.md) for a lightweight evaluation protocol.

## Limitations and responsible use

All employees and assets in this repo are synthetic. Do not run simulations against real people without explicit organizational authorization. Employee-monitoring and privacy laws (and works-council rules) vary by jurisdiction; this project is not legal advice. See [docs/RESPONSIBLE_USE.md](./docs/RESPONSIBLE_USE.md) and [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md).

## Docs

- [Concept & design exploration](./docs/CONCEPT.md)
- [MCP notes (PoC mock)](./MCP_ARCHITECTURE.md)
- [Scenario examples](./EXAMPLES.md)
- [Backend runbook](./backend/README.md) · [Frontend runbook](./frontend/README.md)

Licensed under [GPL-3.0](./LICENSE). The maintainer may revisit licensing later.
