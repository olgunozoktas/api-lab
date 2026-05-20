/** Olgun Özoktaş geliştirdi · API Lab */
// Request defaults section — timeout, follow-redirects, insecure-TLS,
// proxy URL, proxy bypass list, and the conditional "Reset to
// defaults" row. Extracted from SettingsModal.tsx to honor the
// 400-LOC cap; the contained `ResetDefaultsRow` stays adjacent here
// because it is only used by this section.
import { useStore } from "../../store";
import { useT } from "../../lib/i18n/useT";
import { defaultRequestDefaults, type RequestDefaults } from "../../lib/types";
import { cn } from "../../lib/cn";
import { Field } from "./primitives";

export function RequestDefaultsSettings() {
  const defaults = useStore((s) => s.defaults);
  const setDefaults = useStore((s) => s.setDefaults);
  const t = useT();
  return (
    <section aria-labelledby="settings-defaults">
      <h3
        id="settings-defaults"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
      >
        {t("settings.section.defaults")}
      </h3>
      <div className="space-y-3">
        <Field label={t("settings.timeoutMs")} hint={t("settings.timeoutMs.hint")}>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            max={600000}
            step={1000}
            value={defaults.timeoutMs}
            onChange={(e) =>
              setDefaults({ timeoutMs: Math.max(1000, Number(e.target.value) || 60000) })
            }
            className={cn(
              "px-2 py-1 rounded-md border border-[var(--color-border)]",
              "bg-[var(--color-bg)] text-[var(--color-fg)] text-sm",
              "w-32"
            )}
          />
        </Field>
        <Field label={t("settings.followRedirects")} hint={t("settings.followRedirects.hint")}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={defaults.followRedirects}
            onChange={(e) =>
              setDefaults({
                followRedirects: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
              })
            }
            className={cn(
              "px-2 py-1 rounded-md border border-[var(--color-border)]",
              "bg-[var(--color-bg)] text-[var(--color-fg)] text-sm",
              "w-24"
            )}
          />
        </Field>
        <Field label={t("settings.insecure")} hint={t("settings.insecure.hint")} layout="row">
          <input
            type="checkbox"
            checked={defaults.insecure}
            onChange={(e) => setDefaults({ insecure: e.target.checked })}
            className="cursor-pointer"
            aria-label={t("settings.insecure")}
          />
        </Field>
        <Field label={t("settings.proxy")} hint={t("settings.proxy.hint")}>
          <input
            type="text"
            value={defaults.proxyUrl ?? ""}
            placeholder="http://127.0.0.1:8080"
            onChange={(e) => setDefaults({ proxyUrl: e.target.value })}
            className="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] text-[var(--color-fg)] w-full"
            aria-label={t("settings.proxy")}
          />
        </Field>
        <Field label={t("settings.proxyBypass")} hint={t("settings.proxyBypass.hint")}>
          <input
            type="text"
            value={defaults.proxyBypass ?? ""}
            placeholder="localhost,127.0.0.1,*.internal"
            onChange={(e) => setDefaults({ proxyBypass: e.target.value })}
            className="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] text-[var(--color-fg)] w-full"
            aria-label={t("settings.proxyBypass")}
          />
        </Field>
        <ResetDefaultsRow
          defaults={defaults}
          onReset={() => setDefaults(defaultRequestDefaults())}
        />
      </div>
    </section>
  );
}

// Conditional "Reset to defaults" row — only renders when at least
// one current Defaults field differs from the shipped baseline. Lets
// the user undo a session of tweaking without remembering each
// original value. Hidden when nothing's changed so the section stays
// clean by default.
function ResetDefaultsRow({
  defaults,
  onReset,
}: {
  defaults: RequestDefaults;
  onReset: () => void;
}) {
  const t = useT();
  const baseline = defaultRequestDefaults();
  const dirty =
    defaults.timeoutMs !== baseline.timeoutMs ||
    defaults.followRedirects !== baseline.followRedirects ||
    defaults.insecure !== baseline.insecure;
  if (!dirty) return null;
  return (
    <div className="pt-2 mt-1 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
      <p className="text-2xs text-[var(--color-fg-muted)]">{t("settings.defaults.dirtyHint")}</p>
      <button
        type="button"
        onClick={onReset}
        className="text-2xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
      >
        {t("settings.defaults.reset")}
      </button>
    </div>
  );
}
