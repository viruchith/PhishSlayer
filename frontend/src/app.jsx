import { useEffect, useState } from "preact/hooks";
import { GloryKillModal } from "./components/GloryKillModal.jsx";
import { EmailHtmlPreview } from "./components/EmailHtmlPreview.jsx";
import { clientVerboseLog, flushClientLogsSync } from "./clientLogger.js";

const LINKED_PROVIDER_CHIPS = [
  ["aws", "AWS", "bg-orange-500/15 text-orange-200 border-orange-500/30"],
  ["gcp", "GCP", "bg-blue-500/15 text-blue-200 border-blue-500/30"],
  ["datadog", "DataDog", "bg-purple-500/15 text-purple-200 border-purple-500/30"],
  ["github", "GitHub", "bg-slate-500/20 text-slate-100 border-slate-600/60"],
  ["azure", "Azure", "bg-sky-500/15 text-sky-100 border-sky-500/35"],
  ["okta", "Okta", "bg-indigo-500/15 text-indigo-100 border-indigo-500/35"],
  ["splunk", "Splunk", "bg-green-700/20 text-green-100 border-green-600/40"],
  ["jira", "Jira", "bg-blue-400/10 text-blue-100 border-blue-500/30"],
  ["servicenow", "ServiceNow", "bg-emerald-700/20 text-emerald-100 border-emerald-600/40"],
  ["lacework", "Lacework", "bg-rose-500/15 text-rose-100 border-rose-500/35"],
  ["argocd", "Argo CD", "bg-orange-400/10 text-orange-100 border-orange-400/30"],
];

async function api(path, options) {
  clientVerboseLog("debug", "api_request", { path, method: options?.method || "GET" });
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    clientVerboseLog("warn", "api_error", { path, status: res.status, body: data });
    const err = new Error(data.message || data.error || res.statusText);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  clientVerboseLog("debug", "api_ok", { path, status: res.status });
  return data;
}

function Zone({ title, subtitle, children }) {
  return (
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg overflow-hidden">
      <header class="border-b border-slate-800 px-4 py-3 bg-slate-900/90">
        <h2 class="text-sm font-semibold text-white tracking-tight">{title}</h2>
        {subtitle ? <p class="text-xs text-slate-400 mt-0.5">{subtitle}</p> : null}
      </header>
      <div class="p-4">{children}</div>
    </section>
  );
}

