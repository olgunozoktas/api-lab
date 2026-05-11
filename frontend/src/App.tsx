import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { TabStripContainer } from "./components/TabStrip";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { RequestComposerContainer } from "./components/RequestComposer";
import { ResponseViewerContainer } from "./components/ResponseViewer";
import { WsPanelContainer } from "./components/WsPanel";
import { GrpcPanelContainer } from "./components/GrpcPanelContainer";
import { SsePanelContainer } from "./components/SsePanel";
import { UrlBarContainer } from "./components/UrlBar";
import { Toast } from "./components/Toast";
import { ResizableDivider } from "./components/ResizableDivider";
import { useStore, useActiveVars } from "./store";
import { useT } from "./lib/i18n/useT";
import { send } from "./lib/sendRequest";
import { isWsUrl } from "./lib/ws";
import { isGrpcUrl } from "./lib/grpc";
import { isSseUrl } from "./lib/sse";
import { envSubst } from "./lib/utils";
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
  const [switcherOpen, setSwitcherOpen] = useState(false);
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
      showToast(t("toast.urlEmpty"));
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const res = await send(current, isGraphql, vars, defaults, { signal: controller.signal });
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
        res.status,
        res.sizeBytes,
        res.elapsedMs
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
        showToast(t("toast.networkError", { msg: msg.slice(0, 80) }));
      }
    } finally {
      setBusy(false);
      // Clear so a stale Cancel/⌘+. press after the request settles is a no-op.
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [busy, current, defaults, isGraphql, pushHistory, setLastResponse, showToast, t, vars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;

      // Action shortcuts
      if (e.key === "Enter") {
        e.preventDefault();
        onSend();
        return;
      }
      // ⌘+. (period) — cancel the in-flight request. macOS canonical
      // "abort current foreground action" gesture (mirrors Finder /
      // Xcode / many native apps).
      if (e.key === ".") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        saveCurrent();
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        resetCurrent();
        return;
      }

      // Tab management
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        // ⌘+Shift+T — reopen last closed tab (browser standard).
        // Falls through to ⌘+T newTab when the reopen stack is empty,
        // so a single-shortcut muscle memory still creates a tab.
        if (e.shiftKey) {
          const had = useStore.getState().recentlyClosed.length > 0;
          if (had) {
            reopenLastClosedTab();
            return;
          }
        }
        newTab();
        return;
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        closeTab(useStore.getState().activeTabId);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setSwitcherOpen(true);
        return;
      }

      // ⌘L — focus + select-all on the URL bar (browser address-bar
      // standard). Dispatched as a window event so UrlBar can listen
      // without prop-drilling a ref. Active-tab's UrlBar is the only
      // one in the DOM render tree, so a single listener is fine.
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("apilab:focus-url"));
        return;
      }

      // ⌘B — toggle the sidebar (VS Code / Cursor / Linear primary-
      // sidebar shortcut). Collapses the saved-requests + history
      // pane so the composer + response viewer get the full width.
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        const cur = useStore.getState().ui.sidebarCollapsed ?? false;
        useStore.getState().setUi({ sidebarCollapsed: !cur });
        return;
      }

      // Cmd+1..9 — jump to tab N (or last if N > tabs.length)
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const tabs = useStore.getState().tabs;
        if (tabs.length === 0) return;
        const idx =
          e.key === "9" ? tabs.length - 1 : Math.min(parseInt(e.key, 10) - 1, tabs.length - 1);
        setActiveTab(tabs[idx].id);
        return;
      }

      // ⌥⌘→ / ⌥⌘← — cycle to next / previous tab (Safari standard).
      // Wraps around at the boundary so power users can sweep through
      // every tab without releasing the modifiers.
      if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const { tabs, activeTabId } = useStore.getState();
        if (tabs.length <= 1) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        if (idx < 0) return;
        const step = e.key === "ArrowRight" ? 1 : -1;
        const next = (idx + step + tabs.length) % tabs.length;
        setActiveTab(tabs[next].id);
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
  const substitutedUrl = envSubst(current.url, vars);
  const wsMode = isWsUrl(substitutedUrl);
  const grpcMode = !wsMode && isGrpcUrl(substitutedUrl);
  const sseMode = !wsMode && !grpcMode && isSseUrl(substitutedUrl);
  const singleColumn = wsMode || grpcMode || sseMode;

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
  const gridTemplateColumns = singleColumn
    ? `${leading}1fr`
    : `${leading}${layout.composerPx}px 8px 1fr`;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] text-[13px]">
      <TopBar />
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
        {singleColumn ? (
          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <TabStripContainer />
            <UrlBarContainer busy={false} onSend={onSend} onCancel={onCancel} hideSend hideMethod />
            <div className="flex-1 min-h-0 overflow-hidden">
              {wsMode ? (
                <WsPanelContainer key={activeTabId} />
              ) : grpcMode ? (
                <GrpcPanelContainer key={activeTabId} />
              ) : (
                <SsePanelContainer key={activeTabId} />
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
            <ResponseViewerContainer />
          </>
        )}
      </main>
      <Toast />
      <QuickSwitcher open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
}
