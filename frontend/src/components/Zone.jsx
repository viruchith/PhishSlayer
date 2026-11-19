/**
 * Shared light-theme panel (Vercel-inspired surface).
 */
export function Zone({ title, subtitle, children, className = "" }) {
  return (
    <section class={`v-card animate-fadeUp ${className}`}>
      <header class="v-card-header">
        <h2 class="text-sm font-semibold text-p4g-ink tracking-tight">{title}</h2>
        {subtitle ? <p class="text-xs text-p4g-muted mt-0.5 leading-relaxed">{subtitle}</p> : null}
      </header>
      <div class="p-4">{children}</div>
    </section>
  );
}
