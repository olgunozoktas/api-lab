/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "./ui/dialog";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import { methodClass, statusPillClass, statusText } from "../lib/utils";
import type { CollectionItem, HistoryItem, OpenTab } from "../lib/types";
import { History, FolderOpen, LayoutGrid } from "lucide-react";

// =============================================================================
// QuickSwitcher — ⌘+P / Ctrl+P modal. Fuzzy-search across:
//   1. Open tabs (jump-to-tab)
//   2. Collections (load into current tab)
//   3. Recent history items (load into current tab)
//
// Keyboard:
//   ↑/↓        — navigate items
//   Enter      — activate selected
//   Cmd/Ctrl-Enter — open in NEW tab
//   Esc        — close
// =============================================================================

type Item =
  | { kind: "tab"; tab: OpenTab }
  | { kind: "collection"; col: CollectionItem }
  | { kind: "history"; entry: HistoryItem };

function score(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 2;
  // Sub-sequence match (each char of query appears in order)
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  return qi === q.length ? 1 : 0;
}

function rankItems(query: string, items: Item[]): Item[] {
  const scored = items.map((item) => {
    const text =
      item.kind === "tab"
        ? `${item.tab.name} ${item.tab.request.url} ${item.tab.request.method}`
        : item.kind === "collection"
          ? `${item.col.name} ${item.col.request!.url} ${item.col.request!.method}`
          : `${item.entry.request.url} ${item.entry.request.method}`;
    return { item, s: score(query, text) };
  });
  return scored.filter((x) => x.s > 0).map((x) => x.item);
}

export type QuickSwitcherProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickSwitcher({ open, onOpenChange }: QuickSwitcherProps) {
  const tabs = useStore((s) => s.tabs);
  // Read the raw items array (reference stable until store mutates), then
  // filter via useMemo. Filtering INSIDE the selector returns a new array
  // every render → Object.is comparison in useSyncExternalStore sees a
  // different snapshot every time → infinite re-render loop → React
  // crashes with #185 "Maximum update depth exceeded". Trapped 2026-05-09.
  const allCollectionItems = useStore((s) => s.collectionItems);
  const collections = useMemo(
    () => allCollectionItems.filter((c) => c.kind === "request" && !!c.request),
    [allCollectionItems]
  );
  const history = useStore((s) => s.history);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const loadCollection = useStore((s) => s.loadCollection);
  const loadCollectionInNewTab = useStore((s) => s.loadCollectionInNewTab);
  const loadHistoryItem = useStore((s) => s.loadHistoryItem);
  const newTab = useStore((s) => s.newTab);
  const t = useT();

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on every open. Keeps each invocation fresh.
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Microtask delay so Radix's autoFocus doesn't fight us.
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      ...tabs.map((tab) => ({ kind: "tab" as const, tab })),
      ...collections.map((col) => ({ kind: "collection" as const, col })),
      ...history.slice(0, 50).map((entry) => ({ kind: "history" as const, entry })),
    ];
    return rankItems(query, base);
  }, [tabs, collections, history, query]);

  const visibleHighlight = Math.min(highlight, Math.max(0, items.length - 1));

  const activate = (item: Item, openInNew: boolean) => {
    if (item.kind === "tab") {
      setActiveTab(item.tab.id);
    } else if (item.kind === "collection") {
      if (openInNew) loadCollectionInNewTab(item.col);
      else loadCollection(item.col);
    } else if (item.kind === "history") {
      if (openInNew) {
        newTab();
        loadHistoryItem(item.entry);
      } else {
        loadHistoryItem(item.entry);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-label="Quick switcher"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "fixed left-1/2 top-[15%] z-[1001] w-[640px] max-w-[92vw] -translate-x-1/2",
            "bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-xl shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
          )}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = items[visibleHighlight];
              if (item) activate(item, e.metaKey || e.ctrlKey);
            }
          }}
        >
          {/* Hidden a11y title — Radix Dialog requires one */}
          <DialogPrimitive.Title className="sr-only">Quick switcher</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t("switcher.placeholder")}
          </DialogPrimitive.Description>

          <div className="p-3 border-b border-[var(--color-border)]">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              placeholder={t("switcher.placeholder")}
              className={cn(
                "w-full bg-transparent outline-none text-sm",
                "placeholder:text-[var(--color-fg-muted)]"
              )}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--color-fg-muted)]">
                {t("switcher.empty")}
              </div>
            ) : (
              items.map((item, i) => {
                const active = i === visibleHighlight;
                return (
                  <button
                    key={
                      item.kind === "tab"
                        ? `tab:${item.tab.id}`
                        : item.kind === "collection"
                          ? `col:${item.col.id}`
                          : `hist:${item.entry.id}`
                    }
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={(e) => activate(item, e.metaKey || e.ctrlKey)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                      "transition-colors duration-75",
                      active
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-fg)]"
                        : "text-[var(--color-fg)] hover:bg-[var(--color-bg)]/60"
                    )}
                  >
                    <span className="shrink-0 text-[var(--color-fg-muted)]">
                      {item.kind === "tab" ? (
                        <LayoutGrid className="w-3.5 h-3.5" />
                      ) : item.kind === "collection" ? (
                        <FolderOpen className="w-3.5 h-3.5" />
                      ) : (
                        <History className="w-3.5 h-3.5" />
                      )}
                    </span>

                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-mono font-semibold uppercase w-12",
                        methodClass(
                          item.kind === "tab"
                            ? item.tab.request.method
                            : item.kind === "collection"
                              ? item.col.request!.method
                              : item.entry.request.method
                        )
                      )}
                    >
                      {item.kind === "tab"
                        ? item.tab.request.method
                        : item.kind === "collection"
                          ? item.col.request!.method
                          : item.entry.request.method}
                    </span>

                    <span className="flex-1 min-w-0 truncate text-sm">
                      {item.kind === "tab"
                        ? item.tab.name
                        : item.kind === "collection"
                          ? item.col.name
                          : item.entry.request.url || "(empty)"}
                    </span>

                    {item.kind === "history" ? (
                      <span
                        className={
                          "shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded " +
                          statusPillClass(item.entry.response.status)
                        }
                        title={
                          item.entry.response.status > 0
                            ? `${item.entry.response.status} ${statusText(
                                item.entry.response.status
                              )}`.trim()
                            : undefined
                        }
                      >
                        {item.entry.response.status > 0 ? item.entry.response.status : "—"}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-[var(--color-fg-muted)] truncate max-w-[200px]">
                        {item.kind === "tab" ? item.tab.request.url : item.col.request!.url}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div
            className={cn(
              "px-3 py-2 border-t border-[var(--color-border)]",
              "text-[10px] text-[var(--color-fg-muted)] flex items-center gap-3 justify-end"
            )}
          >
            <kbd className="font-mono">↵</kbd>
            <span>open</span>
            <kbd className="font-mono">⌘↵</kbd>
            <span>open in new tab</span>
            <kbd className="font-mono">esc</kbd>
            <span>close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
