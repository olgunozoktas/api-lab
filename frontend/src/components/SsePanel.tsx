/** Olgun Özoktaş geliştirdi · API Lab */
// Server-Sent Events panel. Mirrors WsPanel's structure (status bar +
// scrolling log) but drops the send box — SSE is one-way, server →
// client. Uses browser-native EventSource so no Zig bridge is needed.
//
// v1 limitations (documented in the parent backlog file):
//   * No custom request headers — EventSource doesn't expose them
//     for security reasons. fetch+ReadableStream workaround is a
//     follow-up when an auth-required SSE endpoint surfaces.
//   * Connection doesn't survive tab switches — component remounts
//     via key={activeTabId} from App.tsx (same shape as WsPanel).

import { useEffect, useRef, useState } from "react";
import { useStore, useActiveVars } from "../store";
import { useT } from "../lib/i18n/useT";
import { envSubst } from "../lib/utils";
import {
  type SseMessage,
  type SseStatus,
  tryPrettyJson,
  looksLikeJson,
  nextMessageId,
  toEventSourceUrl,
} from "../lib/sse";
import { Button } from "./ui/button";
import { cn } from "../lib/cn";
import { Plug, PlugZap, Trash2, ArrowDown, Info, RefreshCw } from "lucide-react";

// Presenter — pure props in / actions in.
export type SsePanelProps = {
  url: string;
  status: SseStatus;
  messages: SseMessage[];
  onConnect: () => void;
  onDisconnect: () => void;
  onClearLog: () => void;
};

export function SsePanel(p: SsePanelProps) {
  const t = useT();
  const isOpen = p.status === "open";
  const isConnecting = p.status === "connecting";
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [p.messages.length]);

  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
        <StatusPill status={p.status} />
        <span className="text-xs font-mono text-[var(--color-fg-muted)] truncate flex-1 min-w-0">
          {p.url || t("sse.urlPlaceholder")}
        </span>
        <Button variant="ghost" size="sm" onClick={p.onClearLog} title={t("sse.clearLog")}>
          <Trash2 className="w-3 h-3" />
          {t("sse.clearLog")}
        </Button>
        {isOpen || isConnecting ? (
          <Button variant="danger" size="sm" onClick={p.onDisconnect}>
            <PlugZap className="w-3.5 h-3.5" />
            {t("sse.disconnect")}
          </Button>
        ) : p.status === "error" || p.status === "closed" ? (
          <Button variant="primary" size="sm" onClick={p.onConnect} disabled={!p.url}>
            <RefreshCw className="w-3.5 h-3.5" />
            {t("sse.reconnect")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={p.onConnect} disabled={!p.url}>
            <Plug className="w-3.5 h-3.5" />
            {t("sse.connect")}
          </Button>
        )}
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--color-bg)]">
        {p.messages.length === 0 ? (
          <div className="text-xs text-[var(--color-fg-muted)] italic text-center py-8">
            {isOpen ? t("sse.log.empty.connected") : t("sse.log.empty.disconnected")}
          </div>
        ) : (
          p.messages.map((m) => <MessageRow key={m.id} m={m} />)
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: SseStatus }) {
  const t = useT();
  const cls = {
    idle: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]",
    connecting: "bg-orange-500/15 text-[var(--color-warning)]",
    open: "bg-green-500/15 text-[var(--color-success)]",
    closed: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]",
    error: "bg-red-500/15 text-[var(--color-danger)]",
  }[status];
  const label = t(`sse.status.${status}` as const);
  return (
    <span className={"font-mono font-bold text-xs px-2.5 py-0.5 rounded-full " + cls}>{label}</span>
  );
}

function MessageRow({ m }: { m: SseMessage }) {
  const t = useT();
  const time = new Date(m.ts).toISOString().slice(11, 19); // HH:MM:SS UTC
  const pretty = m.isJson ? tryPrettyJson(m.data) : null;
  const Icon = m.direction === "received" ? ArrowDown : Info;
  const tone =
    m.direction === "received" ? "text-[var(--color-success)]" : "text-[var(--color-fg-muted)]";

  return (
    <div className="flex gap-2 text-xs">
      <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", tone)} aria-hidden />
      <span className="font-mono text-3xs text-[var(--color-fg-muted)] mt-0.5 shrink-0 tabular-nums">
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {m.direction === "received" && (
            <span
              className="text-4xs uppercase tracking-wider px-1.5 py-px rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
              title={t("sse.event.title")}
            >
              {m.eventName}
            </span>
          )}
          {m.isJson && (
            <span
              className="text-4xs uppercase tracking-wider text-[var(--color-fg-muted)]"
              title={t("sse.msg.json")}
            >
              JSON
            </span>
          )}
          {m.lastEventId && (
            <span
              className="text-4xs font-mono text-[var(--color-fg-muted)]"
              title={t("sse.lastEventId.title")}
            >
              id={m.lastEventId}
            </span>
          )}
        </div>
        <pre
          className={cn(
            "font-mono whitespace-pre-wrap break-all rounded px-2 py-1",
            "bg-[var(--color-bg-elev)] border border-[var(--color-border)]",
            m.direction === "system" && "italic"
          )}
        >
          {pretty ?? m.data}
        </pre>
      </div>
    </div>
  );
}

