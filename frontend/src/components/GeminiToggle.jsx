/**
 * @param {{ checked: boolean; onChange: (v: boolean) => void; keyConfigured: boolean | null; disabled?: boolean }} props
 */
export function GeminiToggle({ checked, onChange, keyConfigured, disabled }) {
  return (
    <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
      <input
        type="checkbox"
        class="rounded border-p4g-lineStrong bg-white text-p4g-ink focus:ring-p4g-ink"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>
        Use Gemini LLM
        {keyConfigured === false ? (
          <span class="text-amber-700 text-xs ml-1">(no key — mock fallback)</span>
        ) : keyConfigured ? (
          <span class="text-emerald-700 text-xs ml-1">(key configured)</span>
        ) : null}
      </span>
    </label>
  );
}
