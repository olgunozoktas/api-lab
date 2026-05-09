import { useStore } from "../store";
import { useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { useT } from "../lib/i18n/useT";
import { SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from "../lib/i18n";

export function TopBar() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const [editing, setEditing] = useState(false);

  const cycleTheme = () => {
    const order = ["auto", "light", "dark"] as const;
    const next = order[(order.indexOf(ui.theme) + 1) % 3];
    setUi({ theme: next });
    document.documentElement.style.colorScheme = next === "auto" ? "light dark" : next;
    showToast(t("topbar.theme.toast", { name: next }));
  };

  const iconBtn =
    "text-xs px-2.5 py-1 rounded-md text-[var(--color-fg-muted)] " +
    "hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]";
  const select =
    "bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] " +
    "rounded-md px-2.5 py-1 text-xs";

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-3 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
        </div>
        <div className="flex-1" />
        <select
          aria-label={t("lang.label")}
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className={select}
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>{t(LOCALE_LABEL[code])}</option>
          ))}
        </select>
        <select
          aria-label="Environment"
          value={activeEnv}
          onChange={(e) => setActiveEnv(e.target.value)}
          className={select}
        >
          {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className={iconBtn} onClick={() => setEditing(true)}>{t("topbar.envEdit")}</button>
        <button className={iconBtn} onClick={cycleTheme}>{t("topbar.theme")}</button>
      </header>
      {editing && <EnvEditorModal onClose={() => setEditing(false)} />}
    </>
  );
}
