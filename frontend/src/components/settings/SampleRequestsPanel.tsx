/** Olgun Özoktaş geliştirdi · API Lab */
// Sample Requests panel — lives in Settings as the canonical
// "where do I find all my samples?" surface. Reads the full SAMPLES
// manifest regardless of hidden state and lets the user toggle each
// sample's visibility plus the section-level visibility, with a
// single "Show all" button as the recovery action. Extracted from
// SettingsModal.tsx to honor the 400-LOC cap.
import { useStore } from "../../store";
import { useT } from "../../lib/i18n/useT";
import { SAMPLES } from "../../lib/samples";
import { Eye, EyeOff } from "lucide-react";

export function SampleRequestsPanel() {
  const t = useT();
  const hiddenIds = useStore((s) => s.hiddenSampleIds);
  const sectionHidden = useStore((s) => s.samplesSectionHidden);
  const hideSample = useStore((s) => s.hideSample);
  const showSample = useStore((s) => s.showSample);
  const showAllSamples = useStore((s) => s.showAllSamples);
  const setSamplesSectionHidden = useStore((s) => s.setSamplesSectionHidden);
  return (
    <section aria-labelledby="settings-samples">
      <h3
        id="settings-samples"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
      >
        {t("settings.section.samples")}
      </h3>
      <p className="text-xs text-[var(--color-fg-muted)] mb-3">{t("samples.section.publicHint")}</p>
      <div className="flex items-center justify-between gap-3 mb-3">
        <label className="text-xs flex items-center gap-2">
          <input
            type="checkbox"
            checked={!sectionHidden}
            onChange={(e) => setSamplesSectionHidden(!e.target.checked)}
          />
          {t("settings.samples.showSection")}
        </label>
        <button
          type="button"
          onClick={showAllSamples}
          className="text-xs px-2 py-1 rounded bg-[var(--color-bg-elev-2)] hover:bg-[var(--color-bg-elev)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          {t("settings.samples.showAll")}
        </button>
      </div>
      <ul className="space-y-1">
        {SAMPLES.map((s) => {
          const hidden = hiddenIds.includes(s.id);
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--color-bg-elev)]"
            >
              <span className="text-xs flex-1 truncate" title={t(s.descriptionKey)}>
                {t(s.nameKey)}
              </span>
              <button
                type="button"
                onClick={() => (hidden ? showSample(s.id) : hideSample(s.id))}
                aria-pressed={!hidden}
                title={hidden ? t("settings.samples.show") : t("settings.samples.hide")}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
