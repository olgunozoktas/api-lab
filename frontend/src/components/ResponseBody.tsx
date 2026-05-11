import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { isProbablyJson, methodClass, statusText } from "../lib/utils";
import JsonView from "@uiw/react-json-view";
import { CodeEditor } from "./ui/code-editor";
import { SaveAsVariableMenu } from "./SaveAsVariable";
import type { HistoryItem, ResponseSnapshot, ResponseTab } from "../lib/types";

// Theme tokens fed to JsonView. Reads CSS variables so light/dark switch live.
const treeStyle: Record<string, string> = {
  "--w-rjv-font-family": "var(--font-mono)",
  "--w-rjv-color": "var(--color-fg)",
  "--w-rjv-background-color": "transparent",
  "--w-rjv-key-string": "var(--color-accent)",
  "--w-rjv-key-number": "var(--color-fg)",
  "--w-rjv-info-color": "var(--color-fg-muted)",
  "--w-rjv-update-color": "var(--color-fg-muted)",
  "--w-rjv-copied-color": "var(--color-success)",
  "--w-rjv-copied-success-color": "var(--color-success)",
  "--w-rjv-line-color": "var(--color-border)",
  "--w-rjv-arrow-color": "var(--color-fg-muted)",
  "--w-rjv-edit-color": "var(--color-fg)",
  "--w-rjv-info-collapsed-bg": "var(--color-bg-elev-2)",
  "--w-rjv-curlybraces-color": "var(--color-fg-muted)",
  "--w-rjv-brackets-color": "var(--color-fg-muted)",
  "--w-rjv-colon-color": "var(--color-fg-muted)",
  "--w-rjv-quotes-color": "var(--color-fg-muted)",
  "--w-rjv-string-color": "var(--color-success)",
  "--w-rjv-number-color": "var(--color-warning)",
  "--w-rjv-boolean-color": "var(--color-purple)",
  "--w-rjv-null-color": "var(--color-fg-muted)",
  "--w-rjv-type-string-color": "var(--color-success)",
  "--w-rjv-type-int-color": "var(--color-warning)",
  "--w-rjv-type-float-color": "var(--color-warning)",
  "--w-rjv-type-bigint-color": "var(--color-warning)",
  "--w-rjv-type-boolean-color": "var(--color-purple)",
  "--w-rjv-type-date-color": "var(--color-purple)",
  "--w-rjv-type-undefined-color": "var(--color-fg-muted)",
  "--w-rjv-type-null-color": "var(--color-fg-muted)",
  "--w-rjv-type-nan-color": "var(--color-fg-muted)",
  fontSize: "12px",
  padding: "0",
};

// Presenter.
export type ResponseBodyProps = {
  response: ResponseSnapshot | null;
  tab: ResponseTab;
};

