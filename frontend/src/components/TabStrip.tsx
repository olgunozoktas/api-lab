/** Olgun Özoktaş geliştirdi · API Lab */
import { useRef, useState, useCallback, useEffect } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import type { CollectionItem, OpenTab } from "../lib/types";
import { displayTabName, methodClass, statusPillClass, statusText } from "../lib/utils";
import { cn } from "../lib/cn";
import { Plus, X, Copy as CopyIcon, ChevronsRight, Pin, PinOff, XCircle } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

// Compare a tab's editable request to its corresponding saved Collection
// (matched by request.id). True iff a real divergence exists. For unsaved
// tabs (id === null), "dirty" means "has any user content" so a fresh
// empty tab is NOT marked dirty.
function isTabDirty(tab: OpenTab, items: CollectionItem[]): boolean {
  const r = tab.request;
  if (!r.id) {
    // Unsaved — dirty when the user has typed anything substantial
    if (r.url.trim()) return true;
    if (r.body.text.trim()) return true;
    if (r.gql.query.trim() || r.gql.vars.trim()) return true;
    if (r.params.some((p) => p.k.trim() || p.v.trim())) return true;
    if (r.headers.some((h) => h.k.trim() || h.v.trim())) return true;
    if (r.auth.type !== "none") return true;
    return false;
  }
  const saved = items.find((c) => c.id === r.id && c.kind === "request" && c.request);
  if (!saved || !saved.request) return true; // saved-id refers to a deleted/moved item
  const a = saved.request;
  if (a.method !== r.method || a.url !== r.url) return true;
  if (JSON.stringify(a.params) !== JSON.stringify(r.params)) return true;
  if (JSON.stringify(a.headers) !== JSON.stringify(r.headers)) return true;
  if (JSON.stringify(a.auth) !== JSON.stringify(r.auth)) return true;
  if (JSON.stringify(a.body) !== JSON.stringify(r.body)) return true;
  if (JSON.stringify(a.gql) !== JSON.stringify(r.gql)) return true;
  return false;
}

// =============================================================================
// TabStrip — horizontal tabs above the request composer.
//
// Container reads tabs from the store; presenter is purely props-driven so
// it stays Storybook-friendly per CLAUDE.md hard rule. Interactions: click
// to switch, ✕ to close, middle-click to close, drag-to-reorder, "+" at
// the right end to open a fresh tab.
// =============================================================================

export type TabStripPresenterProps = {
  tabs: OpenTab[];
  activeTabId: string;
  /** Per-tab dirty flags, keyed by tab id. Undefined = unknown (treat as clean). */
  dirty?: Record<string, boolean>;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  /** Right-click context-menu actions. Optional so older callers/tests
      still mount the presenter without wiring them. */
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onNewTab: () => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  newTabLabel?: string;
  closeTabLabel?: string;
  /** Optional keyboard-shortcut hints (glyph form, e.g. "⌘T") appended
      to the corresponding button titles. Empty = no shortcut shown,
      keeping the leaf portable to apps that bind different shortcuts. */
  newTabShortcut?: string;
  closeTabShortcut?: string;
  /** Localised strings for the context menu items. */
  closeOthersLabel?: string;
  closeToRightLabel?: string;
  duplicateLabel?: string;
  pinLabel?: string;
  unpinLabel?: string;
  className?: string;
};

