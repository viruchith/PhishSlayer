function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… [truncated]`;
}

/**
 * @param {{ open: boolean; onClose: () => void; telemetryRow: object | null; profileName?: string }} props
 */
export function GloryKillModal({ open, onClose, telemetryRow, profileName }) {
  if (!open) return null;

  const row = telemetryRow ?? {};
  const displayName = profileName ?? row.targetName ?? "the participant";
  const anchors = row.contextualAnchors?.length
    ? row.contextualAnchors
    : [
        "GCP billing anomaly language (simulated)",
        "Asset filenames such as Schema_v4.pdf",
        "Authoritative urgency from project leadership tone",
      ];

  const subject = row.subject ? String(row.subject) : "(no subject captured for this staged row)";
  const pretext = row.pretext_type ? String(row.pretext_type) : "unspecified";
  const vector = row.deliveryVector ? String(row.deliveryVector) : "unspecified";
  const dept = row.department ? String(row.department) : "—";

  const highLevelParagraph = `In this exercise you acted on a simulated “unsafe” control as if it were a real message: you followed through on a link path associated with a staged ${vector} narrative aimed at ${displayName}. The miss is not carelessness alone—it is that the lure combined believable operational stress with specific-looking internal metadata (projects, monitors, filenames, ticketing language) so your brain filled in authenticity without a separate verification step. Next time, treat any unexpected verification link—especially one tied to money, access, audits, or production changes—as untrusted until you confirm sender, channel, and ticket correlation out-of-band.`;

  const watchOutParagraph = `Watch for the pairing of emotional compression (“now”, “P1”, “exec waiting”) with technical specificity (exact cloud IDs, repo paths, monitor numbers). Legitimate teams still use tickets and named bridges; attackers skip that chain or impersonate it in one channel only. Slow down, open the official console or IT portal yourself (typed URL or bookmark), and compare identifiers to what you already trust—not what the message claims.`;

  const metaRows = [
    ["Telemetry row ID", row.id ?? "—"],
    ["Staged at (UTC)", row.stagedAt ?? "—"],
    ["Simulated outcome", row.outcome ?? "—"],
    ["Target (CMDB)", row.targetName ?? "—"],
    ["Department", dept],
    ["Employee ID", row.employeeId ?? "—"],
    ["Simulated delivery vector", vector],
    ["Pretext type (staged)", pretext],
    ["Subject line (staged)", truncate(subject, 280)],
  ];

  const bodyHtml = row.body_html ? String(row.body_html) : "";

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glory-kill-title"
    >
      <div class="max-w-5xl w-full max-h-[92vh] flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div class="border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-slayer-accent font-semibold">
              Glory Kill — Learning Module
            </p>
            <h2 id="glory-kill-title" class="text-xl sm:text-2xl font-semibold text-white mt-1">
              Link-click debrief
            </h2>
            <p class="text-sm text-slate-400 mt-2 max-w-3xl">
              Non-punitive summary for <span class="text-slate-200 font-medium">{displayName}</span>. Nothing in this
              modal was executed outside your browser; the payload below is the staged simulation text only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 shrink-0"
          >
            Close
          </button>
        </div>
        <div class="px-6 py-5 overflow-y-auto flex-1 space-y-6 text-sm sm:text-base text-slate-200 leading-relaxed">
          <section class="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 sm:p-5">
            <h3 class="text-xs font-semibold text-amber-200/95 uppercase tracking-wide mb-3">
              What went wrong (high level)
            </h3>
            <p class="text-slate-100 text-[15px] sm:text-base leading-relaxed">{highLevelParagraph}</p>
            <p class="text-slate-300 text-[15px] sm:text-base leading-relaxed mt-4">{watchOutParagraph}</p>
          </section>

          <section class="rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
            <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Simulation run metadata
            </h3>
            <div class="overflow-x-auto rounded-lg border border-slate-800/80">
              <table class="w-full text-left text-sm border-collapse min-w-[280px]">
                <tbody>
                  {metaRows.map(([label, value]) => (
                    <tr key={label} class="border-b border-slate-800/60 last:border-0">
                      <th
                        scope="row"
                        class="py-2.5 px-3 text-slate-500 font-medium align-top whitespace-nowrap w-[40%] sm:w-48 bg-slate-900/50"
                      >
                        {label}
                      </th>
                      <td class="py-2.5 px-3 text-slate-200 font-mono text-xs break-words align-top">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div class="grid md:grid-cols-2 gap-5">
            <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <p class="text-xs font-semibold text-amber-200/90 uppercase tracking-wide mb-3">
                Emotional manipulation patterns
              </p>
              <ul class="list-disc pl-5 space-y-3 text-slate-300 text-sm">
                <li>
                  <strong class="text-white">False scarcity:</strong> “before the audit window closes” or “only two
                  approvers online” to rush verification.
                </li>
                <li>
                  <strong class="text-white">Social proof &amp; hierarchy:</strong> impersonation of a sponsor or owner
                  you respect, paired with plausible project jargon.
                </li>
                <li>
                  <strong class="text-white">Fear of professional harm:</strong> subtle shame (“avoid another repeat of
                  last quarter”) to bypass healthy skepticism.
                </li>
                <li>
                  <strong class="text-white">Helpfulness bait:</strong> offers to “fix it for you” with a single
                  click—especially after hours.
                </li>
              </ul>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <p class="text-xs font-semibold text-cyan-200/90 uppercase tracking-wide mb-3">
                Technical credibility cues
              </p>
              <ul class="list-disc pl-5 space-y-3 text-slate-300 text-sm">
                <li>
                  <strong class="text-white">Cloud &amp; billing:</strong> GCP cost anomalies, Azure tenant/subscription
                  IDs, or “break-glass” identity language.
                </li>
                <li>
                  <strong class="text-white">DevOps &amp; delivery:</strong> Argo CD revisions, GitHub repo paths, canary
                  templates, or Datadog monitor IDs.
                </li>
                <li>
                  <strong class="text-white">ITSM &amp; compliance:</strong> Jira epic keys, ServiceNow change
                  templates, Lacework reports, Splunk saved searches.
                </li>
                <li>
                  <strong class="text-white">Artifact bait:</strong> versioned filenames tied to a one-click action.
                </li>
              </ul>
            </div>
          </div>

          <section class="rounded-lg bg-slate-950/80 border border-slate-800 p-4 sm:p-5">
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              CMDB contextual anchors (technical)
            </h3>
            <p class="text-xs text-slate-500 mb-3">
              These strings were the synthetic “proof points” bundled into the MCP-style context for this run. In a
              real attack they might be scraped or leaked; here they only mirror your mock inventory.
            </p>
            <ul class="space-y-1.5 font-mono text-xs sm:text-sm text-cyan-200/90 break-all max-h-48 overflow-y-auto">
              {anchors.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>

          {bodyHtml ? (
            <section class="rounded-lg border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
              <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Staged body HTML (technical excerpt)
              </h3>
              <p class="text-xs text-slate-500 mb-2">
                Raw HTML as approved/staged for telemetry (sandboxed elsewhere in the app). Shown here for indicator
                review only.
              </p>
              <pre class="text-[11px] sm:text-xs leading-relaxed text-slate-300 bg-black/40 border border-slate-800 rounded-lg p-3 max-h-52 overflow-auto whitespace-pre-wrap">
                {truncate(bodyHtml, 3500)}
              </pre>
            </section>
          ) : null}
        </div>
        <div class="px-6 py-4 border-t border-slate-800 flex justify-end shrink-0 bg-slate-900/95">
          <button
            type="button"
            onClick={onClose}
            class="rounded-lg bg-slayer-accent/90 text-slate-900 font-semibold px-5 py-2.5 text-sm hover:bg-sky-300"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
