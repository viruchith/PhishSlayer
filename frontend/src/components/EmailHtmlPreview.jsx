/**
 * Sandboxed rendering of analyst-edited HTML (simulated email body).
 * `sandbox=""` disables scripts; content is still treated as untrusted.
 */
export function EmailHtmlPreview({ subject, html }) {
  const raw = typeof html === "string" ? html : "";
  const inner = raw.trim()
    ? raw
    : '<p style="color:#64748b;margin:0;">No HTML to preview yet.</p>';
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base target="_blank" rel="noopener noreferrer"/><style>
    body{margin:0;padding:14px 16px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;background:#f1f5f9;}
    a{color:#0369a1;}
    code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;}
  </style></head><body>${inner}</body></html>`;

  return (
    <div class="space-y-2">
      {subject ? (
        <div class="rounded-lg border border-p4g-line bg-white px-3 py-2 text-xs text-gray-700">
          <span class="text-p4g-faint font-semibold uppercase tracking-wide mr-2">Subject</span>
          <span class="text-p4g-ink">{subject}</span>
        </div>
      ) : null}
      <div class="rounded-lg border border-p4g-line overflow-hidden bg-gray-100 min-h-[52vh]">
        <iframe
          title="Simulated email HTML preview"
          class="w-full min-h-[52vh] h-[52vh] bg-white"
          sandbox=""
          srcDoc={srcDoc}
        />
      </div>
      <p class="text-[10px] text-p4g-faint">
        Preview uses a sandboxed iframe (no scripts). Links open in a new tab when allowed by the browser.
      </p>
    </div>
  );
}
