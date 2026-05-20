/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAPI editor — a CodeMirror spec editor (left) beside either the
// validation / Spectral-lint / outline panel or a live Redoc docs
// preview (right). Rendered by App.tsx whenever the active tab carries
// a `spec` payload.
//
// The debounced edit pass parses the spec once and fans the result
// out: the Slice-1 importer (outline), the structural `validateSpec`,
// Spectral linting, and — for the docs view — the parsed document fed
// to Redoc. Redoc (~1 MB) is lazy-loaded behind the Docs toggle.

import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import { validateSpec, type SpecIssue } from "../lib/specValidate";
import { lintSpec, type LintFinding } from "../lib/spectralLint";
import { downloadTextFile } from "../lib/responseDownload";
import { buildRedocHtml } from "../lib/redocHtml";
import { bridge, shellOpen, shellWriteTempFile } from "../lib/bridge";
import { CodeEditor, type CodeLanguage } from "./ui/code-editor";
import { Button } from "./ui/button";
import { SpecSidePanel, type Outline } from "./SpecSidePanel";
import { SpecRulesetModal } from "./SpecRulesetModal";
import { EmptyState } from "./ui/empty-state";
import { Download, FileText, FolderInput, PanelRight } from "lucide-react";

// Redoc + its peers are ~1 MB — only ever reached via this lazy import.
const RedocPane = lazy(() => import("./RedocPane"));

type ViewMode = "panel" | "docs";

// Pick the editor language from the file extension, falling back to a
// content sniff (a leading `{` means JSON, otherwise YAML).
function specLanguage(fileName: string, text: string): CodeLanguage {
  if (/\.ya?ml$/i.test(fileName)) return "yaml";
  if (/\.json$/i.test(fileName)) return "json";
  return text.trimStart().startsWith("{") ? "json" : "yaml";
}

export type OpenApiEditorProps = {
  text: string;
  fileName: string;
  ruleset: string;
  dark: boolean;
  onChange: (text: string) => void;
  // Convert the current spec into a sidebar collection.
  onConvert: () => void;
  onEditRuleset: () => void;
  className?: string;
};

/** Presenter — pure props, no store access. */
export function OpenApiEditor({
  text,
  fileName,
  ruleset,
  dark,
  onChange,
  onConvert,
  onEditRuleset,
  className,
}: OpenApiEditorProps) {
  const t = useT();
  const [outline, setOutline] = useState<Outline | null>(null);
  const [issues, setIssues] = useState<SpecIssue[]>([]);
  const [lintFindings, setLintFindings] = useState<LintFinding[]>([]);
  const [parsedDoc, setParsedDoc] = useState<object | null>(null);
  const [busy, setBusy] = useState(true);
  const [lintBusy, setLintBusy] = useState(true);
  const [view, setView] = useState<ViewMode>("panel");
  const lang = specLanguage(fileName, text);

  // Re-parse + re-validate + re-lint on edit (or ruleset change),
  // debounced so a fast typist doesn't re-run on every keystroke. The
  // parsed document also feeds the live Redoc preview.
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setLintBusy(true);
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
          setLintFindings([]);
          setParsedDoc(null);
          setBusy(false);
          setLintBusy(false);
          return;
        }
        setParsedDoc(doc && typeof doc === "object" ? (doc as object) : null);
        setIssues(validateSpec(doc));
        try {
          const r = oas.parseOpenApi(text);
          setOutline({ items: r.items, requestCount: r.requestCount, folderCount: r.folderCount });
        } catch {
          setOutline(null);
        }
        setBusy(false);
        // Spectral lint — parseable doc only; tolerate any engine error.
        try {
          const findings = await lintSpec(text, lang === "json", ruleset || undefined);
          if (!cancelled) setLintFindings(findings);
        } catch {
          if (!cancelled) setLintFindings([]);
        }
        if (!cancelled) setLintBusy(false);
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [text, ruleset, lang, t]);

  const errorCount = issues.filter((i) => i.severity === "error").length;

  const exportDocs = async () => {
    if (!parsedDoc) return;
    const base = fileName.replace(/\.[^.]+$/, "");
    const html = buildRedocHtml(parsedDoc, base);
    const name = `${base}-docs.html`;

    // Native path (zero-native): stage the bundle under the cache
    // exports root, then ask the OS to open it in the user's
    // default browser. Falls back to the download flow when the
    // bridge isn't reachable (browser-mode dev) or any step fails
    // — staying behind the existing "Export HTML" button label
    // keeps the user's expectation that they'll *get a file*
    // either way.
    if (bridge.available) {
      const path = await shellWriteTempFile(name, html);
      if (path) {
        const opened = await shellOpen(`file://${path}`);
        if (opened) return;
      }
    }
    downloadTextFile(html, name, "text/html");
  };

  return (
    <div className={cn("flex h-full min-h-0", className)}>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-1 flex items-center justify-between gap-2 border-b border-[var(--color-border)]">
          <span className="text-2xs text-[var(--color-fg-muted)] truncate">{fileName}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView((v) => (v === "docs" ? "panel" : "docs"))}
              className="text-2xs h-auto py-0.5 px-1.5"
              title={view === "docs" ? t("spec.docs.showPanel") : t("spec.docs.showDocs")}
            >
              {view === "docs" ? (
                <PanelRight className="w-3 h-3" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              {view === "docs" ? t("spec.docs.panel") : t("spec.docs.docs")}
            </Button>
            {view === "docs" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportDocs}
                disabled={!parsedDoc}
                className="text-2xs h-auto py-0.5 px-1.5"
                title={t("spec.docs.exportTitle")}
              >
                <Download className="w-3 h-3" />
                {t("spec.docs.export")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onConvert}
              disabled={errorCount > 0}
              className="text-2xs h-auto py-0.5 px-1.5"
              title={errorCount > 0 ? t("spec.convert.blocked") : t("spec.convert.title")}
            >
              <FolderInput className="w-3 h-3" />
              {t("spec.convert")}
            </Button>
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
              className="text-2xs h-auto py-0.5 px-1.5"
              title={t("spec.save.title")}
            >
              <Download className="w-3 h-3" />
              {t("spec.save")}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 p-2">
          <CodeEditor
            value={text}
            onChange={onChange}
            language={lang}
            diagnostics={lintFindings}
            className="h-full"
          />
        </div>
      </div>
      {view === "docs" ? (
        <div className="w-1/2 shrink-0 border-l border-[var(--color-border)] min-h-0">
          {parsedDoc ? (
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-2xs text-[var(--color-fg-muted)]">
                  {t("spec.docs.loading")}
                </div>
              }
            >
              <RedocPane spec={parsedDoc} dark={dark} />
            </Suspense>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState size="compact" title={t("spec.docs.unavailable")} />
            </div>
          )}
        </div>
      ) : (
        <SpecSidePanel
          issues={issues}
          lintFindings={lintFindings}
          outline={outline}
          busy={busy}
          lintBusy={lintBusy}
          hasCustomRuleset={!!ruleset.trim()}
          onEditRuleset={onEditRuleset}
        />
      )}
    </div>
  );
}