export function TabStripPresenter({
  tabs,
  activeTabId,
  dirty,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onDuplicate,
  onTogglePin,
  onNewTab,
  onReorder,
  newTabLabel = "New tab",
  closeTabLabel = "Close tab",
  newTabShortcut = "",
  closeTabShortcut = "",
  closeOthersLabel = "Close others",
  closeToRightLabel = "Close tabs to the right",
  duplicateLabel = "Duplicate tab",
  pinLabel = "Pin tab",
  unpinLabel = "Unpin tab",
  className,
}: TabStripPresenterProps) {
  const newTabTitle = newTabShortcut ? `${newTabLabel}  ${newTabShortcut}` : newTabLabel;
  const closeTabTitle = closeTabShortcut ? `${closeTabLabel}  ${closeTabShortcut}` : closeTabLabel;
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // When the active tab changes, scroll it into view inside the strip
  // so a newly-created or quick-switched tab isn't hidden off-screen.
  // `nearest` keeps the scroll movement minimal — the active tab stays
  // wherever it is if already visible.
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const target = strip.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label="Open requests"
      className={cn(
        // `scrollbar-none` hides the horizontal scrollbar entirely —
        // tabs still scroll via trackpad swipe / wheel, matching the
        // native Safari / Chrome tab strip illusion (no visible bar).
        // Class is defined in main.css.
        "flex items-stretch h-9 bg-[var(--color-bg)] border-b border-[var(--color-border)] overflow-x-auto flex-shrink-0 scrollbar-none",
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const active = tab.id === activeTabId;
        const isDropTarget = dragOverIdx === idx && dragFromIdx !== null && dragFromIdx !== idx;
        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div
                role="tab"
                aria-selected={active}
                tabIndex={0}
                data-tab-id={tab.id}
                draggable
                onDragStart={(e) => {
                  setDragFromIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox needs setData for drag to fire.
                  e.dataTransfer.setData("text/plain", String(idx));
                }}
                onDragOver={(e) => {
                  if (dragFromIdx === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIdx(idx);
                }}
                onDragEnd={() => {
                  setDragFromIdx(null);
                  setDragOverIdx(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFromIdx !== null && dragFromIdx !== idx) {
                    onReorder(dragFromIdx, idx);
                  }
                  setDragFromIdx(null);
                  setDragOverIdx(null);
                }}
                onMouseDown={(e) => {
                  // Middle-click closes (button === 1)
                  if (e.button === 1) {
                    e.preventDefault();
                    onClose(tab.id);
                  }
                }}
                onClick={() => onActivate(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActivate(tab.id);
                  }
                }}
                className={cn(
                  // `flex-shrink-0` keeps tabs at their readable
                  // min-width when the strip is full — the container
                  // already has `overflow-x-auto` so additional tabs
                  // push the row past the viewport and the user can
                  // scroll instead of every tab collapsing to the
                  // status pill (the previous min-w-0 behavior).
                  "group relative flex flex-shrink-0 items-center gap-2 px-3 min-w-[140px] max-w-[220px] cursor-pointer select-none",
                  "border-r border-[var(--color-border)] text-xs",
                  "transition-colors duration-100",
                  active
                    ? "bg-[var(--color-bg-elev)] text-[var(--color-fg)]"
                    : "bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)]/60 hover:text-[var(--color-fg)]",
                  isDropTarget && "bg-[var(--color-accent)]/15"
                )}
              >
                {/* Pinned indicator — sits to the left of the method
                pill so the strip groups pinned tabs visually. */}
                {tab.pinned ? (
                  <Pin
                    className="w-3 h-3 shrink-0 text-[var(--color-accent)] -rotate-45"
                    aria-label={pinLabel}
                  />
                ) : null}

                {/* Method-color indicator — or a SPEC tag for an
                OpenAPI-editor tab (it carries no real HTTP method). */}
                {tab.spec ? (
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-tight shrink-0 text-[var(--color-accent)]">
                    SPEC
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-[10px] font-mono font-semibold uppercase tracking-tight shrink-0",
                      methodClass(tab.request.method)
                    )}
                  >
                    {tab.request.method}
                  </span>
                )}

                {/* Last-response status pill — colored by 2xx/3xx/4xx/5xx
                so a glance across the tab strip shows which tabs
                succeeded vs erred. Empty when no response yet. */}
                {tab.lastResponse ? (
                  <span
                    className={cn(
                      "text-[9px] font-mono font-semibold leading-none px-1 py-0.5 rounded shrink-0",
                      statusPillClass(tab.lastResponse.status)
                    )}
                    title={`${tab.lastResponse.status} ${statusText(tab.lastResponse.status)}`}
                    aria-label={`Last response: ${tab.lastResponse.status} ${statusText(tab.lastResponse.status)}`}
                  >
                    {tab.lastResponse.status || "—"}
                  </span>
                ) : null}

                {/* Tab title — truncated. When the stored name is still
                the placeholder ("Yeni istek" / "New request") AND the
                tab has a URL, fall back to a `METHOD shortUrl` derived
                label so a strip full of new tabs is readable at a
                glance. The user's manual rename always wins. The
                tooltip stacks the label + the full `METHOD URL` so
                hovering surfaces both the human-facing name and the
                actual endpoint, even when the visible label is
                truncated mid-path. */}
                {(() => {
                  const label = displayTabName({
                    name: tab.name,
                    method: tab.request.method,
                    url: tab.request.url,
                  });
                  const fullUrl = tab.request.url ? `${tab.request.method} ${tab.request.url}` : "";
                  const tooltip = fullUrl && fullUrl !== label ? `${label}\n${fullUrl}` : label;
                  return (
                    <span className="truncate flex-1 min-w-0" title={tooltip}>
                      {label}
                    </span>
                  );
                })()}

                {/* Close button — replaced by an unsaved-dot when the tab
                is dirty until the user hovers. Hover reveals the close
                button so the user can still close a dirty tab in one click. */}
                <span className="shrink-0 w-4 h-4 grid place-items-center relative">
                  {dirty?.[tab.id] && (
                    <span
                      aria-label="Unsaved changes"
                      className={cn(
                        "absolute w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]",
                        "transition-opacity duration-100",
                        "group-hover:opacity-0",
                        active ? "opacity-100" : "opacity-70"
                      )}
                    />
                  )}
                  <button
                    type="button"
                    aria-label={closeTabLabel}
                    title={closeTabTitle}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(tab.id);
                    }}
                    className={cn(
                      "w-4 h-4 rounded grid place-items-center",
                      "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                      "hover:bg-[var(--color-border)]/60",
                      "transition-opacity duration-100",
                      // Show the X if active OR on hover; if dirty, ALSO need the
                      // explicit hover-reveal so the dot doesn't permanently
                      // block close access.
                      dirty?.[tab.id]
                        ? "opacity-0 group-hover:opacity-90 focus:opacity-100"
                        : active
                          ? "opacity-70"
                          : "opacity-0 group-hover:opacity-70 focus:opacity-100"
                    )}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>

                {/* Active accent — bottom border */}
                {active && (
                  <span
                    className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--color-accent)]"
                    aria-hidden
                  />
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => onClose(tab.id)}>
                <X className="w-3.5 h-3.5" aria-hidden />
                {closeTabLabel}
              </ContextMenuItem>
              {onDuplicate ? (
                <ContextMenuItem onSelect={() => onDuplicate(tab.id)}>
                  <CopyIcon className="w-3.5 h-3.5" aria-hidden />
                  {duplicateLabel}
                </ContextMenuItem>
              ) : null}
              {onTogglePin ? (
                <ContextMenuItem onSelect={() => onTogglePin(tab.id)}>
                  {tab.pinned ? (
                    <PinOff className="w-3.5 h-3.5" aria-hidden />
                  ) : (
                    <Pin className="w-3.5 h-3.5" aria-hidden />
                  )}
                  {tab.pinned ? unpinLabel : pinLabel}
                </ContextMenuItem>
              ) : null}
              {(onCloseOthers || onCloseToRight) && <ContextMenuSeparator />}
              {onCloseOthers ? (
                <ContextMenuItem onSelect={() => onCloseOthers(tab.id)} disabled={tabs.length <= 1}>
                  <XCircle className="w-3.5 h-3.5" aria-hidden />
                  {closeOthersLabel}
                </ContextMenuItem>
              ) : null}
              {onCloseToRight ? (
                <ContextMenuItem
                  onSelect={() => onCloseToRight(tab.id)}
                  disabled={idx === tabs.length - 1}
                >
                  <ChevronsRight className="w-3.5 h-3.5" aria-hidden />
                  {closeToRightLabel}
                </ContextMenuItem>
              ) : null}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* "+" button to open a new tab. Stays at the right end of the strip. */}
      <button
        type="button"
        aria-label={newTabLabel}
        title={newTabTitle}
        onClick={onNewTab}
        className={cn(
          // Sticks at the right end of the visible tabs even when the
          // strip scrolls — `flex-shrink-0` so it can't be squeezed by
          // overflow.
          "px-3 grid place-items-center text-[var(--color-fg-muted)] flex-shrink-0",
          "hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]",
          "border-r border-[var(--color-border)]",
          "transition-colors duration-100"
        )}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* Filler so the strip background extends to the right edge */}
      <div className="flex-1 min-w-0" />
    </div>
  );
}

