import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "../lib/i18n/useT";
import { useStore } from "../store";
import { CHANGELOG_ENTRIES, APP_VERSION, selectChangelogEntries } from "../lib/changelog";
import { ChangelogEntryCard } from "./ChangelogEntryCard";

export type ChangelogModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Container — owns the i18n strings + entry list. Body is delegated
// to ChangelogEntryCard (pure presenter). Empty state is intentional:
// any project that exposes the modal with no entries should still
// surface something rather than render nothing.
export function ChangelogModal({ open, onOpenChange }: ChangelogModalProps) {
  const t = useT();
  const locale = useStore((s) => s.locale);
  // Pick the active-locale variant of each entry. Recomputes when the
  // user switches language in Settings.
  const entries = useMemo(() => selectChangelogEntries(CHANGELOG_ENTRIES, locale), [locale]);
  const unreleasedLabel = t("changelog.unreleased");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[92vw] max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base flex items-baseline gap-2">
            {t("changelog.title")}
            <span className="text-xs font-normal text-[var(--color-fg-muted)] font-mono">
              v{APP_VERSION}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">{t("changelog.empty")}</p>
          ) : (
            entries.map((entry) => (
              <ChangelogEntryCard
                key={entry.sourcePath}
                entry={entry}
                unreleasedLabel={unreleasedLabel}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
