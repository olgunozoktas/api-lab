/** Olgun Özoktaş geliştirdi · API Lab */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "../lib/i18n/useT";
import { SyncSettings } from "./SyncSettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { RequestDefaultsSettings } from "./settings/RequestDefaultsSettings";
import { ShortcutsReference } from "./settings/ShortcutsReference";
import { SampleRequestsPanel } from "./settings/SampleRequestsPanel";
import { AboutCard } from "./settings/AboutCard";

// =============================================================================
// SettingsModal — central place for appearance + request defaults +
// keyboard reference. Each section lives in its own file under
// `components/settings/`; this module is the Dialog shell + section
// list, kept thin so adding a new section never pushes the file over
// the 400-LOC cap.
// =============================================================================

export type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base">{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-6">
          <AppearanceSettings />
          <RequestDefaultsSettings />
          <SyncSettings />
          <ShortcutsReference />
          <SampleRequestsPanel />
          <section aria-labelledby="settings-about">
            <h3
              id="settings-about"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
            >
              {t("settings.section.about")}
            </h3>
            <AboutCard onClose={() => onOpenChange(false)} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
