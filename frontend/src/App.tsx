import { useCallback, useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { RequestComposerContainer } from "./components/RequestComposer";
import { ResponseViewerContainer } from "./components/ResponseViewer";
import { Toast } from "./components/Toast";
import { useStore, useActiveVars } from "./store";
import { useT } from "./lib/i18n/useT";
import { send } from "./lib/sendRequest";

export function App() {
  const current = useStore((s) => s.current);
  const setLastResponse = useStore((s) => s.setLastResponse);
  const pushHistory = useStore((s) => s.pushHistory);
  const isGraphql = useStore((s) => s.ui.composerTab === "graphql");
  const showToast = useStore((s) => s.showToast);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const resetCurrent = useStore((s) => s.resetCurrent);
  const ui = useStore((s) => s.ui);
  const vars = useActiveVars();
  const t = useT();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (ui.theme === "auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", ui.theme);
    html.style.colorScheme = ui.theme === "auto" ? "light dark" : ui.theme;
  }, [ui.theme]);

  const onSend = useCallback(async () => {
    if (busy) return;
    if (!current.url.trim()) { showToast(t("toast.urlEmpty")); return; }
    setBusy(true);
    try {
      const res = await send(current, isGraphql, vars);
      setLastResponse(res);
      pushHistory(
        {
          method: current.method, url: current.url,
          params: current.params, headers: current.headers,
          auth: current.auth, body: current.body, gql: current.gql,
          isGraphql,
        },
        res.status, res.sizeBytes, res.elapsedMs,
      );
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setLastResponse({
        status: 0, statusText: "Network Error",
        headers: [], body: msg, contentType: "",
        sizeBytes: msg.length, elapsedMs: 0,
        url: current.url, transport: "fetch",
      });
      showToast(t("toast.networkError", { msg: msg.slice(0, 80) }));
    } finally {
      setBusy(false);
    }
  }, [busy, current, isGraphql, pushHistory, setLastResponse, showToast, t, vars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "Enter") { e.preventDefault(); onSend(); }
      else if (cmd && (e.key === "s" || e.key === "S")) { e.preventDefault(); saveCurrent(); }
      else if (cmd && (e.key === "n" || e.key === "N")) { e.preventDefault(); resetCurrent(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSend, saveCurrent, resetCurrent]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] text-[13px]">
      <TopBar />
      <main className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "240px 1fr 1fr" }}>
        <Sidebar />
        <RequestComposerContainer busy={busy} onSend={onSend} />
        <ResponseViewerContainer />
      </main>
      <Toast />
    </div>
  );
}
