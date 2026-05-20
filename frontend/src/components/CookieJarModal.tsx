/** Olgun Özoktaş geliştirdi · API Lab */
// Cookie jar — minimal v1 surface. Auto-capture handles writes (every
// `Set-Cookie` response header folds into the jar via the send
// pipeline); the modal is a read/delete view so the user can:
//   - audit what cookies are stored (useful when a session API is
//     misbehaving and the user needs to confirm what's being sent)
//   - delete a stale or wrong cookie
//   - flush the whole jar
//
// Add / edit is intentionally NOT in v1 — the natural workflow is
// "hit the login endpoint, captured cookie replays on subsequent
// requests automatically". Manual add becomes a useful follow-up
// only after a real "I need to seed a cookie without a login" need
// surfaces.
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { Trash2 } from "lucide-react";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

export function CookieJarModal({ open, onOpenChange }: Props) {
  const cookies = useStore((s) => s.cookies);
  const removeCookie = useStore((s) => s.removeCookie);
  const clearCookies = useStore((s) => s.clearCookies);
  const t = useT();
  const [filter, setFilter] = useState("");

  // Domain-grouped + alphabetically sorted view — easier to scan
  // than a flat list when the jar grows past a handful.
  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? cookies.filter(
          (c) =>
            c.domain.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.path.toLowerCase().includes(q)
        )
      : cookies;
    const byDomain = new Map<string, typeof cookies>();
    for (const c of filtered) {
      const arr = byDomain.get(c.domain) ?? [];
      arr.push(c);
      byDomain.set(c.domain, arr);
    }
    return Array.from(byDomain.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([domain, list]) =>
          [domain, [...list].sort((a, b) => a.name.localeCompare(b.name))] as const
      );
  }, [cookies, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cookies.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={filter}
            placeholder={t("cookies.filterPlaceholder")}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)] text-[var(--color-fg)]"
            aria-label={t("cookies.filterPlaceholder")}
          />
          {cookies.length === 0 ? (
            <EmptyState
              size="compact"
              title={t("cookies.empty")}
              description={t("cookies.emptyHint")}
            />
          ) : groups.length === 0 ? (
            <EmptyState size="compact" title={t("cookies.noMatches")} />
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-3">
              {groups.map(([domain, list]) => (
                <section key={domain}>
                  <h3 className="text-2xs font-mono uppercase tracking-wide text-[var(--color-fg-muted)] mb-1">
                    {domain}
                  </h3>
                  <ul className="space-y-0.5">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className="grid items-center gap-2 px-2 py-1 rounded hover:bg-[var(--color-bg-elev-2)]"
                        style={{ gridTemplateColumns: "1fr 1.5fr auto auto" }}
                      >
                        <span className="text-xs truncate font-mono" title={c.name}>
                          {c.name}
                        </span>
                        <span
                          className="text-xs text-[var(--color-fg-muted)] truncate font-mono"
                          title={c.value}
                        >
                          {c.value}
                        </span>
                        <span className="text-2xs text-[var(--color-fg-muted)] font-mono">
                          {c.path}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCookie(c.id)}
                          aria-label={t("cookies.delete")}
                          title={t("cookies.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          {cookies.length > 0 && (
            <Button variant="ghost" onClick={() => clearCookies()}>
              {t("cookies.clearAll")}
            </Button>
          )}
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            {t("dialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
