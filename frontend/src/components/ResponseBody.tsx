/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { isProbablyJson } from "../lib/utils";
import JsonView from "@uiw/react-json-view";
import { Check, Copy, Search, X } from "lucide-react";
import { useCopyFeedback } from "../lib/useCopyFeedback";
import { CodeEditor } from "./ui/code-editor";
import { SaveAsVariableMenu } from "./SaveAsVariable";
import { ResponseEmpty } from "./ResponseEmpty";
import { HexViewer } from "./HexViewer";
import { XmlTreeView } from "./XmlTreeView";
import { ResponseBinaryBody } from "./ResponseBinaryBody";
import type { ResponseHeader, ResponseSnapshot, ResponseTab } from "../lib/types";

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
  if (!r) return <ResponseEmpty />;

  if (tab === "headers") {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ResponseHeadersTable headers={r.headers} />
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

  // Body tab — binary response channel. When the native bridge flags
  // a body as binary it arrives base64-encoded; ResponseBinaryBody
  // decodes it and dispatches to an image / audio / video / PDF
  // preview (or a hex fallback), or shows a too-large notice. SVG /
  // HTML / XML / JSON stay text and are handled below.
  if (r.bodyTooLarge || r.bodyBase64) {
    return (
      <SaveAsVariableMenu>
        <ResponseBinaryBody response={r} />
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

  // Body tab — XML tree view for application/xml, text/xml, and any
  // `+xml` media type (image/svg+xml is already handled above).
  if (
    r.contentType.includes("application/xml") ||
    r.contentType.includes("text/xml") ||
    (/\+xml/.test(r.contentType) && !r.contentType.includes("svg"))
  ) {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-hidden flex flex-col">
          <XmlTreeView body={r.body} />
        </div>
      </SaveAsVariableMenu>
    );
  }

  // Body tab — hex viewer for binary payloads with no richer viewer.
  if (r.contentType.includes("octet-stream") || r.contentType.includes("binary")) {
    return (
      <SaveAsVariableMenu>
        <div className="flex-1 overflow-hidden flex flex-col">
          <HexViewer body={r.body} />
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

// Response Headers table with click-to-copy on each row. Clicking the
// value cell (or the hover-revealed Copy icon) puts the header value
// onto the clipboard — useful for grabbing Authorization, Location,
// Set-Cookie, X-Request-Id, etc. without text-selecting through wrap.
function ResponseHeadersTable({ headers }: { headers: ResponseHeader[] }) {
  const t = useT();
  const showToast = useStore((s) => s.showToast);
  const [query, setQuery] = useState("");

  const copy = (h: ResponseHeader) => {
    navigator.clipboard
      .writeText(h.v)
      .then(() => showToast(t("response.headers.valueCopied", { name: h.k })));
  };

  // Filter substring-matches against both the header name AND its
  // value, case-insensitive. CDN responses regularly carry 30+
  // headers — typing `cache` or `cors` narrows to the relevant ones
  // without scrolling. Empty query (after trim) bypasses filtering.
  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return headers;
    return headers.filter(
      (h) => h.k.toLowerCase().includes(trimmed) || h.v.toLowerCase().includes(trimmed)
    );
  }, [headers, trimmed]);

  return (
    <>
      <div className="px-3 pt-3 pb-2 shrink-0 relative">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-fg-muted)] pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("response.headers.searchPlaceholder")}
          aria-label={t("response.headers.searchAria")}
          className="w-full bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded-md pl-7 pr-7 py-1 text-[11px] font-mono outline-none focus:border-[var(--color-accent)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("collections.search.clear")}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
          >
            <X className="w-3 h-3" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-6">
            {t("collections.search.empty")}
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-[11px] select-text">
            <tbody>
              {filtered.map((h, i) => (
                <tr key={i} className="group border-b border-[var(--color-border)]">
                  <td className="px-2.5 py-1.5 align-top text-[var(--color-fg-muted)] w-[30%] break-all">
                    {h.k}
                  </td>
                  <td className="px-2.5 py-1.5 align-top break-all">
                    <div className="flex items-start gap-2">
                      <span className="flex-1 break-all">{h.v}</span>
                      <HeaderCopyButton header={h} onCopy={copy} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// Per-row copy button with the same Copy→Check flash the ResponseHead
// uses. Each row owns its own flash state so hitting Copy on one row
// doesn't briefly mark every other row as "copied"; the parent
// supplies the actual clipboard write via `onCopy` so the toast
// channel stays centralized.
function HeaderCopyButton({
  header: h,
  onCopy,
}: {
  header: ResponseHeader;
  onCopy: (h: ResponseHeader) => void;
}) {
  const t = useT();
  const { copied, flash } = useCopyFeedback();
  return (
    <button
      type="button"
      onClick={() => {
        onCopy(h);
        flash();
      }}
      className={
        // Hover-reveal stays, but the check sticks the button visible
        // for the duration of the flash so the confirmation is seen
        // even when the user's cursor has already moved off the row.
        (copied ? "opacity-100 " : "opacity-0 group-hover:opacity-100 ") +
        "shrink-0 p-0.5 rounded text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] transition-colors"
      }
      aria-label={t("response.headers.copyValue", { name: h.k })}
      title={t("response.headers.copyValue", { name: h.k })}
    >
      {copied ? (
        <Check className="w-3 h-3 text-[var(--color-success)]" aria-hidden />
      ) : (
        <Copy className="w-3 h-3" aria-hidden />
      )}
    </button>
  );
}

// Container — wires the store.
export function ResponseBodyContainer() {
  const response = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);
  return <ResponseBody response={response} tab={tab} />;
}
