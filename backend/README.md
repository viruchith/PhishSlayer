# PHISH SLAYER — Backend (Fastify)

Node.js **Fastify** service for the PHISH SLAYER proof-of-concept: **read-only mock CMDB**, simulated **MCP context** bridge, **Google Gemini** narrative generation (with offline mock fallback), **human-in-the-loop** staging metadata, and **verbose JSON file logging**.

This package is **`phish-slayer-backend`** in the pnpm monorepo ([`../pnpm-workspace.yaml`](../pnpm-workspace.yaml), root [`../package.json`](../package.json)).

---

## Requirements

- **Node.js** 18+ (ES modules, `node --watch` for dev) and [**pnpm**](https://pnpm.io/installation) (`corepack enable` matches the root `packageManager` pin)
- Network access to `generativelanguage.googleapis.com` when using Gemini (optional for PoC; mock fallback works without a key)

---

## Install & run

From the **repository root** (recommended):

```bash
pnpm install
pnpm run dev:backend
```

Or from **`backend/`**:

```bash
pnpm install
pnpm run dev
```

| Script | Command | Purpose |
|--------|---------|---------|
| **dev** | `node --watch src/index.js` | Run server; restart on file changes |
| **start** | `node src/index.js` | Production-style run (no watch) |

**Default bind:** `HOST=0.0.0.0`, **`PORT=8787`** (override with env).

**Listen URL:** `http://127.0.0.1:8787` (or your `HOST`/`PORT`).

---

## Environment variables

Loaded at startup (and refreshed on demand) via **`src/loadEnv.js`**. Candidate files (**merged in order; later overrides earlier**):

1. `<repo>/.env`
2. `<repo>/backend/.env`
3. `process.cwd()/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| **`GEMINI_API_KEY`** | No* | Google AI Studio / Generative Language API key |
| **`GOOGLE_API_KEY`** | No* | Alias for the same key if you prefer Google’s naming |
| **`PORT`** | No | HTTP port (default `8787`) |
| **`HOST`** | No | Bind address (default `0.0.0.0`) |
| **`GEMINI_MODEL`** | No | Model id (default `gemini-2.5-flash`) |
| **`GEMINI_MAX_OUTPUT_TOKENS`** | No | Max output tokens (default `8192`, cap `32768`) |

\*If missing or invalid, **`POST /api/simulation/generate`** still returns **`200`** with a **local mock** scenario so the UI stays testable.

**Security:** Never commit real `.env` files. Keys are not written to verbose logs.

---

## Implementation map (`src/`)

| File | Role |
|------|------|
| **`index.js`** | Fastify app: CORS, HTTP hooks (request/response logging), route registration, `listen` |
| **`loadEnv.js`** | Merge `.env` files from fixed absolute paths + `reloadEnvFromDisk()`; `getEnvDiagnostics()`; exports `mergedEnvSources`, `repoRoot` |
| **`fileLogger.js`** | Append **JSON lines** to `<repo>/logs/backend.log` and `<repo>/logs/frontend.log`; exports `LOG_DIR`, `logBackendVerbose`, `logClientEvents` |
| **`mockCmdb.js`** | In-memory synthetic CMDB: company, personnel (incl. emotional/tech hooks), projects, assets |
| **`mcpBridge.js`** | **`buildMcpContextPayload(employeeId)`** — strip PII, merge projects/assets/peers, build **`contextualAnchors`** |
| **`geminiService.js`** | **`generateSimulationFromContext`**, **`isGeminiKeyConfigured`**; Gemini JSON generation + fallbacks |

**Boot order:** `index.js` imports `loadEnv.js` (side effects run first), then other modules. `geminiService` calls **`reloadEnvFromDisk()`** before each generation so `.env` edits are picked up without a full process restart (still restart if you change code).

---

## HTTP API

Base path: **`/api`**. All JSON bodies should use **`Content-Type: application/json`**.

### `GET /api/health`

Liveness + configuration hints.

**Response (example shape):** `ok`, `service`, `geminiKeyConfigured`, `envSources`, `envDiagnostics`, `verboseLogDir` (absolute `logs/` path), `envFileHint`.

### `GET /api/employees`

List selectable employees for the dashboard.

### `GET /api/employees/:employeeId/profile`

CMDB-style profile for UI: employee summary, **`activeProjects`**, **`cloudProviders`** (linked integrations), peers, linked assets, **`contextualAnchors`**.

### `GET /api/mcp/context/:employeeId`

Simulated **read-only MCP** payload (PII-stripped **`subject`**, projects, assets, org context, anchors). **`404`** if unknown id.

### `POST /api/simulation/generate`

**Body:** `{ "employeeId": "EMP-1001" }`

**Behavior:** Builds MCP payload → Gemini (or mock) → returns `simulation` (`subject`, `pretext_type`, `body_html`), `mcpContext`, `generationMeta`, `serverEnv`.

### `POST /api/client-log`

**Body:** `{ "events": [ { "level", "message", "context", "url", "ts", "stack" } ] }` or a single event object.

Appends sanitized lines to **`logs/frontend.log`** via `logClientEvents`. Used by the SPA verbose logger.

### `POST /api/telemetry/stage`

**Body:** `employeeId`, optional `editedSubject`, `editedPretextType`, `editedBodyHtml`, `deliveryVector`, `contextualAnchors`.

Appends a row to the **in-memory** telemetry store (no outbound email/Slack/Teams).

### `GET /api/telemetry`

Returns `{ items: [...] }` staged rows.

### `PATCH /api/telemetry/:id/simulate`

**Body:** `{ "mode": "report_hook" | "link_click" }` — updates simulated outcome flags.

---

## Verbose file logging

On first write, **`logs/`** is created at the **monorepo root** (sibling of `backend/` and `frontend/`).

| File | Contents |
|------|----------|
| **`logs/backend.log`** | `http` request/line + response line (status, **durationMs**), `boot`, `simulation`, `gemini`, `telemetry`, `client_log` ingest summaries |
| **`logs/frontend.log`** | One JSON object per ingested client event (from `POST /api/client-log`) |

Each line is a single JSON object with at least **`ts`** (ISO time).

**Note:** Fastify’s **stdout** logger (`logger: true`) remains enabled; file logs are **additional** structured traces.

---

## CORS

`@fastify/cors` is registered with **`origin: true`** so browser dev origins (e.g. Vite on `5173`) can call the API when not using a proxy.

---

## Execution checklist (local)

1. From repo root: `pnpm install`
2. Copy `../.env.example` to **`../.env`** or **`./.env`** under `backend/`; set `GEMINI_API_KEY` if you want live Gemini
3. `pnpm run dev` (this package) or `pnpm run dev:backend` from root
4. Confirm `GET http://127.0.0.1:8787/api/health`
5. Optional: tail `../logs/backend.log` while exercising routes

---

## Troubleshooting

| Symptom | Likely cause | What to try |
|---------|----------------|------------|
| **`EADDRINUSE` :8787** | Another process bound to the port | Free the port or set **`PORT`** |
| Gemini **`404` model** | Deprecated / wrong model id | Set **`GEMINI_MODEL`** (e.g. `gemini-2.5-flash`) |
| **`missing_api_key`** in generate | No key in merged `.env` | Check `mergedEnvSources` / `envDiagnostics` from **`/api/health`**; fix paths; restart |
| **`unparseable_model_output`** | Truncated or non-JSON model output | Raise **`GEMINI_MAX_OUTPUT_TOKENS`**; inspect `logs/backend.log` `gemini` entries |

---

## Related docs

- Monorepo overview: [`../README.md`](../README.md)
- Frontend (Vite UI): [`../frontend/README.md`](../frontend/README.md)
