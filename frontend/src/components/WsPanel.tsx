/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useRef, useState } from "react";
import { useStore, useActiveVars } from "../store";
import { useT } from "../lib/i18n/useT";
import { envSubst } from "../lib/utils";
import {
  type WsMessage,
  type WsStatus,
  tryPrettyJson,
  looksLikeJson,
  nextMessageId,
  DEFAULT_PING_PAYLOAD,
} from "../lib/ws";
import { Button } from "./ui/button";
import { cn } from "../lib/cn";
import { Plug, PlugZap, Send, Trash2, ArrowDown, ArrowUp, Info } from "lucide-react";

// Presenter — pure props in / actions in. Lifecycle lives in the container.
export type WsPanelProps = {
  url: string;
  status: WsStatus;
  messages: WsMessage[];
  draft: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: () => void;
  onPing: () => void;
  onClearLog: () => void;
  onDraftChange: (s: string) => void;
};

export function WsPanel(p: WsPanelProps) {
  const t = useT();
  const isOpen = p.status === "open";
  const isConnecting = p.status === "connecting";
  const canSend = isOpen && p.draft.length > 0;
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
          {p.url || t("ws.urlPlaceholder")}
        </span>
        <Button variant="ghost" size="sm" onClick={p.onClearLog} title={t("ws.clearLog")}>
          <Trash2 className="w-3 h-3" />
          {t("ws.clearLog")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={p.onPing}
          disabled={!isOpen}
          title={t("ws.ping.title")}
        >
          {t("ws.ping")}
        </Button>
        {isOpen || isConnecting ? (
          <Button variant="danger" size="sm" onClick={p.onDisconnect}>
            <PlugZap className="w-3.5 h-3.5" />
            {t("ws.disconnect")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={p.onConnect} disabled={!p.url}>
            <Plug className="w-3.5 h-3.5" />
            {t("ws.connect")}
          </Button>
        )}
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--color-bg)]">
        {p.messages.length === 0 ? (
          <div className="text-xs text-[var(--color-fg-muted)] italic text-center py-8">
            {isOpen ? t("ws.log.empty.connected") : t("ws.log.empty.disconnected")}
          </div>
        ) : (
          p.messages.map((m) => <MessageRow key={m.id} m={m} />)
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 flex gap-2">
        <textarea
          value={p.draft}
          onChange={(e) => p.onDraftChange(e.target.value)}
          placeholder={isOpen ? t("ws.send.placeholder") : t("ws.send.placeholder.disconnected")}
          disabled={!isOpen}
          rows={3}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (canSend) p.onSend();
            }
          }}
          className={cn(
            "flex-1 bg-[var(--color-bg)] border border-[var(--color-border)]",
            "rounded-md px-2.5 py-1.5 font-mono text-xs outline-none resize-none",
            "focus:border-[var(--color-accent)] disabled:opacity-50"
          )}
        />
        <Button variant="primary" size="md" onClick={p.onSend} disabled={!canSend}>
          <Send className="w-3.5 h-3.5" />
          {t("ws.send")}
        </Button>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: WsStatus }) {
  const t = useT();
  const cls = {
    idle: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]",
    connecting: "bg-orange-500/15 text-[var(--color-warning)]",
    open: "bg-green-500/15 text-[var(--color-success)]",
    closing: "bg-orange-500/15 text-[var(--color-warning)]",
    closed: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]",
    error: "bg-red-500/15 text-[var(--color-danger)]",
  }[status];
  const label = t(`ws.status.${status}` as const);
  return (
    <span className={"font-mono font-bold text-xs px-2.5 py-0.5 rounded-full " + cls}>{label}</span>
  );
}

