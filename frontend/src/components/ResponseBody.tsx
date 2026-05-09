import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { isProbablyJson } from "../lib/utils";
import JsonView from "@uiw/react-json-view";
import { CodeEditor } from "./ui/code-editor";
import { SaveAsVariableMenu } from "./SaveAsVariable";
import type { ResponseSnapshot, ResponseTab } from "../lib/types";

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