// Container — manages EventSource lifecycle for the active tab.
// Cleanup on unmount: same v1 limitation as WsPanel — connection
// dies on tab switch since the component remounts via key=tabId.
export function SsePanelContainer() {
  const url = useStore((s) => s.current.url);
  const vars = useActiveVars();
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const [status, setStatus] = useState<SseStatus>("idle");
  const [messages, setMessages] = useState<SseMessage[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const substituted = envSubst(url, vars);
  const targetUrl = toEventSourceUrl(substituted);

  const pushMessage = (m: Omit<SseMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nextMessageId() }]);
  };

  const onConnect = () => {
    if (esRef.current) return;
    if (!targetUrl) {
      showToast(t("toast.urlEmpty"));
      return;
    }
    setStatus("connecting");
    pushMessage({
      direction: "system",
      eventName: "system",
      data: t("sse.system.connecting", { url: targetUrl }),
      ts: Date.now(),
      isJson: false,
    });
    let es: EventSource;
    try {
      es = new EventSource(targetUrl);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setStatus("error");
      pushMessage({
        direction: "system",
        eventName: "system",
        data: t("sse.system.error", { error: msg }),
        ts: Date.now(),
        isJson: false,
      });
      return;
    }
    esRef.current = es;
    es.onopen = () => {
      setStatus("open");
      pushMessage({
        direction: "system",
        eventName: "system",
        data: t("sse.system.open"),
        ts: Date.now(),
        isJson: false,
      });
    };
    // Default unnamed events ("data: ..." with no preceding "event:" line)
    // come through onmessage with type === "message".
    es.onmessage = (ev) => {
      pushMessage({
        direction: "received",
        eventName: ev.type || "message",
        data: ev.data,
        lastEventId: ev.lastEventId || undefined,
        ts: Date.now(),
        isJson: looksLikeJson(ev.data),
      });
    };
    // Server-named events ("event: foo\ndata: ...") need addEventListener
    // wired explicitly. EventSource exposes no enumeration of the server's
    // event names, so we attach a small set of common ones; server messages
    // with other names still flow through `onmessage` if the server sends
    // generic `data:` entries first. v1 limitation — full server-defined
    // event capture would need fetch+ReadableStream parsing.
    const commonNames = ["error", "ping", "open", "close", "update", "delta", "patch"];
    for (const name of commonNames) {
      es.addEventListener(name, (ev) => {
        const me = ev as MessageEvent;
        pushMessage({
          direction: "received",
          eventName: name,
          data: me.data,
          lastEventId: me.lastEventId || undefined,
          ts: Date.now(),
          isJson: looksLikeJson(me.data),
        });
      });
    }
    es.onerror = () => {
      // EventSource doesn't differentiate "server closed" from "network
      // dropped" — both surface as a generic error. The browser will
      // auto-retry by default; we surface the state and let the user
      // explicitly reconnect via the Reconnect button.
      setStatus("error");
      pushMessage({
        direction: "system",
        eventName: "system",
        data: t("sse.system.errorGeneric"),
        ts: Date.now(),
        isJson: false,
      });
    };
  };

  const onDisconnect = () => {
    if (!esRef.current) return;
    esRef.current.close();
    esRef.current = null;
    setStatus("closed");
    pushMessage({
      direction: "system",
      eventName: "system",
      data: t("sse.system.closed"),
      ts: Date.now(),
      isJson: false,
    });
  };

  const onClearLog = () => setMessages([]);

  // Cleanup on unmount (tab switch via key={activeTabId}).
  useEffect(() => {
    return () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          /* already closed */
        }
        esRef.current = null;
      }
    };
  }, []);

  return (
    <SsePanel
      url={substituted}
      status={status}
      messages={messages}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onClearLog={onClearLog}
    />
  );
}