function MessageRow({ m }: { m: WsMessage }) {
  const t = useT();
  const time = new Date(m.ts).toISOString().slice(11, 19); // HH:MM:SS UTC
  const pretty = m.isJson ? tryPrettyJson(m.text) : null;
  const Icon = m.direction === "sent" ? ArrowUp : m.direction === "received" ? ArrowDown : Info;
  const tone =
    m.direction === "sent"
      ? "text-[var(--color-accent)]"
      : m.direction === "received"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-fg-muted)]";

  return (
    <div className="flex gap-2 text-xs">
      <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", tone)} aria-hidden />
      <span className="font-mono text-3xs text-[var(--color-fg-muted)] mt-0.5 shrink-0 tabular-nums">
        {time}
      </span>
      <div className="flex-1 min-w-0">
        {m.isJson && (
          <span
            className="text-4xs uppercase tracking-wider text-[var(--color-fg-muted)] mr-1.5"
            title={t("ws.msg.json")}
          >
            JSON
          </span>
        )}
        <pre
          className={cn(
            "font-mono whitespace-pre-wrap break-all rounded px-2 py-1",
            "bg-[var(--color-bg-elev)] border border-[var(--color-border)]",
            m.direction === "system" && "italic"
          )}
        >
          {pretty ?? m.text}
        </pre>
      </div>
    </div>
  );
}

// Container — manages WebSocket lifecycle for the active tab.
// v1 limitation: connection does not survive tab switches (component
// remounts via key={activeTabId} from App.tsx). Per-tab persistent
// connections would require lifting state out of the component into
// a tabId → WebSocket map; deferred to a follow-up if users complain.
export function WsPanelContainer() {
  const url = useStore((s) => s.current.url);
  const vars = useActiveVars();
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const [status, setStatus] = useState<WsStatus>("idle");
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [draft, setDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const substituted = envSubst(url, vars);

  const pushMessage = (m: Omit<WsMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nextMessageId() }]);
  };

  const onConnect = () => {
    if (wsRef.current) return;
    if (!substituted) {
      showToast(t("toast.urlEmpty"), { severity: "warning" });
      return;
    }
    setStatus("connecting");
    pushMessage({
      direction: "system",
      text: t("ws.system.connecting", { url: substituted }),
      ts: Date.now(),
      isJson: false,
    });
    let ws: WebSocket;
    try {
      ws = new WebSocket(substituted);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setStatus("error");
      pushMessage({
        direction: "system",
        text: t("ws.system.error", { error: msg }),
        ts: Date.now(),
        isJson: false,
      });
      return;
    }
    wsRef.current = ws;
    ws.addEventListener("open", () => {
      setStatus("open");
      pushMessage({
        direction: "system",
        text: t("ws.system.open"),
        ts: Date.now(),
        isJson: false,
      });
    });
    ws.addEventListener("message", (ev) => {
      const text = typeof ev.data === "string" ? ev.data : "[binary]";
      pushMessage({
        direction: "received",
        text,
        ts: Date.now(),
        isJson: looksLikeJson(text),
      });
    });
    ws.addEventListener("close", (ev) => {
      setStatus("closed");
      pushMessage({
        direction: "system",
        text: t("ws.system.closed", { code: ev.code, reason: ev.reason || "—" }),
        ts: Date.now(),
        isJson: false,
      });
      wsRef.current = null;
    });
    ws.addEventListener("error", () => {
      // The "error" event in browsers is intentionally information-poor for
      // security reasons; the close event that follows carries the code.
      setStatus("error");
      pushMessage({
        direction: "system",
        text: t("ws.system.errorGeneric"),
        ts: Date.now(),
        isJson: false,
      });
    });
  };

  const onDisconnect = () => {
    if (!wsRef.current) return;
    setStatus("closing");
    wsRef.current.close(1000, "user-disconnect");
  };

  const onSend = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = draft;
    if (!text) return;
    wsRef.current.send(text);
    pushMessage({ direction: "sent", text, ts: Date.now(), isJson: looksLikeJson(text) });
    setDraft("");
  };

  const onPing = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(DEFAULT_PING_PAYLOAD);
    pushMessage({
      direction: "sent",
      text: DEFAULT_PING_PAYLOAD,
      ts: Date.now(),
      isJson: false,
    });
  };

  const onClearLog = () => setMessages([]);

  // Cleanup on unmount (tab switch via key={activeTabId}).
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* already closed */
        }
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <WsPanel
      url={substituted}
      status={status}
      messages={messages}
      draft={draft}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSend={onSend}
      onPing={onPing}
      onClearLog={onClearLog}
      onDraftChange={setDraft}
    />
  );
}