export function ResponseBody({ response: r, tab }: ResponseBodyProps) {
  if (!r) return <EmptyState />;

  if (tab === "headers") {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-auto p-3">
          <table className="w-full border-collapse font-mono text-[11px] select-text">
            <tbody>
              {r.headers.map((h, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]">
                  <td className="px-2.5 py-1.5 align-top text-[var(--color-fg-muted)] w-[30%] break-all">
                    {h.k}
                  </td>
                  <td className="px-2.5 py-1.5 align-top break-all">{h.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SaveAsVariableMenu>
    );
  }

  if (tab === "raw") {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-hidden p-3">
          <CodeEditor value={r.body} language="json" readOnly minHeight={400} />
        </div>
      </SaveAsVariableMenu>
    );
  }

  // Body tab — SVG preview when the response is image/svg+xml (or a
  // body that begins with `<svg`). Rendered as `<img src="data:...">`
  // — browsers explicitly don't execute scripts in SVG used as an
  // image (image-context security model), so this is the safest
  // rendering path without needing an iframe sandbox.
  if (r.contentType.includes("image/svg") || /^\s*<svg[\s>]/i.test(r.body)) {
    // Use UTF-8 data URL (no base64 round-trip). encodeURIComponent
    // covers any character the curl body might surface that would
    // break the URL grammar.
    const svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(r.body)}`;
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-[var(--color-bg)]">
          <img
            src={svgUrl}
            alt="response-svg-preview"
            className="max-w-full max-h-full border border-[var(--color-border)] rounded bg-white"
          />
        </div>
      </SaveAsVariableMenu>
    );
  }

  // Body tab — HTML preview if the response declares text/html.
  // Renders inside a fully-sandboxed iframe (sandbox="") so scripts /
  // forms / popups / top-nav / same-origin storage all stay off. Pure
  // visual preview; the source view is still one click away in the
  // Raw tab.
  if (r.contentType.includes("text/html") || /^\s*<!doctype html|^\s*<html/i.test(r.body)) {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-hidden p-3">
          <iframe
            title="response-html-preview"
            sandbox=""
            srcDoc={r.body}
            className="w-full h-full border border-[var(--color-border)] rounded bg-white"
          />
        </div>
      </SaveAsVariableMenu>
    );
  }

  // Body tab
  if (r.contentType.includes("application/json") || isProbablyJson(r.body)) {
    try {
      const parsed = JSON.parse(r.body);
      return (
        <SaveAsVariableMenu>
          <div className="flex-1 overflow-auto p-3 select-text">
            <JsonView
              value={parsed}
              style={treeStyle as React.CSSProperties}
              displayDataTypes={false}
              displayObjectSize={true}
              collapsed={2}
            />
          </div>
        </SaveAsVariableMenu>
      );
    } catch {
      /* fall through */
    }
  }

  return (
    <SaveAsVariableMenu>
      <div className="flex-1 overflow-auto p-3">
        <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-words leading-6 select-text">
          {r.body}
        </pre>
      </div>
    </SaveAsVariableMenu>
  );
}

function EmptyState() {
  const t = useT();
  const history = useStore((s) => s.history);
  const loadHistoryItem = useStore((s) => s.loadHistoryItem);
  // Show up to 6 most-recent items as clickable suggestions so a fresh
  // empty request has a one-click way to recover any past send.
  const recent = history.slice(0, 6);

  if (recent.length === 0) {
    // No history yet — original "Ready to send" hint still serves the
    // first-launch case.
    return (
      <div className="flex-1 flex items-center justify-center text-center text-[var(--color-fg-muted)] gap-2 flex-col">
        <div>{t("response.empty.title")}</div>
        <div className="text-[11px] flex items-center gap-1.5">
          <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
          <Kbd>⌘</Kbd>+<Kbd>S</Kbd>
          <Kbd>⌘</Kbd>+<Kbd>N</Kbd>
          <span>{t("response.empty.shortcuts")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="text-center text-[var(--color-fg-muted)]">
          <div className="text-sm">{t("response.empty.title")}</div>
          <div className="text-[11px] flex items-center justify-center gap-1.5 mt-1">
            <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
            <Kbd>⌘</Kbd>+<Kbd>S</Kbd>
            <Kbd>⌘</Kbd>+<Kbd>N</Kbd>
            <span>{t("response.empty.shortcuts")}</span>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-fg-muted)] mb-2 px-1">
            {t("response.empty.recentHistory")}
          </p>
          <ul role="list" className="space-y-1">
            {recent.map((h) => (
              <HistoryRecentItem
                key={h.id}
                item={h}
                onLoad={() => loadHistoryItem(h)}
                pickHint={t("response.empty.pickHint")}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function HistoryRecentItem({
  item,
  onLoad,
  pickHint,
}: {
  item: HistoryItem;
  onLoad: () => void;
  pickHint: string;
}) {
  const status = item.response.status;
  const ok = status >= 200 && status < 400;
  return (
    <li>
      <button
        type="button"
        onClick={onLoad}
        title={pickHint}
        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        <span
          className={`text-[10px] font-mono font-semibold uppercase tracking-wide w-12 shrink-0 ${methodClass(item.request.method)}`}
        >
          {item.request.method}
        </span>
        <span
          className={`text-[10px] font-mono font-semibold w-9 shrink-0 ${ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
          aria-label={statusText(status)}
        >
          {status || "—"}
        </span>
        <span className="flex-1 truncate font-mono text-xs text-[var(--color-fg)]">
          {item.request.url || "—"}
        </span>
        <span className="text-[10px] text-[var(--color-fg-muted)] tabular-nums shrink-0">
          {Math.round(item.response.elapsedMs)}ms
        </span>
      </button>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}

// Container — wires the store.
export function ResponseBodyContainer() {
  const response = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);
  return <ResponseBody response={response} tab={tab} />;
}
