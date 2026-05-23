# PHISH SLAYER — Frontend (Preact + Vite + Tailwind)

Single-page **analyst dashboard** for the PHISH SLAYER PoC: employee/target selection, CMDB profile, **CASE** generation trigger, AI output review, **sandboxed HTML email preview**, human gatekeeper edits, **telemetry staging grid**, **Glory Kill** debrief modal (simulated link click), and **verbose client logging** shipped to the backend.

Stack: **Preact 10**, **Vite 6**, **Tailwind CSS 3**, **`@preact/preset-vite`**.

This package is **`phish-slayer-frontend`** in the pnpm monorepo ([`../pnpm-workspace.yaml`](../pnpm-workspace.yaml), root [`../package.json`](../package.json)).

---

## Requirements

- **Node.js** 18+ and [**pnpm**](https://pnpm.io/installation) (see root `packageManager` in [`../package.json`](../package.json); `corepack enable` is enough to match the pinned version)
- A running **backend** on **`http://127.0.0.1:8787`** when using `/api/*` in dev (Vite proxy) or in production behind the same origin / reverse proxy

---

## Install & run

From the **repository root** (recommended):

```bash
pnpm install
pnpm run dev:frontend
```

Or from **`frontend/`** (pnpm discovers the workspace root):

```bash
pnpm install
pnpm run dev
```

| Script | Command | Purpose |
|--------|---------|---------|
| **dev** | `vite` | Dev server (default **port 5173**) |
| **build** | `vite build` | Production bundle → **`dist/`** |
| **preview** | `vite preview` | Serve **`dist/`** locally |

**Dev URL:** `http://localhost:5173/` (see Vite console for exact host/port).

---

## Dev proxy (critical)

**`vite.config.js`** proxies browser requests **`/api/*`** → **`http://127.0.0.1:8787`**.

- All frontend `fetch("/api/...")` calls go through Vite during **`pnpm run dev`** (or root `pnpm run dev:frontend`).
- **No API key** is configured in the frontend; secrets stay in the **backend** `.env`.

If the backend is down, `/api` calls fail in the browser; the dashboard shows **backend unreachable** in the header health strip.

---

## Source layout (`src/`)

| Path | Role |
|------|------|
| **`main.jsx`** | Mount root `<App />`, import global **`clientLogger.js`** side effects + **`index.css`** |
| **`app.jsx`** | Full dashboard: zones, state, `api()` wrapper, health polling, telemetry, modals |
| **`clientLogger.js`** | Buffers **`clientVerboseLog`** events → **`POST /api/client-log`**; dev console mirror; **`keepalive`** flush on **`pagehide` / `beforeunload`** |
| **`index.css`** | Tailwind entry (`@tailwind` directives) |
| **`components/EmailHtmlPreview.jsx`** | Large **iframe** preview (`sandbox=""`, `srcDoc`) for simulated email HTML |
| **`components/GloryKillModal.jsx`** | Link-click debrief: high-level “what went wrong / watch for” copy, **simulation metadata** table, pattern library, **CMDB anchors**, optional **staged HTML excerpt** |

There is **no client-side router**: one page, one `App` tree.

---

## UI behavior (implementation)

### Target selection

- Loads **`GET /api/employees`** on mount.
- `<select>` drives **`selectedId`**; **`GET /api/employees/:id/profile`** loads profile (projects, integration chips, peers, emotional archetype / tech theme / simulation hooks when present).

### Generator

- **`POST /api/simulation/generate`** with `{ employeeId }`.
- Shows **generation source** (Gemini vs local mock) and error/diagnostic text from **`generationMeta`**.

### Review & validation

- Displays model JSON fields and **CMDB contextual anchors** from the response payload.

### Human gatekeepers

- Editable **subject**, **pretext_type**, **body_html**.
- **`EmailHtmlPreview`** reflects live edits (tall viewport-oriented iframe).

### Telemetry

- **`POST /api/telemetry/stage`** on approve (includes edited fields + anchors).
- Grid loads **`GET /api/telemetry`**; **`PATCH /api/telemetry/:id/simulate`** for report vs link-click simulation.
- **Link click** opens **`GloryKillModal`** with narrative debrief, run metadata, technical anchors, and staged HTML excerpt when available.

### Backend connection strip

- Polls **`GET /api/health`** every **8s** + initial load.
- Shows connected/down, **Gemini key loaded** flag, merged **`.env`** source list from API.

---

## Client verbose logging

**`clientLogger.js`** API:

```js
import { clientVerboseLog, flushClientLogsSync } from "./clientLogger.js";

clientVerboseLog("info", "my_event", { detail: "..." });
```

- In **development**, also mirrors to **`console.debug` / `warn` / `error`** with a `[PhishSlayer]` prefix.
- Batches POSTs to **`/api/client-log`** (debounced ~450ms).
- **`app.jsx`** logs API requests, generation lifecycle, telemetry actions, discards.

Server-side lines land in **`<repo>/logs/frontend.log`** (see **`../backend/README.md`**).

---

## Styling

- **Tailwind** config: `tailwind.config.js` (content globs: `index.html`, `src/**/*`).
- **PostCSS:** `postcss.config.js` (`tailwindcss`, `autoprefixer`).
- Custom palette tokens under **`slayer.*`** in Tailwind config (used in components).

---

## Production build

```bash
pnpm run build
```

Output: **`frontend/dist/`** — static assets only. You must:

1. Serve **`dist/`** with a static file host, and  
2. Route **`/api`** to the Fastify backend (same host reverse proxy, or configure a different `fetch` base URL — not implemented in-repo; today the app assumes **`/api`** on the same origin or Vite proxy in dev).

---

## Execution checklist (local, full stack)

1. Repo root: `pnpm install`
2. Terminal A: `pnpm run dev:backend` (or `pnpm run dev` for both)
3. Terminal B (if not using concurrent root script): `pnpm run dev:frontend`
4. Open `http://localhost:5173`
5. Confirm header shows **Backend: connected** and **`/api/health`** returns JSON
6. Optional: watch **`../logs/frontend.log`** while clicking through the UI

---

## Troubleshooting

| Symptom | Likely cause | What to try |
|---------|----------------|------------|
| **Backend unreachable** | Nothing on **8787** or wrong port | Start backend; fix `vite.config.js` `proxy.target` if you changed `PORT` |
| **CORS errors** when not using Vite proxy | SPA opened as `file://` or wrong origin | Always use **`vite dev`** or configure a proper proxy in production |
| **No logs in `frontend.log`** | Backend not receiving POSTs | Check network tab for **`/api/client-log`**; ensure backend route exists |
| **Blank email preview** | Empty `body_html` | Generate or paste HTML in the gatekeeper textarea |

---

## Related docs

- Monorepo overview: [`../README.md`](../README.md)
- Backend API & env: [`../backend/README.md`](../backend/README.md)
