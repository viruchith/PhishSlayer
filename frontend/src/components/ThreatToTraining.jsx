import { useCallback, useEffect, useState } from "preact/hooks";
import { EmailHtmlPreview } from "./EmailHtmlPreview.jsx";
import { GeminiToggle } from "./GeminiToggle.jsx";
import { DebriefPanel } from "./DebriefPanel.jsx";
import { Zone } from "./Zone.jsx";

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * @param {{ geminiKeyConfigured: boolean | null }} props
 */
export function ThreatToTraining({ geminiKeyConfigured }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventDetail, setEventDetail] = useState(null);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [useGemini, setUseGemini] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [currentDraft, setCurrentDraft] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [message, setMessage] = useState("");
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefDelivery, setDebriefDelivery] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editPretext, setEditPretext] = useState("");

  const refreshQueues = useCallback(async () => {
    try {
      const [ex, ib, met] = await Promise.all([
        api("/api/exercises"),
        api("/api/inbox"),
        api("/api/metrics"),
      ]);
      setExercises(ex.items ?? []);
      setInbox(ib.items ?? []);
      setMetrics(met);
    } catch {
      /* ignore refresh errors */
    }
  }, []);

  useEffect(() => {
    api("/api/events")
      .then((d) => {
        const list = d.events ?? [];
        setEvents(list);
        if (list[0]?.eventId) setSelectedEventId(list[0].eventId);
      })
      .catch(() => setEvents([]));
    refreshQueues();
  }, [refreshQueues]);

  useEffect(() => {
    if (!selectedEventId) {
      setEventDetail(null);
      return;
    }
    api(`/api/events/${encodeURIComponent(selectedEventId)}`)
      .then((d) => {
        setEventDetail(d);
        const first = d.mapping?.cohortIds?.[0];
        if (first) setSelectedCohortId(first);
      })
      .catch(() => setEventDetail(null));
  }, [selectedEventId]);

  useEffect(() => {
    if (!currentDraft) return;
    setEditSubject(currentDraft.exercise?.subject ?? "");
    setEditBody(currentDraft.exercise?.body_html ?? "");
    setEditPretext(currentDraft.exercise?.pretext_type ?? "");
  }, [currentDraft?.id]);

  const onGenerate = async () => {
    if (!selectedEventId || !selectedCohortId) return;
    setGenLoading(true);
    setGenError("");
    setMessage("");
    try {
      const data = await api("/api/exercises/generate", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          cohortId: selectedCohortId,
          useGemini,
        }),
      });
      setCurrentDraft(data.exercise);
      setMessage(
        `Generated via ${data.exercise?.generationMeta?.source ?? "unknown"}` +
          (data.exercise?.validation?.allowed ? " — validation passed" : " — validation issues"),
      );
      await refreshQueues();
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenLoading(false);
    }
  };

  const onSaveEdit = async () => {
    if (!currentDraft) return;
    try {
      const data = await api(`/api/exercises/${encodeURIComponent(currentDraft.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          subject: editSubject,
          body_html: editBody,
          pretext_type: editPretext,
        }),
      });
      setCurrentDraft(data.exercise);
      setMessage("Draft updated; validation re-run.");
      await refreshQueues();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const onDecide = async (id, decision) => {
    try {
      await api(`/api/exercises/${encodeURIComponent(id)}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision, reviewerNote: "" }),
      });
      setMessage(decision === "approve" ? "Approved — delivered to sandbox inbox." : "Rejected.");
      if (currentDraft?.id === id) {
        const refreshed = await api(`/api/exercises/${encodeURIComponent(id)}`);
        setCurrentDraft(refreshed.exercise);
      }
      await refreshQueues();
    } catch (e) {
      setMessage(e.data?.message || e.message);
    }
  };

  const openDelivery = async (deliveryId) => {
    try {
      const data = await api(`/api/inbox/${encodeURIComponent(deliveryId)}`);
      setDebriefDelivery(data.delivery);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const onInboxClick = async (deliveryId) => {
    try {
      const data = await api(`/api/inbox/${encodeURIComponent(deliveryId)}/click`, {
        method: "POST",
        body: "{}",
      });
      await api(`/api/inbox/${encodeURIComponent(deliveryId)}/debrief`, {
        method: "POST",
        body: "{}",
      });
      setDebriefDelivery(data.delivery);
      setDebriefOpen(true);
      await refreshQueues();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const onInboxReport = async (deliveryId) => {
    try {
      await api(`/api/inbox/${encodeURIComponent(deliveryId)}/report`, {
        method: "POST",
        body: "{}",
      });
      setMessage("Reported as phishing (sandbox).");
      await refreshQueues();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const mapping = eventDetail?.mapping;
  const event = eventDetail?.event;
  const pending = exercises.filter((e) => e.status === "pending");
  const validation = currentDraft?.validation;

  return (
    <div class="space-y-4">
      {metrics ? (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            ["Sent", metrics.totals?.sent],
            ["Clicked", metrics.totals?.clicked],
            ["Reported", metrics.totals?.reported],
            ["Debriefed", metrics.totals?.verified],
          ].map(([label, val]) => (
            <div key={label} class="rounded-lg border border-p4g-line bg-white px-3 py-2">
              <p class="text-[10px] uppercase tracking-wide text-p4g-faint">{label}</p>
              <p class="text-lg font-semibold text-p4g-ink">{val ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div class="grid lg:grid-cols-2 gap-4">
        <Zone title="1. Threat events" subtitle="Seeded advisories (synthetic sources)">
          <ul class="space-y-2 max-h-64 overflow-y-auto">
            {events.map((ev) => (
              <li key={ev.eventId}>
                <button
                  type="button"
                  onClick={() => setSelectedEventId(ev.eventId)}
                  class={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                    selectedEventId === ev.eventId
                      ? "border-p4g-ink bg-gray-50 text-p4g-ink"
                      : "border-p4g-line bg-gray-50 text-gray-700 hover:border-p4g-lineStrong"
                  }`}
                >
                  <span class="font-mono text-[10px] text-p4g-faint">{ev.eventId}</span>
                  <span class="block font-medium mt-0.5">{ev.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {event ? (
            <div class="mt-3 text-xs text-p4g-muted space-y-2 border-t border-p4g-line pt-3">
              <p class="text-gray-700 leading-relaxed">{event.summary}</p>
              <p class="break-all">
                Source:{" "}
                <a class="text-p4g-accent hover:underline underline-offset-2" href={event.source?.url} target="_blank" rel="noreferrer">
                  {event.source?.name}
                </a>
              </p>
              <div>
                <p class="text-p4g-faint uppercase tracking-wide text-[10px] mb-1">Key facts</p>
                <ul class="list-disc pl-4 space-y-1">
                  {(event.keyFacts ?? []).map((f) => (
                    <li key={f.citationLabel}>
                      <span class="font-mono text-blue-600/90">{f.citationLabel}</span> — {f.claim}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </Zone>

        <Zone title="2. Cohort mapping" subtitle="Rule-based; no individual profiling">
          {mapping ? (
            <>
              <ul class="space-y-2 mb-3">
                {(mapping.cohorts ?? []).map((c) => (
                  <li key={c.cohortId}>
                    <label class="flex items-start gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="cohort"
                        checked={selectedCohortId === c.cohortId}
                        onChange={() => setSelectedCohortId(c.cohortId)}
                        class="mt-1"
                      />
                      <span>
                        <span class="text-p4g-ink font-medium">{c.name}</span>
                        <span class="block text-xs text-p4g-faint font-mono">{c.cohortId}</span>
                        <span class="block text-xs text-p4g-muted mt-0.5">{c.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div class="text-xs text-p4g-faint space-y-1">
                <p class="uppercase tracking-wide text-[10px]">Mapping reasons</p>
                {(mapping.reasons ?? []).map((r) => (
                  <p key={`${r.ruleId}-${r.cohortId}`}>
                    <span class="font-mono text-p4g-muted">{r.ruleId}</span> → {r.cohortId}: {r.reason}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p class="text-sm text-p4g-faint">Select an event to see cohorts.</p>
          )}
        </Zone>
      </div>

      <Zone title="3. Generate grounded exercise" subtitle="Advisory + cohort only; Gemini optional">
        <div class="flex flex-wrap items-center gap-4 mb-3">
          <GeminiToggle
            checked={useGemini}
            onChange={setUseGemini}
            keyConfigured={geminiKeyConfigured}
            disabled={genLoading}
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={genLoading || !selectedEventId || !selectedCohortId}
            class="v-btn-primary"
          >
            {genLoading ? "Generating…" : "Generate exercise"}
          </button>
        </div>
        {genError ? <p class="text-sm text-red-600 mb-2">{genError}</p> : null}
        {message ? <p class="text-sm text-p4g-muted mb-2">{message}</p> : null}

        {currentDraft ? (
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="rounded border border-p4g-line px-2 py-0.5 text-gray-700">
                {currentDraft.id}
              </span>
              <span class="rounded border border-p4g-line px-2 py-0.5 text-gray-700">
                {currentDraft.status}
              </span>
              <span
                class={`rounded border px-2 py-0.5 ${
                  validation?.allowed
                    ? "border-emerald-200 text-emerald-700"
                    : "border-red-200 text-red-700"
                }`}
              >
                validation: {validation?.allowed ? "pass" : "fail"}
              </span>
              <span class="rounded border border-p4g-line px-2 py-0.5 text-p4g-muted">
                source: {currentDraft.generationMeta?.source}
              </span>
            </div>

            {currentDraft.status === "pending" ? (
              <div class="grid gap-2">
                <label class="text-xs text-p4g-faint">
                  Subject
                  <input
                    class="v-input mt-1"
                    value={editSubject}
                    onInput={(e) => setEditSubject(e.currentTarget.value)}
                  />
                </label>
                <label class="text-xs text-p4g-muted">
                  Pretext type
                  <input
                    class="v-input mt-1"
                    value={editPretext}
                    onInput={(e) => setEditPretext(e.currentTarget.value)}
                  />
                </label>
                <label class="text-xs text-p4g-muted">
                  Body HTML
                  <textarea
                    class="v-input mt-1 font-mono min-h-[100px]"
                    value={editBody}
                    onInput={(e) => setEditBody(e.currentTarget.value)}
                  />
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    class="v-btn-secondary text-sm"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecide(currentDraft.id, "approve")}
                    disabled={!validation?.allowed}
                    class="v-btn-primary text-sm"
                  >
                    Approve & deliver
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecide(currentDraft.id, "reject")}
                    class="rounded-full border border-red-200 text-red-700 px-3 py-1.5 text-sm hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : null}

            <EmailHtmlPreview
              subject={editSubject || currentDraft.exercise?.subject || ""}
              html={editBody || currentDraft.exercise?.body_html || ""}
            />

            <div class="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p class="text-p4g-faint uppercase tracking-wide text-[10px] mb-1">Citations</p>
                <ul class="list-disc pl-4 text-blue-700 font-mono">
                  {(currentDraft.exercise?.citations ?? []).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p class="text-p4g-faint uppercase tracking-wide text-[10px] mb-1">Red flags</p>
                <ul class="list-disc pl-4 text-amber-800">
                  {(currentDraft.exercise?.redFlags ?? []).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p class="text-xs text-emerald-800">
              <span class="text-p4g-faint">Verify officially:</span>{" "}
              {currentDraft.exercise?.verifyOfficially}
            </p>

            {validation && !validation.allowed ? (
              <div class="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <p class="font-semibold mb-1">Validation failures</p>
                <ul class="list-disc pl-4 space-y-0.5">
                  {(validation.checks ?? [])
                    .filter((c) => !c.ok)
                    .map((c) => (
                      <li key={c.id}>
                        {c.id}: {typeof c.detail === "string" ? c.detail : JSON.stringify(c.detail)}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p class="text-sm text-p4g-faint">Generate an exercise for the selected event and cohort.</p>
        )}
      </Zone>

      <div class="grid lg:grid-cols-2 gap-4">
        <Zone title="4. Approval queue" subtitle="Pending human review">
          {pending.length === 0 ? (
            <p class="text-sm text-p4g-faint">No pending exercises.</p>
          ) : (
            <ul class="space-y-2 max-h-72 overflow-y-auto">
              {pending.map((ex) => (
                <li
                  key={ex.id}
                  class="rounded-lg border border-p4g-line bg-gray-50 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    class="text-left w-full"
                    onClick={() => setCurrentDraft(ex)}
                  >
                    <span class="font-mono text-[10px] text-p4g-faint">{ex.id}</span>
                    <span class="block text-p4g-ink mt-0.5">{ex.exercise?.subject}</span>
                    <span class="text-xs text-p4g-muted">
                      {ex.eventId} · {ex.cohortId} ·{" "}
                      {ex.validation?.allowed ? "valid" : "invalid"}
                    </span>
                  </button>
                  <div class="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={!ex.validation?.allowed}
                      onClick={() => onDecide(ex.id, "approve")}
                      class="text-xs rounded bg-p4g-ink text-white px-2 py-1 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide(ex.id, "reject")}
                      class="text-xs rounded border border-red-200 text-red-700 px-2 py-1"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Zone>

        <Zone title="5. Sandbox inbox" subtitle="Click opens debrief — no credentials collected">
          {inbox.length === 0 ? (
            <p class="text-sm text-p4g-faint">Approve an exercise to populate the inbox.</p>
          ) : (
            <ul class="space-y-2 max-h-72 overflow-y-auto">
              {inbox.map((item) => (
                <li
                  key={item.deliveryId}
                  class="rounded-lg border border-p4g-line bg-gray-50 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    class="text-left w-full"
                    onClick={() => openDelivery(item.deliveryId)}
                  >
                    <span class="text-p4g-ink">{item.subject}</span>
                    <span class="block text-xs text-p4g-muted mt-0.5">
                      To: {item.recipientName} · {item.cohortId}
                      {item.clicked ? " · clicked" : ""}
                      {item.reported ? " · reported" : ""}
                    </span>
                  </button>
                  <div class="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onInboxClick(item.deliveryId)}
                      class="text-xs rounded bg-p4g-ink text-white font-medium px-2 py-1"
                    >
                      Simulate click
                    </button>
                    <button
                      type="button"
                      onClick={() => onInboxReport(item.deliveryId)}
                      class="text-xs rounded border border-p4g-lineStrong text-gray-700 px-2 py-1"
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const d = await api(`/api/inbox/${encodeURIComponent(item.deliveryId)}`);
                        await api(`/api/inbox/${encodeURIComponent(item.deliveryId)}/debrief`, {
                          method: "POST",
                          body: "{}",
                        });
                        setDebriefDelivery(d.delivery);
                        setDebriefOpen(true);
                        refreshQueues();
                      }}
                      class="text-xs rounded border border-emerald-200 text-emerald-700 px-2 py-1"
                    >
                      Debrief
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Zone>
      </div>

      <DebriefPanel
        open={debriefOpen}
        onClose={() => setDebriefOpen(false)}
        delivery={debriefDelivery}
      />
    </div>
  );
}
