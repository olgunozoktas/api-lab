import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Send, Wand2, X } from "lucide-react";
import { looksLikeCurl, parseCurl } from "../lib/curlParse";
import type { CurrentRequest } from "../lib/types";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

// Presenter.
export type UrlBarProps = {
  method: string;
  url: string;
  busy: boolean;
  hideSend?: boolean;
  hideMethod?: boolean;
  onMethodChange: (m: string) => void;
  onUrlChange: (u: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  onCurlPaste?: (text: string) => boolean; // returns true if handled
};

// Custom event name dispatched by App.tsx's ⌘L handler. The UrlBar
// listens globally so it can focus + select-all without prop-drilling
// a ref through the App→RequestComposer→UrlBar chain.
export const FOCUS_URL_EVENT = "apilab:focus-url";

export function UrlBar({
  method,
  url,
  busy,
  hideSend,
  hideMethod,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
  onCurlPaste,
}: UrlBarProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘L (browser address-bar standard) focuses + selects the URL. Each
  // mounted UrlBar listens; in practice only the active tab's bar
  // matters because that's the one in the DOM render tree.
  useEffect(() => {
    function onFocus() {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }
    window.addEventListener(FOCUS_URL_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_URL_EVENT, onFocus);
  }, []);

  // While in-flight, the green Send morphs into a red Cancel that
  // calls the abort-controller wired up in App.tsx. Falls back to
  // the disabled-Send shape when no onCancel is wired (older callers).
  const showCancel = busy && !!onCancel;
  return (
    <div className="flex gap-1.5 px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)]">
      {!hideMethod && (
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger
            aria-label="HTTP method"
            className={"w-22 font-mono font-bold " + methodClass(method)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                <span className={"font-mono font-bold " + methodClass(m)}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onPaste={(e) => {
          if (!onCurlPaste) return;
          const text = e.clipboardData.getData("text/plain");
          if (looksLikeCurl(text)) {
            const handled = onCurlPaste(text);
            if (handled) e.preventDefault();
          }
        }}
        placeholder={t("composer.urlPlaceholder", { vars: "{{base_url}}/path" })}
        className={
          "flex-1 bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] " +
          "rounded-md px-2.5 py-1.5 font-mono text-xs outline-none " +
          "focus:border-[var(--color-accent)]"
        }
      />
      {!hideSend && showCancel && (
        <Button
          variant="danger"
          onClick={onCancel}
          title={t("composer.cancelTitle")}
          aria-label={t("composer.cancelTitle")}
        >
          <X className="w-3.5 h-3.5" />
          {t("composer.cancel")}
        </Button>
      )}
      {!hideSend && !showCancel && (
        <Button variant="primary" onClick={onSend} disabled={busy}>
          <Send className="w-3.5 h-3.5" />
          {busy ? t("composer.sending") : t("composer.send")}
        </Button>
      )}
    </div>
  );
}

// Container — wires the store + send action + cURL paste handler.
export type UrlBarContainerProps = {
  busy: boolean;
  onSend: () => void;
  onCancel?: () => void;
  hideSend?: boolean;
  hideMethod?: boolean;
};

export function UrlBarContainer({
  busy,
  onSend,
  onCancel,
  hideSend,
  hideMethod,
}: UrlBarContainerProps) {
  const method = useStore((s) => s.current.method);
  const url = useStore((s) => s.current.url);
  const setCurrent = useStore((s) => s.setCurrent);
  const setUi = useStore((s) => s.setUi);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  // Last-paste preview lets the user see WHAT will be imported before
  // committing. Without it, a paste either silently rewrites the
  // request (surprising) or pops a confirm() (jarring).
  const [pending, setPending] = useState<{
    raw: string;
    parsed: ReturnType<typeof parseCurl>;
  } | null>(null);

  const onCurlPaste = (text: string): boolean => {
    const parsed = parseCurl(text);
    if (!parsed.url) return false; // tokenizer found nothing useful
    setPending({ raw: text, parsed });
    return true;
  };

  const applyImport = () => {
    if (!pending) return;
    const p = pending.parsed;
    const patch: Partial<CurrentRequest> = {
      method: p.method,
      url: p.url,
    };
    if (p.headers.length > 0) {
      patch.headers = [...p.headers, { enabled: true, k: "", v: "" }];
    }
    if (p.body) {
      patch.body = { mode: "raw", text: p.body };
    }
    if (p.auth) {
      patch.auth = p.auth;
    }
    setCurrent(patch);
    if (p.body) {
      setUi({ composerTab: "body" });
    }
    showToast(t("curl.imported"));
    setPending(null);
  };

  return (
    <div className="flex flex-col">
      <UrlBar
        method={method}
        url={url}
        busy={busy}
        hideSend={hideSend}
        hideMethod={hideMethod}
        onMethodChange={(m) => setCurrent({ method: m })}
        onUrlChange={(u) => setCurrent({ url: u })}
        onSend={onSend}
        onCancel={onCancel}
        onCurlPaste={onCurlPaste}
      />
      {pending && (
        <CurlImportBanner
          parsed={pending.parsed}
          onApply={applyImport}
          onDismiss={() => setPending(null)}
        />
      )}
    </div>
  );
}

function CurlImportBanner({
  parsed,
  onApply,
  onDismiss,
}: {
  parsed: ReturnType<typeof parseCurl>;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <div
      className={
        "px-3 py-2 border-b border-[var(--color-border)] " +
        "bg-[var(--color-accent)]/10 flex items-center gap-3 text-xs"
      }
    >
      <Wand2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden />
      <span className="text-[var(--color-fg)] font-medium shrink-0">{t("curl.detected")}</span>
      <span className="font-mono text-[var(--color-fg-muted)] truncate flex-1 min-w-0">
        {parsed.method} {parsed.url}
        {parsed.headers.length > 0 && ` · ${parsed.headers.length} ${t("curl.headers")}`}
        {parsed.body && ` · body`}
        {parsed.auth && ` · ${parsed.auth.type}`}
      </span>
      <Button variant="primary" size="sm" onClick={onApply}>
        {t("curl.import")}
      </Button>
      <button
        aria-label={t("curl.dismiss")}
        onClick={onDismiss}
        className="px-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] rounded"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
