# Phish4Good — Hackathon PoC

Threat-to-Training pipeline on the existing Phish4Good stack (Preact + Fastify + in-memory/JSON). Dual mode:

1. **Threat-to-Training (Mode A)** — advisory → cohort → grounded exercise → validate → human approve → sandbox inbox → debrief  
2. **Personalized CASE (Mode B)** — synthetic CMDB employee → Gemini/mock simulation → policy → stage telemetry  

No real email is sent. Gemini is optional (`useGemini`); missing keys fall back to local templates.

## Demo script (M365 outage — ~5 minutes)

1. Run `pnpm install && pnpm run dev`. Open http://127.0.0.1:5173  
2. Stay on **Threat-to-Training**. Select `EVT-M365-2026-11`.  
3. Show mapped cohorts (`COH-ALL-STAFF`, `COH-HELPDESK`) and mapping reasons.  
4. Leave **Use Gemini** on (or off for offline mock). Click **Generate exercise**.  
5. Point out citations (`EX1550543`, 24-hour deadline), red flags, and validation pass.  
6. **Approve & deliver** → sandbox inbox fills with cohort members.  
7. **Simulate click** on one inbox row → debrief shows red flags + “verify via admin center”.  
8. Optional: switch to **Personalized CASE**, pick Marcus Thorne, generate with Gemini toggle.  

## Synthetic seeds

| File | Contents |
|------|----------|
| `backend/src/data/threatEvents.json` | M365 outage, nginx2root, php2shell, Java4Shell, Ruby2Shell |
| `backend/src/data/cohorts.json` | Role cohorts |
| `backend/src/data/cohortRules.json` | Product/tech → cohort rules |

Personnel in `mockCmdb.js` carry `cohortIds` for sandbox fan-out.

## Key APIs

- `GET /api/events`, `POST /api/events/ingest`  
- `GET /api/events/:id/cohorts`  
- `POST /api/exercises/generate` `{ eventId, cohortId, useGemini }`  
- `POST /api/exercises/:id/decide` `{ decision: approve|reject }`  
- `GET /api/inbox`, `POST /api/inbox/:id/click|report|debrief`  
- `GET /api/metrics`  
- Mode B: `POST /api/simulation/generate` `{ employeeId, useGemini }`  

## Safety

- Mode A prompts receive advisory + cohort only (no PII).  
- Validator blocks external links, credential solicitation, empty citations/red flags.  
- Approve is hard-gated on validation.  
- Aggregate metrics only (no individual scorecards in Mode A UI).  
