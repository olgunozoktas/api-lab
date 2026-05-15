/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAPI editor — a spec-editing surface that hosts a CodeMirror
// editor (left) beside a live operations outline (right). Rendered by
// App.tsx whenever the active tab carries a `spec` payload.
//
// The outline reuses the Slice-1 `parseOpenApi` importer (dynamically
// imported, debounced on edit) so the same parser powers both the
// outline and the eventual "convert to collection" action.

import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import { methodClass } from "../lib/utils";
import { CodeEditor, type CodeLanguage } from "./ui/code-editor";
import type { CollectionItem } from "../lib/types";

type Outline = {
  items: CollectionItem[];
  requestCount: number;
  folderCount: number;
};

// Pick the editor language from the file extension, falling back to a
// content sniff (a leading `{` means JSON, otherwise YAML).
function specLanguage(fileName: string, text: string): CodeLanguage {
  if (/\.ya?ml$/i.test(fileName)) return "yaml";
  if (/\.json$/i.test(fileName)) return "json";
  return text.trimStart().startsWith("{") ? "json" : "yaml";
}

function OpRow({ item }: { item: CollectionItem }) {
  const method = item.request?.method ?? "GET";
  return (
    <div className="px-3 py-1 flex items-center gap-2 text-[11px] hover:bg-[var(--color-bg-elev-2)]">
      <span className={cn("font-mono font-semibold shrink-0 w-12", methodClass(method))}>
        {method}
      </span>
      <span className="truncate text-[var(--color-fg)]" title={item.name}>
        {item.name}
      </span>
    </div>
  );
}

function SpecOutline({ items }: { items: CollectionItem[] }) {
  const folders = items.filter((i) => i.kind === "folder");
  const requestsOf = (parentId: string | null) =>
    items.filter((i) => i.kind === "request" && i.parentId === parentId);
  return (
    <div className="py-1">
      {requestsOf(null).map((r) => (
        <OpRow key={r.id} item={r} />
      ))}
      {folders.map((f) => (
        <div key={f.id}>
          <div className="px-3 py-1 mt-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-fg-muted)]">
            {f.name}
          </div>
          {requestsOf(f.id).map((r) => (
            <OpRow key={r.id} item={r} />
          ))}
        </div>
      ))}
    </div>
  );
}

export type OpenApiEditorProps = {
  text: string;
  fileName: string;
  onChange: (text: string) => void;
  className?: string;
};

/** Presenter — pure props, no store access. */
export function OpenApiEditor({ text, fileName, onChange, className }: OpenApiEditorProps) {
  const t = useT();
  const [outline, setOutline] = useState<Outline | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(true);

  // Re-parse the outline on edit, debounced so a fast typist doesn't
  // re-run the parser on every keystroke.
  useEffect(() => {
    let cancelled = false;
    setParsing(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const oas = await import("../lib/importers/openapi");
          const r = oas.parseOpenApi(text);
          if (cancelled) return;
          setOutline({ items: r.items, requestCount: r.requestCount, folderCount: r.folderCount });
          setParseError(null);
        } catch (e) {
          if (cancelled) return;
          setOutline(null);
          setParseError(e instanceof Error ? e.message : String(e));
        } finally {
          if (!cancelled) setParsing(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [text]);

  return (
    <div className={cn("flex h-full min-h-0", className)}>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1.5 text-[11px] text-[var(--color-fg-muted)] border-b border-[var(--color-border)] truncate">
          {fileName}
        </div>
        <div className="flex-1 min-h-0 p-2">
          <CodeEditor
            value={text}
            onChange={onChange}
            language={specLanguage(fileName, text)}
            className="h-full"
          />
        </div>
      </div>
      <div className="w-[280px] shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)] border-b border-[var(--color-border)]">
          <span>{t("spec.outline.title")}</span>
          {outline ? (
            <span className="font-mono normal-case tracking-normal tabular-nums text-[10px] px-1 rounded bg-[var(--color-bg-elev-2)]">
              {outline.requestCount}
            </span>
          ) : null}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {parseError ? (
            <div className="px-3 py-3 text-[11px] text-[var(--color-danger)]">
              {t("spec.invalid")}
            </div>
          ) : outline && outline.requestCount > 0 ? (
            <SpecOutline items={outline.items} />
          ) : parsing ? (
            <div className="px-3 py-3 text-[11px] text-[var(--color-fg-muted)]">
              {t("spec.parsing")}
            </div>
          ) : (
            <div className="px-3 py-3 text-[11px] text-[var(--color-fg-muted)]">
              {t("spec.outline.empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Container — wires the active spec tab to the presenter. */
export function OpenApiEditorContainer() {
  const activeTabId = useStore((s) => s.activeTabId);
  const spec = useStore((s) => s.tabs.find((tab) => tab.id === s.activeTabId)?.spec);
  const updateSpecText = useStore((s) => s.updateSpecText);
  if (!spec) return null;
  return (
    <OpenApiEditor
      text={spec.text}
      fileName={spec.fileName}
      onChange={(text) => updateSpecText(activeTabId, text)}
    />
  );
}
