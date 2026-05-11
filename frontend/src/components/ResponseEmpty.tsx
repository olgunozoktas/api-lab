import { useMemo } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { humanSize, methodClass, statusPillClass, timeAgo } from "../lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Copy, ExternalLink, Play, Trash2 } from "lucide-react";
import type { HistoryItem } from "../lib/types";

const MAX_GROUPS = 8;

// One unique (method + url) group, with the most recent entry as the
// representative and a count of how many times it was sent. The id
// stays the latest entry's id so click → loadHistoryItem replays the
// freshest snapshot.
type Group = {
  key: string;
  latest: HistoryItem;
  count: number;
};

function groupRecent(items: HistoryItem[], limit: number): Group[] {
  const byKey = new Map<string, Group>();
  for (const h of items) {
    const key = `${h.request.method} ${h.request.url}`;
    const g = byKey.get(key);
    if (g) {
      g.count += 1;
    } else {
      byKey.set(key, { key, latest: h, count: 1 });
    }
  }
  // Preserve insertion order — `items` is already most-recent-first.
  return Array.from(byKey.values()).slice(0, limit);
}

export function ResponseEmpty() {
  const t = useT();
  const history = useStore((s) => s.history);
  const loadHistoryItem = useStore((s) => s.loadHistoryItem);
  const openHistoryItemInNewTab = useStore((s) => s.openHistoryItemInNewTab);
  const removeHistoryItem = useStore((s) => s.removeHistoryItem);
  const showToast = useStore((s) => s.showToast);

  const groups = useMemo(() => groupRecent(history, MAX_GROUPS), [history]);

  const onCopyUrl = (h: HistoryItem) => {
    navigator.clipboard
      .writeText(h.request.url || "")
      .then(() => showToast(t("history.context.urlCopied")));
  };

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-[var(--color-fg-muted)] gap-2 flex-col">
        <div>{t("response.empty.title")}</div>
        <div className="text-[11px] flex items-center gap-1.5">
          <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
          <Kbd>⌘</Kbd>+<Kbd>S</Kbd>
          <Kbd>⌘</Kbd>+<Kbd>N</Kbd>
          <span>{t("response.empty.shortcuts")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center text-[var(--color-fg-muted)]">
          <div className="text-sm">{t("response.empty.title")}</div>
          <div className="text-[11px] flex items-center justify-center gap-1.5 mt-1">
            <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
            <Kbd>⌘</Kbd>+<Kbd>S</Kbd>
            <Kbd>⌘</Kbd>+<Kbd>N</Kbd>
            <span>{t("response.empty.shortcuts")}</span>
          </div>
        </header>

        <section>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-[var(--color-fg)]">
              {t("response.empty.recentHistory")}
            </h3>
            <span className="text-[10px] text-[var(--color-fg-muted)]">
              {t("response.empty.recentHistoryHint")}
            </span>
          </div>
          <ul role="list" className="space-y-1.5">
            {groups.map((g) => (
              <ContextMenu key={g.key}>
                <ContextMenuTrigger asChild>
                  <li>
                    <RecentRow
                      group={g}
                      onLoad={() => loadHistoryItem(g.latest)}
                      pickHint={t("response.empty.pickHint")}
                      countLabel={t("response.empty.sentCount", { n: String(g.count) })}
                    />
                  </li>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => loadHistoryItem(g.latest)}>
                    <Play className="w-3.5 h-3.5" aria-hidden />
                    {t("history.context.replay")}
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => openHistoryItemInNewTab(g.latest)}>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    {t("history.context.openInNewTab")}
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => onCopyUrl(g.latest)}>
                    <Copy className="w-3.5 h-3.5" aria-hidden />
                    {t("history.context.copyUrl")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => removeHistoryItem(g.latest.id)}>
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    {t("history.context.delete")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function RecentRow({
  group,
  onLoad,
  pickHint,
  countLabel,
}: {
  group: Group;
  onLoad: () => void;
  pickHint: string;
  countLabel: string;
}) {
  const h = group.latest;
  const status = h.response.status;
  return (
    <button
      type="button"
      onClick={onLoad}
      title={pickHint}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-accent)]/40 transition-colors"
    >
      <span
        className={`text-[10px] font-mono font-semibold uppercase tracking-wide w-10 shrink-0 ${methodClass(h.request.method)}`}
      >
        {h.request.method}
      </span>
      <span
        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${statusPillClass(status)}`}
      >
        {status || "—"}
      </span>
      <span className="flex-1 truncate font-mono text-xs text-[var(--color-fg)]">
        {h.request.url || "—"}
      </span>
      <span className="hidden sm:inline text-[10px] text-[var(--color-fg-muted)] tabular-nums shrink-0">
        {humanSize(h.response.sizeBytes)}
      </span>
      <span className="text-[10px] text-[var(--color-fg-muted)] tabular-nums shrink-0 w-12 text-right">
        {Math.round(h.response.elapsedMs)}ms
      </span>
      <span className="text-[10px] text-[var(--color-fg-muted)] tabular-nums shrink-0 w-9 text-right">
        {timeAgo(h.ts)}
      </span>
      {group.count > 1 && (
        <span
          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
          aria-label={countLabel}
          title={countLabel}
        >
          ×{group.count}
        </span>
      )}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}
