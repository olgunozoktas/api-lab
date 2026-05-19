/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "../lib/i18n/useT";
import { useStore } from "../store";
import { GUIDES, groupGuides, searchGuides, selectGuides, type GuideEntry } from "../lib/guides";
import { GuideCard } from "./GuideCard";
import { EmptyState } from "./ui/empty-state";
import { cn } from "../lib/cn";

export type GuideHubProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional initial-slug — caller can deep-link to a specific guide
  // (e.g. press `?` while gRPC tab is visible → opens with the gRPC
  // guide pre-selected).
  initialSlug?: string;
};

// Container — owns search state + selected entry. Body is delegated
// to <GuideCard>. Sidebar nav list is inline (small, doesn't earn
// its own component).
export function GuideHub({ open, onOpenChange, initialSlug }: GuideHubProps) {
  const t = useT();
  const locale = useStore((s) => s.locale);
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Pick the active-locale variant of each guide. Recomputes when the
  // user switches language in Settings — the modal re-renders with TR
  // bodies on the next paint.
  const localized = useMemo(() => selectGuides(GUIDES, locale), [locale]);

  // Reset selection when modal opens (or jump to initialSlug).
  useEffect(() => {
    if (!open) return;
    if (initialSlug && localized.some((g) => g.slug === initialSlug)) {
      setSelectedSlug(initialSlug);
      return;
    }
    setSelectedSlug(localized[0]?.slug ?? null);
    setQuery("");
  }, [open, initialSlug, localized]);

  const filtered = useMemo<GuideEntry[]>(() => searchGuides(localized, query), [localized, query]);
  const groups = useMemo(() => groupGuides(filtered), [filtered]);

  // If the current selection got filtered out, fall back to the first
  // visible entry so the right pane never renders an empty slot.
  const effectiveSlug =
    selectedSlug && filtered.some((g) => g.slug === selectedSlug)
      ? selectedSlug
      : (filtered[0]?.slug ?? null);
  const selected = effectiveSlug ? localized.find((g) => g.slug === effectiveSlug) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[92vw] h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base">{t("guides.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[260px_1fr] min-h-0">
          {/* Sidebar */}
          <aside className="border-r border-[var(--color-border)] flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("guides.search.placeholder")}
                aria-label={t("guides.search.placeholder")}
                className="w-full h-8 px-2 rounded text-xs bg-[var(--color-bg)] border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2 text-sm">
              {groups.length === 0 ? (
                <EmptyState size="compact" title={t("guides.search.empty")} />
              ) : (
                groups.map((g) => (
                  <div key={g.group} className="mb-3">
                    <p className="text-3xs uppercase tracking-wide font-semibold text-[var(--color-fg-muted)] px-2 mb-1">
                      {g.group}
                    </p>
                    <ul role="list">
                      {g.entries.map((e) => (
                        <li key={e.slug}>
                          <button
                            type="button"
                            onClick={() => setSelectedSlug(e.slug)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg)]",
                              effectiveSlug === e.slug &&
                                "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
                            )}
                          >
                            {e.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </nav>
          </aside>

          {/* Main pane */}
          <main className="overflow-y-auto px-6 py-5 min-h-0">
            {selected ? (
              <GuideCard entry={selected} />
            ) : (
              <p className="text-sm text-[var(--color-fg-muted)]">{t("guides.empty")}</p>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