// Resolve whether the active theme renders dark, so Redoc's panels
// match API Lab's chrome. `auto` follows the OS preference.
function isDarkTheme(theme: string): boolean {
  if (theme === "dark" || theme === "tokyo-night" || theme === "high-contrast") return true;
  if (theme === "light" || theme === "github-light") return false;
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Container — wires the active spec tab to the presenter. */
export function OpenApiEditorContainer() {
  const activeTabId = useStore((s) => s.activeTabId);
  const spec = useStore((s) => s.tabs.find((tab) => tab.id === s.activeTabId)?.spec);
  const theme = useStore((s) => s.ui.theme);
  const updateSpecText = useStore((s) => s.updateSpecText);
  const updateSpecRuleset = useStore((s) => s.updateSpecRuleset);
  const importItems = useStore((s) => s.importItems);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const [rulesetOpen, setRulesetOpen] = useState(false);
  if (!spec) return null;

  // Convert the current spec text into a sidebar collection via the
  // Slice-1 importer. Same toast feedback as the sidebar Import flow.
  const convert = async () => {
    try {
      const oas = await import("../lib/importers/openapi");
      const r = oas.parseOpenApi(spec.text);
      if (r.items.length === 0) {
        showToast(t("import.empty"), { severity: "warning" });
        return;
      }
      importItems(r.items, r.envVars, r.collectionName);
      showToast(
        t("import.success", {
          name: r.collectionName,
          folders: String(r.folderCount),
          requests: String(r.requestCount),
        }),
        { severity: "success" }
      );
      if (r.warnings.length > 0) {
        showToast(t("import.warnings", { count: String(r.warnings.length) }), {
          severity: "warning",
        });
        // eslint-disable-next-line no-console
        console.warn("OpenAPI convert warnings:", r.warnings);
      }
    } catch (e) {
      showToast(t("import.failed", { error: e instanceof Error ? e.message : String(e) }), {
        severity: "error",
      });
    }
  };

  return (
    <>
      <OpenApiEditor
        text={spec.text}
        fileName={spec.fileName}
        ruleset={spec.ruleset ?? ""}
        dark={isDarkTheme(theme)}
        onChange={(text) => updateSpecText(activeTabId, text)}
        onConvert={() => void convert()}
        onEditRuleset={() => setRulesetOpen(true)}
      />
      <SpecRulesetModal
        open={rulesetOpen}
        onOpenChange={setRulesetOpen}
        ruleset={spec.ruleset ?? ""}
        onSave={(r) => updateSpecRuleset(activeTabId, r)}
      />
    </>
  );
}
