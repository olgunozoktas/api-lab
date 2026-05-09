import { useCallback, useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { TabStripContainer } from "./components/TabStrip";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { RequestComposerContainer } from "./components/RequestComposer";
import { ResponseViewerContainer } from "./components/ResponseViewer";
import { WsPanelContainer } from "./components/WsPanel";
import { UrlBarContainer } from "./components/UrlBar";
import { Toast } from "./components/Toast";
import { useStore, useActiveVars } from "./store";
import { useT } from "./lib/i18n/useT";
import { send } from "./lib/sendRequest";
import { isWsUrl } from "./lib/ws";
import { envSubst } from "./lib/utils";

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
  const setActiveTab = useStore((s) => s.setActiveTab);
  const ui = useStore((s) => s.ui);
  const vars = useActiveVars();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const defaults = useStore((s) => s.defaults);

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
    setBusy(true);
    try {
      const res = await send(current, isGraphql, vars, defaults);
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
    } finally {
      setBusy(false);
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
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSend, saveCurrent, resetCurrent, newTab, closeTab, setActiveTab]);

  const activeTabId = useStore((s) => s.activeTabId);
  const wsMode = isWsUrl(envSubst(current.url, vars));

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] text-[13px]">
      <TopBar />
      <main
        className="flex-1 grid min-h-0"
        style={{ gridTemplateColumns: wsMode ? "240px 1fr" : "240px 1fr 1fr" }}
      >
        <Sidebar />
        {wsMode ? (
          <div className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <TabStripContainer />
            <UrlBarContainer busy={false} onSend={onSend} hideSend hideMethod />
            <div className="flex-1 min-h-0 overflow-hidden">
              <WsPanelContainer key={activeTabId} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col min-h-0 min-w-0 border-r border-[var(--color-border)]">
              <TabStripContainer />
              <div className="flex-1 min-h-0 overflow-hidden">
                <RequestComposerContainer busy={busy} onSend={onSend} />
              </div>
            </div>
            <ResponseViewerContainer />
          </>
        )}
      </main>
      <Toast />
      <QuickSwitcher open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
}