export function TabStripContainer() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const collections = useStore((s) => s.collectionItems);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);
  const closeOtherTabs = useStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useStore((s) => s.closeTabsToRight);
  const duplicateTab = useStore((s) => s.duplicateTab);
  const togglePinTab = useStore((s) => s.togglePinTab);
  const newTab = useStore((s) => s.newTab);
  const reorderTabs = useStore((s) => s.reorderTabs);
  const t = useT();

  // Dirty map — recomputed on every render. Cheap for tab counts under
  // ~50 (per-tab JSON.stringify of small request shape).
  const dirty: Record<string, boolean> = {};
  for (const tab of tabs) dirty[tab.id] = isTabDirty(tab, collections);

  // After tab close/open, focus the active tab so keyboard users land in
  // the right spot. Skip the very first render to avoid stealing focus.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // intentionally no-op for now; future: scroll active tab into view
  }, [activeTabId]);

  const onActivate = useCallback((id: string) => setActiveTab(id), [setActiveTab]);
  const onClose = useCallback((id: string) => closeTab(id), [closeTab]);
  const onCloseOthers = useCallback((id: string) => closeOtherTabs(id), [closeOtherTabs]);
  const onCloseToRight = useCallback((id: string) => closeTabsToRight(id), [closeTabsToRight]);
  const onDuplicate = useCallback((id: string) => duplicateTab(id), [duplicateTab]);
  const onTogglePin = useCallback((id: string) => togglePinTab(id), [togglePinTab]);
  const onNewTab = useCallback(() => newTab(), [newTab]);
  const onReorder = useCallback(
    (fromIdx: number, toIdx: number) => reorderTabs(fromIdx, toIdx),
    [reorderTabs]
  );

  return (
    <TabStripPresenter
      tabs={tabs}
      activeTabId={activeTabId}
      dirty={dirty}
      onActivate={onActivate}
      onClose={onClose}
      onCloseOthers={onCloseOthers}
      onCloseToRight={onCloseToRight}
      onDuplicate={onDuplicate}
      onTogglePin={onTogglePin}
      onNewTab={onNewTab}
      onReorder={onReorder}
      newTabLabel={t("tabs.new")}
      closeTabLabel={t("tabs.close")}
      newTabShortcut="⌘T"
      closeTabShortcut="⌘W"
      closeOthersLabel={t("tabs.closeOthers")}
      closeToRightLabel={t("tabs.closeToRight")}
      duplicateLabel={t("tabs.duplicate")}
      pinLabel={t("tabs.pin")}
      unpinLabel={t("tabs.unpin")}
    />
  );
}
