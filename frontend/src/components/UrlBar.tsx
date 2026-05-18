/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useRef, useState } from "react";
import { useStore, useActiveVars } from "../store";
import { envSubst, methodClass, tokenizeUnresolvedVars, hasUnresolvedVars } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { KbdHint } from "./ui/kbd-hint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertTriangle, Send, Wand2, X } from "lucide-react";
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
  // When set + different from `url`, rendered as a small faded line
  // below the URL input so the user can see what their `{{var}}`
  // references actually resolve to before hitting Send. Container
  // computes via `envSubst(url, activeVars)`. Undefined = no preview.
  resolvedUrl?: string;
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
  resolvedUrl,
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
  // Show the resolved-URL preview whenever the user has `{{var}}`
  // references AND either substitution changes the string OR some refs
  // are unresolved (typo / missing-key warning). Hidden entirely on
  // plain URLs.
  const hasRefs = /\{\{/.test(url);
  const someUnresolved = !!resolvedUrl && hasUnresolvedVars(resolvedUrl);
  const showResolved = hasRefs && !!resolvedUrl && (resolvedUrl !== url || someUnresolved);
  const resolvedTokens = showResolved ? tokenizeUnresolvedVars(resolvedUrl!) : [];
  return (
    <div className="bg-[var(--color-bg-elev)] border-b border-[var(--color-border)]">
      <div className="flex gap-1.5 px-3 pt-2.5 pb-1.5">
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
            <KbdHint>⌘ .</KbdHint>
          </Button>
        )}
        {!hideSend && !showCancel && (
          <Button
            variant="primary"
            onClick={onSend}
            disabled={busy}
            title={
              someUnresolved
                ? `${t("composer.send.title")}\n\n⚠ ${t("composer.url.unresolvedHint")}`
                : t("composer.send.title")
            }
          >
            {someUnresolved && !busy ? (
              <AlertTriangle
                className="w-3.5 h-3.5 text-[var(--color-warning)]"
                aria-label={t("composer.url.unresolvedHint")}
              />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {busy ? t("composer.sending") : t("composer.send")}
            {!busy && <KbdHint>⌘ ↵</KbdHint>}
          </Button>
        )}
      </div>
      {showResolved && (
        <div
          className="px-3 pb-2 -mt-0.5 font-mono text-3xs text-[var(--color-fg-muted)] truncate"
          title={
            someUnresolved ? `${resolvedUrl}\n\n${t("composer.url.unresolvedHint")}` : resolvedUrl
          }
          aria-label={t("composer.url.resolvedAria")}
        >
          <span className="opacity-70">
            {someUnresolved ? t("composer.url.unresolvedLabel") : t("composer.url.resolvesTo")}
          </span>{" "}
          {resolvedTokens.map((tok, i) =>
            tok.kind === "text" ? (
              <span key={i} className="text-[var(--color-fg)]">
                {tok.value}
              </span>
            ) : (
              <span
                key={i}
                className="text-red-400 bg-red-500/10 rounded px-1"
                title={t("composer.url.unresolvedVarTitle", { name: tok.name })}
              >
                {"{{" + tok.name + "}}"}
              </span>
            )
          )}
        </div>
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
  const vars = useActiveVars();
  const t = useT();
  // Compute the resolved URL only when the input has `{{...}}` so
  // plain URLs skip the envSubst regex entirely. Empty-string result
  // from substitution is treated the same as no preview.
  const resolvedUrl = /\{\{/.test(url) ? envSubst(url, vars) : undefined;

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
        resolvedUrl={resolvedUrl}
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
