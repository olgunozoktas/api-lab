/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAPI editor — a spec-editing surface that hosts a CodeMirror
// editor (left) beside a live validation + operations panel (right).
// Rendered by App.tsx whenever the active tab carries a `spec` payload.
//
// The outline reuses the Slice-1 `parseOpenApi` importer (dynamically
// imported, debounced on edit). Validation is the zero-dep structural
// `validateSpec` check — both run in the same debounced pass.

import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import { methodClass } from "../lib/utils";
import { validateSpec, type SpecIssue } from "../lib/specValidate";
import { downloadTextFile } from "../lib/responseDownload";
import { CodeEditor, type CodeLanguage } from "./ui/code-editor";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
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

function IssueRow({
  issue,
  errorTag,
  warnTag,
}: {
  issue: SpecIssue;
  errorTag: string;
  warnTag: string;
}) {
  const isError = issue.severity === "error";
  return (
    <div className="px-3 py-1 text-[11px] flex gap-1.5">
      <span
        className={cn(
          "font-mono font-semibold shrink-0 uppercase text-[9px] pt-0.5",
          isError ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]"
        )}
      >
        {isError ? errorTag : warnTag}
      </span>
      <span className="min-w-0">
        <span className="text-[var(--color-fg)]">{issue.message}</span>
        {issue.path ? (
          <span className="ml-1 font-mono text-[10px] text-[var(--color-fg-muted)]">
            {issue.path}
          </span>
        ) : null}
      </span>
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
  const [issues, setIssues] = useState<SpecIssue[]>([]);
  const [busy, setBusy] = useState(true);

  // Re-parse + re-validate on edit, debounced so a fast typist doesn't
  // re-run the parser on every keystroke.
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const handle = setTimeout(() => {
      void (async () => {
        const oas = await import("../lib/importers/openapi");
        let doc: unknown;
        let parsedOk = true;
        try {
          doc = oas.parseSpecText(text);
        } catch {
          parsedOk = false;
        }
        if (cancelled) return;
        if (!parsedOk) {
          setIssues([{ path: "", message: t("spec.validation.parseError"), severity: "error" }]);
          setOutline(null);
          setBusy(false);
          return;
        }
        setIssues(validateSpec(doc));
        try {
          const r = oas.parseOpenApi(text);
          setOutline({ items: r.items, requestCount: r.requestCount, folderCount: r.folderCount });
        } catch {
          setOutline(null);
        }
        setBusy(false);
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [text, t]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const lang = specLanguage(fileName, text);

  return (
    <div className={cn("flex h-full min-h-0", className)}>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1 flex items-center justify-between gap-2 border-b border-[var(--color-border)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] truncate">{fileName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              downloadTextFile(
                text,
                fileName,
                lang === "json" ? "application/json" : "application/yaml"
              )
            }
            className="text-[11px] h-auto py-0.5 px-1.5 shrink-0"
            title={t("spec.save.title")}
          >
            <Download className="w-3 h-3" />
            {t("spec.save")}
          </Button>
        </div>
        <div className="flex-1 min-h-0 p-2">
          <CodeEditor value={text} onChange={onChange} language={lang} className="h-full" />
        </div>
      </div>
      <div className="w-[300px] shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        {/* Validation */}
        <div className="shrink-0 max-h-[45%] flex flex-col border-b border-[var(--color-border)]">
          <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
            <span>{t("spec.validation.title")}</span>
            {issues.length > 0 ? (
              <span
                className={cn(
                  "font-mono normal-case tracking-normal tabular-nums text-[10px] px-1 rounded",
                  errorCount > 0
                    ? "bg-[var(--color-danger)] text-white"
                    : "bg-[var(--color-bg-elev-2)]"
                )}
              >
                {issues.length}
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pb-1">
            {issues.length === 0 ? (
              <div className="px-3 py-1 text-[11px] text-[var(--color-fg-muted)]">
                {busy ? t("spec.parsing") : t("spec.validation.ok")}
              </div>
            ) : (
              issues.map((issue, i) => (
                <IssueRow
                  key={`${issue.path}-${i}`}
                  issue={issue}
                  errorTag={t("spec.validation.errorTag")}
                  warnTag={t("spec.validation.warningTag")}
                />
              ))
            )}
          </div>
        </div>
        {/* Operations outline */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
            <span>{t("spec.outline.title")}</span>
            {outline ? (
              <span className="font-mono normal-case tracking-normal tabular-nums text-[10px] px-1 rounded bg-[var(--color-bg-elev-2)]">
                {outline.requestCount}
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {outline && outline.requestCount > 0 ? (
              <SpecOutline items={outline.items} />
            ) : (
              <div className="px-3 py-1 text-[11px] text-[var(--color-fg-muted)]">
                {busy ? t("spec.parsing") : t("spec.outline.empty")}
              </div>
            )}
          </div>
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
