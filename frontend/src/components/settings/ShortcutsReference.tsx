/** Olgun Özoktaş geliştirdi · API Lab */
// Keyboard reference — renders the canonical lib/shortcuts.ts map as
// a two-column grid. Extracted from SettingsModal.tsx to honor the
// 400-LOC cap.
import { useT } from "../../lib/i18n/useT";
import { SHORTCUTS } from "../../lib/shortcuts";
import { Shortcut } from "./primitives";

export function ShortcutsReference() {
  const t = useT();
  return (
    <section aria-labelledby="settings-shortcuts">
      <h3
        id="settings-shortcuts"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
      >
        {t("settings.section.shortcuts")}
      </h3>
      {/* Rendered from the canonical lib/shortcuts.ts map — see
          that file for why this list is no longer hand-written. */}
      <ul className="text-xs text-[var(--color-fg)] space-y-1.5 grid grid-cols-2 gap-x-6">
        {SHORTCUTS.map((s) => (
          <Shortcut key={s.labelKey} keys={s.keys} label={t(s.labelKey)} />
        ))}
      </ul>
    </section>
  );
}
