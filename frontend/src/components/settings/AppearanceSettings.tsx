/** Olgun Özoktaş geliştirdi · API Lab */
// Appearance section — theme picker, language picker, update-check
// toggle. Extracted from SettingsModal.tsx to honor the 400-LOC cap.
import { useStore } from "../../store";
import { useT } from "../../lib/i18n/useT";
import { THEMES } from "../../lib/types";
import { SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from "../../lib/i18n";
import { Field, Pill, ThemeSwatch } from "./primitives";

export function AppearanceSettings() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const t = useT();
  return (
    <section aria-labelledby="settings-appearance">
      <h3
        id="settings-appearance"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
      >
        {t("settings.section.appearance")}
      </h3>
      <div className="space-y-3">
        <Field label={t("settings.theme")}>
          <div role="radiogroup" aria-label={t("settings.theme")} className="flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <ThemeSwatch
                key={theme}
                theme={theme}
                label={t(`settings.theme.${theme}`)}
                active={ui.theme === theme}
                onSelect={() => setUi({ theme })}
              />
            ))}
          </div>
        </Field>

        <Field label={t("settings.language")}>
          <div role="radiogroup" aria-label={t("settings.language")} className="flex gap-2">
            {SUPPORTED_LOCALES.map((code) => (
              <Pill key={code} active={locale === code} onClick={() => setLocale(code as Locale)}>
                {t(LOCALE_LABEL[code])}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label={t("settings.updateCheck")} hint={t("settings.updateCheck.hint")} layout="row">
          <input
            type="checkbox"
            checked={ui.updateCheck !== false}
            onChange={(e) => setUi({ updateCheck: e.target.checked })}
            className="cursor-pointer"
            aria-label={t("settings.updateCheck")}
          />
        </Field>
      </div>
    </section>
  );
}
