import { useStore } from "../store";
import { useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { useT } from "../lib/i18n/useT";
import { SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from "../lib/i18n";
import { Button } from "./ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Languages, Palette, Settings2 } from "lucide-react";

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

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-2 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
        </div>
        <div className="flex-1" />

        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger aria-label={t("lang.label")} className="w-auto">
            <Languages className="w-3 h-3 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((code) => (
              <SelectItem key={code} value={code}>{t(LOCALE_LABEL[code])}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeEnv} onValueChange={setActiveEnv}>
          <SelectTrigger aria-label={t("topbar.envSelect")} className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {envs.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Settings2 className="w-3.5 h-3.5" />
          {t("topbar.envEdit")}
        </Button>
        <Button variant="ghost" size="sm" onClick={cycleTheme}>
          <Palette className="w-3.5 h-3.5" />
          {t("topbar.theme")}
        </Button>
      </header>
      {editing && <EnvEditorModal open onOpenChange={(o) => !o && setEditing(false)} />}
    </>
  );
}
