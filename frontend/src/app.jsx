import { useEffect, useState } from "preact/hooks";
import { ThreatToTraining } from "./components/ThreatToTraining.jsx";
import { clientVerboseLog, flushClientLogsSync } from "./clientLogger.js";

export function App() {
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

  return (
    <div class="min-h-screen">
      <div
        class="sticky top-0 z-40 border-b border-p4g-line bg-white/90 backdrop-blur-md text-p4g-muted text-center text-xs sm:text-sm px-3 py-2"
        role="status"
      >
        Synthetic data only · human approval required · nothing is sent to real recipients
      </div>
      <header class="border-b border-p4g-line bg-white/80 backdrop-blur-md sticky top-9 z-30">
        <div class="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="animate-fadeUp">
            <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-p4g-ink">Phish4Good</h1>
            <p class="text-sm text-p4g-muted max-w-xl mt-2 leading-relaxed">
              Threat-to-Training — turn trusted advisories into safe, role-relevant exercises.
              Human approval required. Nothing is sent outside this sandbox.
            </p>
          </div>
          <div
            class={`text-xs rounded-xl border px-3.5 py-2.5 font-medium shadow-soft bg-white animate-fadeUp ${
              backendConn.status === "checking"
                ? "border-p4g-line text-p4g-muted"
                : backendConn.status === "up"
                  ? "border-emerald-200 text-emerald-800"
                  : "border-red-200 text-red-700"
            }`}
            role="status"
            aria-live="polite"
          >
            <div class="flex items-center gap-2 font-semibold">
              <span
                class={`inline-block h-1.5 w-1.5 rounded-full ${
                  backendConn.status === "up"
                    ? "bg-emerald-500 animate-pulseSoft"
                    : backendConn.status === "down"
                      ? "bg-red-500"
                      : "bg-gray-300"
                }`}
              />
              {backendConn.status === "checking"
                ? "Checking backend…"
                : backendConn.status === "up"
                  ? "Backend connected"
                  : "Backend unreachable"}
            </div>
            {backendConn.status === "up" ? (
              <p class="mt-1 text-[11px] text-p4g-muted font-normal">
                Gemini:{" "}
                <span class={backendConn.geminiKeyConfigured ? "text-emerald-700" : "text-amber-700"}>
                  {backendConn.geminiKeyConfigured ? "key loaded" : "mock fallback"}
                </span>
                <span class="text-p4g-faint"> · /api → :8787</span>
              </p>
            ) : backendConn.status === "down" ? (
              <p class="mt-1 text-[11px] font-normal">Start the API on :8787 (Vite proxies /api).</p>
            ) : null}
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 py-6">
        <ThreatToTraining geminiKeyConfigured={backendConn.geminiKeyConfigured} />
      </main>
    </div>
  );
}