export function App() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [genResult, setGenResult] = useState(null);
  const [subject, setSubject] = useState("");
  const [pretext, setPretext] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [telemetry, setTelemetry] = useState([]);
  const [stagingMessage, setStagingMessage] = useState("");
  const [gloryOpen, setGloryOpen] = useState(false);
  const [gloryRow, setGloryRow] = useState(null);
  const [simulateModes, setSimulateModes] = useState({});
  const [backendConn, setBackendConn] = useState({
    status: "checking",
    geminiKeyConfigured: null,
    envSources: [],
  });

  useEffect(() => {
    clientVerboseLog("info", "app_mount", { href: typeof location !== "undefined" ? location.href : "" });
    return () => flushClientLogsSync();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch("/api/health");
        if (cancelled) return;
        if (!res.ok) {
          setBackendConn({ status: "down", geminiKeyConfigured: null, envSources: [] });
          return;
        }
        const data = await res.json().catch(() => ({}));
        setBackendConn({
          status: "up",
          geminiKeyConfigured: Boolean(data.geminiKeyConfigured),
          envSources: Array.isArray(data.envSources) ? data.envSources : [],
        });
      } catch {
        if (!cancelled) setBackendConn({ status: "down", geminiKeyConfigured: null, envSources: [] });
      }
    };
    ping();
    const t = setInterval(ping, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    api("/api/employees")
      .then((d) => {
        setEmployees(d.employees ?? []);
        if (d.employees?.[0]?.employeeId) setSelectedId(d.employees[0].employeeId);
      })
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    setProfileError("");
    api(`/api/employees/${encodeURIComponent(selectedId)}/profile`)
      .then(setProfile)
      .catch((e) => {
        setProfile(null);
        setProfileError(e.message);
      });
  }, [selectedId]);

  const refreshTelemetry = () => {
    api("/api/telemetry").then((d) => setTelemetry(d.items ?? [])).catch(() => setTelemetry([]));
  };

  useEffect(() => {
    refreshTelemetry();
  }, []);

  const onGenerate = async () => {
    if (!selectedId) return;
    setGenerateLoading(true);
    setGenerateError("");
    clientVerboseLog("info", "generate_start", { employeeId: selectedId });
    try {
      const data = await api("/api/simulation/generate", {
        method: "POST",
        body: JSON.stringify({ employeeId: selectedId }),
      });
      setGenResult(data);
      setSubject(data.simulation?.subject ?? "");
      setPretext(data.simulation?.pretext_type ?? "");
      setBodyHtml(data.simulation?.body_html ?? "");
      clientVerboseLog("info", "generate_done", {
        employeeId: selectedId,
        source: data.generationMeta?.source,
        reason: data.generationMeta?.reason,
      });
    } catch (e) {
      clientVerboseLog("error", "generate_failed", { employeeId: selectedId, message: e.message });
      setGenerateError(e.message);
      setGenResult(null);
    } finally {
      setGenerateLoading(false);
    }
  };

  const anchors = genResult?.mcpContext?.contextualAnchors ?? profile?.contextualAnchors ?? [];

  const onApprove = async () => {
    if (!selectedId) return;
    setStagingMessage("");
    try {
      await api("/api/telemetry/stage", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedId,
          editedSubject: subject,
          editedPretextType: pretext,
          editedBodyHtml: bodyHtml,
          deliveryVector: profile?.employee?.preferredDeliveryVector,
          contextualAnchors: anchors,
        }),
      });
      setStagingMessage("Staged for telemetry (no messages were sent).");
      clientVerboseLog("info", "telemetry_staged", { employeeId: selectedId });
      refreshTelemetry();
    } catch (e) {
      setStagingMessage(e.message);
    }
  };

  const onDiscard = () => {
    clientVerboseLog("info", "template_discarded", { employeeId: selectedId });
    setGenResult(null);
    setSubject("");
    setPretext("");
    setBodyHtml("");
    setGenerateError("");
    setStagingMessage("Discarded local template draft.");
  };

  const runSimulation = async (row) => {
    const mode = simulateModes[row.id] || "report_hook";
    clientVerboseLog("info", "telemetry_simulate", { telemetryId: row.id, mode });
    try {
      const res = await api(`/api/telemetry/${encodeURIComponent(row.id)}/simulate`, {
        method: "PATCH",
        body: JSON.stringify({ mode }),
      });
      refreshTelemetry();
      if (mode === "link_click") {
        setGloryRow(res.telemetry ?? row);
        setGloryOpen(true);
      }
    } catch (e) {
      setStagingMessage(e.message);
    }
  };

  return (
    <div class="min-h-screen">
      <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div class="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs font-semibold text-slayer-accent uppercase tracking-widest">
              PHISH SLAYER — PoC
            </p>
            <h1 class="text-2xl font-bold text-white">Human-in-the-Loop CASE Dashboard</h1>
            <p class="text-sm text-slate-400 max-w-2xl">
              Synthetic CMDB → mock MCP bridge → Gemini (with offline fallback) → analyst review → staged
              telemetry. No email, Slack, or Teams webhooks are dispatched.
            </p>
          </div>
          <div class="flex flex-col gap-2 items-stretch md:items-end shrink-0">
            <div
              class={`text-xs rounded-lg border px-3 py-2 font-medium ${
                backendConn.status === "checking"
                  ? "border-slate-600 bg-slate-900/80 text-slate-400"
                  : backendConn.status === "up"
                    ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-200"
                    : "border-red-800/70 bg-red-950/30 text-red-200"
              }`}
              role="status"
              aria-live="polite"
            >
              <div class="font-semibold">
                {backendConn.status === "checking"
                  ? "Backend: checking…"
                  : backendConn.status === "up"
                    ? "Backend: connected"
                    : "Backend: unreachable"}
              </div>
              {backendConn.status === "up" ? (
                <div class="mt-1 text-[11px] text-slate-400 font-normal">
                  Gemini key on server:{" "}
                  <span class={backendConn.geminiKeyConfigured ? "text-emerald-300" : "text-amber-300"}>
                    {backendConn.geminiKeyConfigured ? "loaded" : "not loaded"}
                  </span>
                  <span class="block mt-1 text-slate-500">
                    Merged <code class="text-slate-400">.env</code>:{" "}
                    {backendConn.envSources?.length
                      ? backendConn.envSources.join(", ")
                      : "(none found — check repo root and backend/.env)"}
                  </span>
                  <span class="block mt-0.5 font-mono text-[10px] text-slate-500">/api/health · 8s poll</span>
                </div>
              ) : backendConn.status === "down" ? (
                <p class="mt-1 text-[11px] text-red-300/90 font-normal">
                  Is the API running on <code class="text-red-100">:8787</code>? Vite proxies{" "}
                  <code class="text-red-100">/api</code> in dev.
                </p>
              ) : null}
            </div>
            <div class="text-xs text-slate-500 font-mono rounded-lg border border-slate-800 px-3 py-2 bg-slate-900/80">
              API proxy: <span class="text-slate-300">/api → :8787</span>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <Zone
            title="Target selection"
            subtitle="Pick a synthetic employee; profile reflects in-memory CMDB (read-only)."
          >
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Employee
            </label>
            <select
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slayer-accent/60"
              value={selectedId}
              onInput={(e) => setSelectedId(e.currentTarget.value)}
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} — {emp.role}
                  {emp.emotionalArchetype ? ` · ${emp.emotionalArchetype.replace(/_/g, " ")}` : ""} ({emp.employeeId})
                </option>
              ))}
            </select>
            {profileError ? <p class="text-sm text-red-400 mt-2">{profileError}</p> : null}
            {profile ? (
              <div class="mt-4 space-y-3 text-sm">
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="rounded-full bg-slate-800 px-2 py-1 text-slate-200 border border-slate-700">
                    {profile.employee.department}
                  </span>
                  <span class="rounded-full bg-slate-800 px-2 py-1 text-slate-200 border border-slate-700">
                    Vector: {profile.employee.preferredDeliveryVector}
                  </span>
                  <span class="rounded-full bg-slate-800 px-2 py-1 text-slate-200 border border-slate-700">
                    {profile.employee.employmentType}
                  </span>
                </div>
                {profile.employee.emotionalArchetype || profile.employee.primaryTechTheme ? (
                  <div class="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300 space-y-2">
                    <p class="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">
                      Simulation profile (synthetic CMDB)
                    </p>
                    {profile.employee.emotionalArchetype ? (
                      <p>
                        <span class="text-slate-500">Emotional archetype:</span>{" "}
                        <span class="text-amber-100/95">
                          {profile.employee.emotionalArchetype.replace(/_/g, " ")}
                        </span>
                      </p>
                    ) : null}
                    {profile.employee.primaryTechTheme ? (
                      <p>
                        <span class="text-slate-500">Tech theme:</span>{" "}
                        <span class="text-cyan-200/90">
                          {profile.employee.primaryTechTheme.replace(/_/g, " ")}
                        </span>
                      </p>
                    ) : null}
                    {profile.employee.simulationHooks?.length ? (
                      <ul class="list-disc pl-4 space-y-1 text-slate-400">
                        {profile.employee.simulationHooks.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-1">Active projects</p>
                  <ul class="space-y-1">
                    {profile.activeProjects.map((p) => (
                      <li key={p.projectId} class="text-slate-200">
                        <span class="text-cyan-300 font-mono text-xs mr-2">{p.projectId}</span>
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-1">Cloud / tool links</p>
                  <ul class="grid sm:grid-cols-2 gap-2">
                    {profile.cloudProviders.map((c) => (
                      <li
                        key={c.projectId}
                        class="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-2 text-xs text-slate-300"
                      >
                        <div class="font-semibold text-slate-100">{c.projectId}</div>
                        <div class="mt-1 flex flex-wrap gap-1">
                          {LINKED_PROVIDER_CHIPS.map(([key, label, cls]) =>
                            c[key] ? (
                              <span
                                key={`${c.projectId}-${key}`}
                                class={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}
                              >
                                {label}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-1">Peers (synthetic)</p>
                  <ul class="text-slate-300 text-xs space-y-1">
                    {profile.peers.map((peer) => (
                      <li key={peer.employeeId}>
                        {peer.employeeId} — {peer.role} / {peer.department}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </Zone>

          <Zone title="Generator core" subtitle="Calls POST /api/simulation/generate (MCP context + Gemini).">
            <button
              type="button"
              disabled={!selectedId || generateLoading}
              onClick={onGenerate}
              class="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            >
              {generateLoading ? "Running CASE engine…" : "Trigger CASE Engine Simulation Generation"}
            </button>
            {generateError ? <p class="text-sm text-red-400 mt-3">{generateError}</p> : null}
            {genResult?.generationMeta?.source === "mock_fallback" ? (
              <div class="text-xs text-slayer-warn mt-2 space-y-1">
                <p>
                  Generation source: <strong>local mock</strong>
                  {genResult.generationMeta.reason
                    ? ` (${genResult.generationMeta.reason.replace(/_/g, " ")})`
                    : ""}
                  .
                </p>
                {genResult.generationMeta.reason === "missing_api_key" &&
                genResult.generationMeta.diagnostics ? (
                  <pre class="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-[10px] text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(genResult.generationMeta.diagnostics, null, 2)}
                  </pre>
                ) : null}
                {genResult.generationMeta.reason === "missing_api_key" ? (
                  <p class="text-slate-300 mt-2">
                    Ensure the <strong>Fastify backend</strong> is the one you updated (port{" "}
                    <code class="text-cyan-200">8787</code>). From the repo root run{" "}
                    <code class="text-cyan-200">npm run dev</code> (starts both), or in another terminal:{" "}
                    <code class="text-cyan-200">npm run dev -w phish-slayer-backend</code>. Running only{" "}
                    <code class="text-cyan-200">frontend</code>{" "}
                    <span class="text-slate-400">(Vite)</span> does not load <code class="text-cyan-200">.env</code> for
                    Gemini—that file is read by the backend process.
                  </p>
                ) : null}
                {genResult.generationMeta.reason === "missing_api_key" &&
                genResult.serverEnv &&
                !genResult.serverEnv.geminiKeyConfigured ? (
                  <p class="text-slate-300">
                    The backend process does not see <code class="text-cyan-200">GEMINI_API_KEY</code> or{" "}
                    <code class="text-cyan-200">GOOGLE_API_KEY</code>. Add it to the repo-root{" "}
                    <code class="text-cyan-200">.env</code> (or <code class="text-cyan-200">backend/.env</code>) and
                    restart the server.
                  </p>
                ) : null}
                {genResult.generationMeta.reason === "api_error" && genResult.generationMeta.detail ? (
                  <p class="text-slate-300 break-words">
                    API detail: <span class="font-mono text-[11px]">{genResult.generationMeta.detail}</span>
                  </p>
                ) : null}
                {genResult.generationMeta.reason === "output_truncated" && genResult.generationMeta.detail ? (
                  <p class="text-slate-300 break-words">{genResult.generationMeta.detail}</p>
                ) : null}
                {genResult.generationMeta.finishReason ? (
                  <p class="text-slate-500 text-[10px]">
                    Finish reason: <code class="text-slate-400">{genResult.generationMeta.finishReason}</code>
                  </p>
                ) : null}
                {(genResult.generationMeta.reason === "unparseable_model_output" ||
                  genResult.generationMeta.reason === "output_truncated") &&
                genResult.generationMeta.rawPreview ? (
                  <p class="text-slate-300 break-words font-mono text-[11px]">
                    Raw preview: {genResult.generationMeta.rawPreview}
                  </p>
                ) : null}
              </div>
            ) : null}
            {genResult?.generationMeta?.source === "gemini" ? (
              <p class="text-xs text-slayer-ok mt-2">
                Generation source: <strong>Gemini</strong> ({genResult.generationMeta.model})
              </p>
            ) : null}
          </Zone>
        </div>

        <div class="space-y-6">
          <Zone
            title="Review & validation sandbox"
            subtitle="AI payload with the exact CMDB anchors supplied to the model."
          >
            {!genResult ? (
              <p class="text-sm text-slate-400">
                Run the generator to populate the simulation JSON and anchor list.
              </p>
            ) : (
              <div class="space-y-4">
                <div class="grid md:grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase mb-1">subject</p>
                    <pre class="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 whitespace-pre-wrap">
                      {genResult.simulation.subject}
                    </pre>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase mb-1">pretext_type</p>
                    <pre class="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 whitespace-pre-wrap">
                      {genResult.simulation.pretext_type}
                    </pre>
                  </div>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-1">body_html</p>
                  <pre class="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 max-h-40 overflow-auto whitespace-pre-wrap">
                    {genResult.simulation.body_html}
                  </pre>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Rendered preview (model output)</p>
                  <EmailHtmlPreview subject={genResult.simulation.subject} html={genResult.simulation.body_html} />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase mb-2">CMDB contextual anchors</p>
                  <ul class="text-xs font-mono text-cyan-200/90 space-y-1 max-h-36 overflow-auto bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                    {anchors.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Zone>

          <Zone
            title="Human gatekeepers"
            subtitle="Edit before staging; approval writes to the in-memory telemetry array only."
          >
            <div class="space-y-3">
              <div>
                <label class="text-xs font-semibold text-slate-500 uppercase">Subject</label>
                <input
                  class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={subject}
                  onInput={(e) => setSubject(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-500 uppercase">Pretext type</label>
                <input
                  class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={pretext}
                  onInput={(e) => setPretext(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-500 uppercase">Body HTML</label>
                <textarea
                  class="mt-1 w-full min-h-[140px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono"
                  value={bodyHtml}
                  onInput={(e) => setBodyHtml(e.currentTarget.value)}
                />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Rendered email preview (live)</p>
                <EmailHtmlPreview subject={subject} html={bodyHtml} />
              </div>
              <div class="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={!genResult}
                  onClick={onApprove}
                  class="rounded-lg bg-emerald-500/90 text-slate-950 font-semibold px-4 py-2 text-sm disabled:opacity-40"
                >
                  Approve for Telemetry Staging
                </button>
                <button
                  type="button"
                  disabled={!genResult}
                  onClick={onDiscard}
                  class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >
                  Discard Template
                </button>
              </div>
              {stagingMessage ? <p class="text-xs text-slate-300">{stagingMessage}</p> : null}
            </div>
          </Zone>

          <Zone
            title="Telemetry staging grid"
            subtitle="Simulated outcomes only — toggles drive PATCH /api/telemetry/:id/simulate."
          >
            {telemetry.length === 0 ? (
              <p class="text-sm text-slate-400">No staged rows yet. Approve a template to populate this grid.</p>
            ) : (
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs text-left text-slate-200">
                  <thead>
                    <tr class="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                      <th class="py-2 pr-3">Target</th>
                      <th class="py-2 pr-3">Department</th>
                      <th class="py-2 pr-3">Vector</th>
                      <th class="py-2 pr-3">Outcome</th>
                      <th class="py-2 pr-3">Simulate</th>
                      <th class="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry.map((row) => (
                      <tr key={row.id} class="border-b border-slate-800/80 align-top">
                        <td class="py-2 pr-3 font-semibold">{row.targetName}</td>
                        <td class="py-2 pr-3">{row.department}</td>
                        <td class="py-2 pr-3">{row.deliveryVector}</td>
                        <td class="py-2 pr-3">
                          <div class="space-y-1">
                            <span class="block text-[10px] text-slate-400">report: {String(row.reportHookSimulated)}</span>
                            <span class="block text-[10px] text-slate-400">click: {String(row.linkClickSimulated)}</span>
                            <span class="inline-flex mt-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] border border-slate-700">
                              {row.outcome}
                            </span>
                          </div>
                        </td>
                        <td class="py-2 pr-3">
                          <select
                            class="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                            value={simulateModes[row.id] || "report_hook"}
                            onInput={(e) =>
                              setSimulateModes((m) => ({
                                ...m,
                                [row.id]: e.currentTarget.value,
                              }))
                            }
                          >
                            <option value="report_hook">Simulate Report Hook</option>
                            <option value="link_click">Simulate Link Click</option>
                          </select>
                        </td>
                        <td class="py-2">
                          <button
                            type="button"
                            onClick={() => runSimulation(row)}
                            class="rounded-md border border-cyan-700/60 text-cyan-200 px-2 py-1 hover:bg-cyan-500/10"
                          >
                            Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Zone>
        </div>
      </main>

      <GloryKillModal
        open={gloryOpen}
        onClose={() => setGloryOpen(false)}
        telemetryRow={gloryRow}
        profileName={gloryRow?.targetName}
      />
    </div>
  );
}
