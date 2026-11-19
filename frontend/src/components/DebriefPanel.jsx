function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * Event-aware debrief for Mode A sandbox deliveries.
 * @param {{ open: boolean; onClose: () => void; delivery: object | null }} props
 */
export function DebriefPanel({ open, onClose, delivery }) {
  if (!open || !delivery) return null;

  const redFlags = Array.isArray(delivery.redFlags) ? delivery.redFlags : [];
  const citations = Array.isArray(delivery.citations) ? delivery.citations : [];
  const verify = delivery.verifyOfficially || "Verify through official internal channels.";

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div class="max-w-3xl w-full max-h-[92vh] flex flex-col rounded-xl border border-p4g-line bg-white shadow-lift overflow-hidden">
        <div class="border-b border-p4g-line px-5 py-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 id="debrief-title" class="text-xl font-semibold text-p4g-ink tracking-tight">
              How this pretext worked
            </h2>
            <p class="text-sm text-p4g-muted mt-1">
              {delivery.eventTitle || delivery.eventId} · {delivery.recipientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="rounded-lg border border-p4g-lineStrong px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <div class="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-sm text-gray-800">
          <section class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 class="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
              Red flags in this message
            </h3>
            <ul class="list-disc pl-5 space-y-1.5 text-gray-800">
              {redFlags.length ? (
                redFlags.map((f) => <li key={f}>{f}</li>)
              ) : (
                <li>Unexpected call-to-action outside official channels</li>
              )}
            </ul>
          </section>

          <section class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 class="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
              Verify officially
            </h3>
            <p class="text-p4g-ink leading-relaxed">{verify}</p>
          </section>

          <section class="rounded-lg border border-p4g-line bg-gray-50 p-4">
            <h3 class="text-xs font-semibold text-p4g-muted uppercase tracking-wide mb-2">
              Grounded citations
            </h3>
            <ul class="font-mono text-xs text-blue-700 space-y-1">
              {citations.length ? (
                citations.map((c) => <li key={c}>{c}</li>)
              ) : (
                <li class="text-p4g-faint">No citations recorded</li>
              )}
            </ul>
            {delivery.source?.url ? (
              <p class="text-xs text-p4g-faint mt-3 break-all">
                Source: {delivery.source.name || "advisory"} — {delivery.source.url}
              </p>
            ) : null}
          </section>

          <section class="rounded-lg border border-p4g-line bg-gray-50 p-4">
            <h3 class="text-xs font-semibold text-p4g-muted uppercase tracking-wide mb-2">
              Message subject
            </h3>
            <p class="font-mono text-xs text-gray-700">{truncate(delivery.subject, 400)}</p>
          </section>
        </div>
        <div class="px-5 py-3 border-t border-p4g-line flex justify-end bg-white">
          <button
            type="button"
            onClick={onClose}
            class="v-btn-primary px-5 py-2"
          >
            Back to inbox
          </button>
        </div>
      </div>
    </div>
  );
}
