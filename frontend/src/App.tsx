/**
 * API Lab — native macOS Postman-style API tester.
 *
 * Author:  Olgun Özoktaş <https://github.com/olgunozoktas>
 * Repo:    https://github.com/olgunozoktas/api-lab
 * License: PolyForm Noncommercial 1.0.0 + attribution addendum (see LICENSE)
 *
 * App.tsx — top-level shell: 3-pane layout (sidebar / composer / response),
 * theme effect, global keyboard shortcuts (⌘+Enter / ⌘+S / ⌘+T / ⌘+W /
 * ⌘+1..9 / ⌥⌘→← / ⌘+K / ⌘+P / ⌘+L / ⌘+B / ⌘+. / ⌘+Shift+T), HTTP↔WS↔SSE↔gRPC
 * URL-prefix routing.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { SyncBanner } from "./components/SyncBanner";
import { useSyncEngine } from "./lib/syncEngine";
import { Sidebar } from "./components/Sidebar";
import { TabStripContainer } from "./components/TabStrip";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { CollectionRunnerModal } from "./components/CollectionRunnerModal";
import { RequestComposerContainer } from "./components/RequestComposer";
import { ResponseViewerContainer } from "./components/ResponseViewer";
import { WsPanelContainer } from "./components/WsPanel";
import { GrpcPanelContainer } from "./components/GrpcPanelContainer";
import { SsePanelContainer } from "./components/SsePanel";
import { McpPanelContainer } from "./components/McpPanelContainer";
import { McpServerBar } from "./components/McpServerBar";
// The OpenAPI editor is a whole-screen alternate surface shown only
// for spec tabs, and it pulls in Spectral (~500 KB). Lazy-load it so
// neither the editor nor the linter lands in the first-paint bundle.
const OpenApiEditorContainer = lazy(() =>
  import("./components/OpenApiEditor").then((m) => ({ default: m.OpenApiEditorContainer }))
);
import { UrlBarContainer } from "./components/UrlBar";
import { Toast } from "./components/Toast";
import { ResizableDivider } from "./components/ResizableDivider";
import { useStore, useActiveVars } from "./store";
import { useT } from "./lib/i18n/useT";
import { sendWithScripts } from "./lib/sendRequest";
import { isWsUrl } from "./lib/ws";
import { isGrpcUrl } from "./lib/grpc";
import { isSseUrl } from "./lib/sse";
import { envSubst } from "./lib/utils";
import { SHORTCUTS, matchesShortcut, type ShortcutId } from "./lib/shortcuts";
import { useExternalLinkInterceptor } from "./lib/externalLinks";
import {
  COMPOSER_PX_MAX,
  COMPOSER_PX_MIN,
  DEFAULT_LAYOUT,
  SIDEBAR_PX_MAX,
  SIDEBAR_PX_MIN,
} from "./lib/types";

export function App() {
  const current = useStore((s) => s.current);
  const setLastResponse = useStore((s) => s.setLastResponse);
  const pushHistory = useStore((s) => s.pushHistory);
  const isGraphql = useStore((s) => s.ui.composerTab === "graphql");
  const showToast = useStore((s) => s.showToast);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const resetCurrent = useStore((s) => s.resetCurrent);
  const newTab = useStore((s) => s.newTab);
  const closeTab = useStore((s) => s.closeTab);
  const reopenLastClosedTab = useStore((s) => s.reopenLastClosedTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const ui = useStore((s) => s.ui);
  const vars = useActiveVars();
  const t = useT();
  const [busy, setBusy] = useState(false);

  // Git-based collection sync — pulls on launch, debounce-pushes on
  // edit. No-op unless sync is configured + enabled in Settings.
  useSyncEngine();
  // Route every `<a target="_blank" href="https?://...">` click
  // through the shell.open bridge so the OS default browser opens
  // the URL — without this, those links silently no-op under the
  // WKWebView host (no native popup-window manager).
  useExternalLinkInterceptor();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Collection runner — the folder context menu dispatches
  // `apilab:run-collection` (window-event channel, same pattern as
  // apilab:open-guides); App owns the modal's open state.
  const [runnerFolderId, setRunnerFolderId] = useState<string | null>(null);
  useEffect(() => {
    const onRun = (e: Event) => {
      const id = (e as CustomEvent<{ folderId: string }>).detail?.folderId;
      if (id) setRunnerFolderId(id);
    };
    window.addEventListener("apilab:run-collection", onRun);
    return () => window.removeEventListener("apilab:run-collection", onRun);
  }, []);
  // Holds the AbortController of the currently-flying request so the
  // Cancel button + ⌘+. shortcut can both reach it. Reset to null in
  // the onSend `finally` so subsequent ⌘+. presses no-op once the
  // request has settled.
  const abortRef = useRef<AbortController | null>(null);

  const defaults = useStore((s) => s.defaults);

  const onCancel = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (ui.theme === "auto") {
      html.removeAttribute("data-theme");
      html.style.colorScheme = "light dark";
    } else {
      html.setAttribute("data-theme", ui.theme);
      // Tell the user agent (form controls, scrollbars) which color
      // family this theme belongs to so native UI matches.
      const isLight = ui.theme === "light" || ui.theme === "github-light";
      html.style.colorScheme = isLight ? "light" : "dark";
    }
  }, [ui.theme]);

  const onSend = useCallback(async () => {
    if (busy) return;
    if (!current.url.trim()) {
      showToast(t("toast.urlEmpty"), { severity: "warning" });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const result = await sendWithScripts(current, isGraphql, vars, defaults, {
        signal: controller.signal,
      });
      // Carry the pre/post-script outcomes on the response so the
      // Tests + Console tabs can surface them. Omitted when the
      // request has no scripts.
      const res =
        result.preScript || result.postScript
          ? {
              ...result.response,
              scriptResults: { pre: result.preScript, post: result.postScript },
            }
          : result.response;
      setLastResponse(res);
      pushHistory(
        {
          method: current.method,
          url: current.url,
          params: current.params,
          headers: current.headers,
          auth: current.auth,
          body: current.body,
          gql: current.gql,
          isGraphql,
        },
        res
      );
    } catch (e) {
      // AbortError → user pressed Cancel. Skip the network-error
      // toast/lastResponse update and surface a cancel-specific toast.
      // (Native path's late-arriving response is already discarded by
      // viaNative's race; fetch path's underlying request was actually
      // aborted by the browser.)
      if ((e as Error).name === "AbortError") {
        showToast(t("toast.requestCancelled"));
      } else {
        const msg = (e as Error).message || String(e);
        setLastResponse({
          status: 0,
          statusText: "Network Error",
          headers: [],
          body: msg,
          contentType: "",
          sizeBytes: msg.length,
          elapsedMs: 0,
          url: current.url,
          transport: "fetch",
        });
        showToast(t("toast.networkError", { msg: msg.slice(0, 80) }), { severity: "error" });
      }
    } finally {
      setBusy(false);
      // Clear so a stale Cancel/⌘+. press after the request settles is a no-op.
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [busy, current, defaults, isGraphql, pushHistory, setLastResponse, showToast, t, vars]);

  useEffect(() => {
    // Table-driven dispatch: each entry in lib/shortcuts.ts that App
    // owns gets an action function keyed by its `id`. The keydown
    // handler walks SHORTCUTS in order, matches against each entry's
    // declarative `match`, and invokes the registered action. The
    // shortcuts.test drift check asserts every id with `match` is
    // referenced here OR in one of the *_shortcut.ts hooks — so a
    // new binding cannot ship without a SHORTCUTS entry, and a new
    // SHORTCUTS entry without a binding fails the test.
    // Keys are quoted (even the JS-identifier-safe ones like `send`)
    // so the shortcuts.test binding-drift regex sees every id as a
    // literal string token — a `send` shorthand would slip past it.
    const APP_ACTIONS: Partial<Record<ShortcutId, (e: KeyboardEvent) => void>> = {
      send: () => onSend(),
      cancel: () => onCancel(),
      save: () => saveCurrent(),
      new: () => resetCurrent(),
      // ⌘+Shift+T reopens the last closed tab (id "tab-reopen" in
      // SHORTCUTS, surfaced as its own Settings entry); bare ⌘+T (or
      // ⇧+T with empty reopen stack) creates a new tab. One case
      // handles both via the SHORTCUT's `shiftAny: true` flag, so
      // "tab-reopen" never matches first.
      "tab-new": (e) => {
        if (e.shiftKey && useStore.getState().recentlyClosed.length > 0) {
          reopenLastClosedTab();
          return;
        }
        newTab();
      },
      "tab-close": () => closeTab(useStore.getState().activeTabId),
      // ⌘P AND ⌘K both open the quick switcher. ⌘P matches the
      // existing muscle memory; ⌘K is the modern command-palette
      // convention (Linear / Notion / Slack / GitHub) and the one
      // most users reach for first.
      switcher: () => setSwitcherOpen(true),
      // ⌘L — focus + select-all on the URL bar (browser address-bar
      // standard). Dispatched as a window event so UrlBar can listen
      // without prop-drilling a ref. Active-tab's UrlBar is the only
      // one in the DOM render tree, so a single listener is fine.
      "focus-url": () => window.dispatchEvent(new CustomEvent("apilab:focus-url")),
      // ⌘B — toggle the sidebar (VS Code / Cursor / Linear primary-
      // sidebar shortcut). Collapses the saved-requests + history
      // pane so the composer + response viewer get the full width.
      "toggle-sidebar": () => {
        const cur = useStore.getState().ui.sidebarCollapsed ?? false;
        useStore.getState().setUi({ sidebarCollapsed: !cur });
      },
      // Cmd+1..9 — jump to tab N (or last if N > tabs.length)
      "tab-jump": (e) => {
        const tabs = useStore.getState().tabs;
        if (tabs.length === 0) return;
        const idx =
          e.key === "9" ? tabs.length - 1 : Math.min(parseInt(e.key, 10) - 1, tabs.length - 1);
        setActiveTab(tabs[idx].id);
      },
      // ⌥⌘→ / ⌥⌘← — cycle to next / previous tab (Safari standard).
      // Wraps around at the boundary so power users can sweep through
      // every tab without releasing the modifiers.
      "tab-cycle": (e) => {
        const { tabs, activeTabId } = useStore.getState();
        if (tabs.length <= 1) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        if (idx < 0) return;
        const step = e.key === "ArrowRight" ? 1 : -1;
        const next = (idx + step + tabs.length) % tabs.length;
        setActiveTab(tabs[next].id);
      },
    };
    const onKey = (e: KeyboardEvent) => {
      for (const s of SHORTCUTS) {
        const action = APP_ACTIONS[s.id as ShortcutId];
        if (!action) continue;
        if (!matchesShortcut(s.match, e)) continue;
        e.preventDefault();
        action(e);
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    onSend,
    onCancel,
    saveCurrent,
    resetCurrent,
    newTab,
    closeTab,
    reopenLastClosedTab,
    setActiveTab,
  ]);

  const activeTabId = useStore((s) => s.activeTabId);
  // A spec-editor tab takes over the whole content area, ahead of the
  // URL-derived WS / gRPC / SSE modes.
  const specMode = useStore((s) => !!s.tabs.find((tab) => tab.id === s.activeTabId)?.spec);
  const substitutedUrl = envSubst(current.url, vars);
  const wsMode = !specMode && isWsUrl(substitutedUrl);
  const grpcMode = !specMode && !wsMode && isGrpcUrl(substitutedUrl);
  const sseMode = !specMode && !wsMode && !grpcMode && isSseUrl(substitutedUrl);
  // MCP pivots on the presence of `request.mcp`, not a URL prefix —
  // MCP servers don't have a comparable user-typed primitive. Routing
  // through the same single-column slot as the other streaming panels.
  const mcpMode = !specMode && !wsMode && !grpcMode && !sseMode && !!current.mcp;
  const singleColumn = wsMode || grpcMode || sseMode || mcpMode;

  const layout = ui.layout ?? DEFAULT_LAYOUT;
  const setUi = useStore((s) => s.setUi);
  const updateLayout = (patch: Partial<typeof layout>) =>
    setUi({ layout: { ...layout, ...patch } });
  const t2 = useT(); // separate ref for the layout-aria labels

  // Grid template: sidebar | divider (8px) | composer | divider (8px) | response.
  // In single-column modes (WS / gRPC) the third divider + composer collapse —
  // only the sidebar divider remains. ⌘B toggles the sidebar entirely;
  // when collapsed, the leading two grid tracks are dropped and `<Sidebar/>`
  // + its divider aren't rendered (so they can't steal pointer events).
  const sidebarCollapsed = ui.sidebarCollapsed ?? false;
  const leading = sidebarCollapsed ? "" : `${layout.sidebarPx}px 8px `;
  const gridTemplateColumns =
    singleColumn || specMode ? `${leading}1fr` : `${leading}${layout.composerPx}px 8px 1fr`;

  return (
    // text-[13px]: intentional app-wide base size — deliberately off the
    // 9/10/11/12 token scale (token-scale-migration #29 documented exception).
    // token-scale-allow
    <div className="h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] text-[13px]">
      <TopBar />
      <SyncBanner />
      <main className="flex-1 grid min-h-0" style={{ gridTemplateColumns }}>
        {!sidebarCollapsed && (
          <>
            <Sidebar />
            <ResizableDivider
              value={layout.sidebarPx}
              onChange={(sidebarPx) => updateLayout({ sidebarPx })}
              onReset={() => updateLayout({ sidebarPx: DEFAULT_LAYOUT.sidebarPx })}
              min={SIDEBAR_PX_MIN}
              max={SIDEBAR_PX_MAX}
              ariaLabel={t2("layout.sidebar.aria")}
            />
          </>
        )}
        {specMode ? (
          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <TabStripContainer />
            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense fallback={<div className="flex-1" />}>
                <OpenApiEditorContainer />
              </Suspense>
            </div>
          </div>
        ) : singleColumn ? (
          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <TabStripContainer />
            {mcpMode ? (
              // MCP has no URL to type — the server is picked from the
              // saved-servers library, so its bar swaps in for the
              // standard URL bar in this slot.
              <McpServerBar />
            ) : (
              <UrlBarContainer
                busy={false}
                onSend={onSend}
                onCancel={onCancel}
                hideSend
                hideMethod
              />
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              {wsMode ? (
                <WsPanelContainer key={activeTabId} />
              ) : grpcMode ? (
                <GrpcPanelContainer key={activeTabId} />
              ) : sseMode ? (
                <SsePanelContainer key={activeTabId} />
              ) : (
                <McpPanelContainer key={activeTabId} />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col min-h-0 min-w-0 border-r border-[var(--color-border)]">
              <TabStripContainer />
              <div className="flex-1 min-h-0 overflow-hidden">
                <RequestComposerContainer busy={busy} onSend={onSend} onCancel={onCancel} />
              </div>
            </div>
            <ResizableDivider
              value={layout.composerPx}
              onChange={(composerPx) => updateLayout({ composerPx })}
              onReset={() => updateLayout({ composerPx: DEFAULT_LAYOUT.composerPx })}
              min={COMPOSER_PX_MIN}
              max={COMPOSER_PX_MAX}
              ariaLabel={t2("layout.composer.aria")}
            />
            <ResponseViewerContainer busy={busy} />
          </>
        )}
      </main>
      <Toast />
      <QuickSwitcher open={switcherOpen} onOpenChange={setSwitcherOpen} />
      <CollectionRunnerModal
        open={runnerFolderId !== null}
        folderId={runnerFolderId}
        onOpenChange={(o) => !o && setRunnerFolderId(null)}
      />
    </div>
  );
}
