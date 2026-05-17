/** Olgun Özoktaş geliştirdi · API Lab */
// Right-hand panel of the OpenAPI editor — structural validation
// issues, Spectral lint findings, and the operations outline. Pure
// presenter: every datum + the edit-ruleset callback arrive as props.
import { useT } from "../lib/i18n/useT";
import { cn } from "../lib/cn";
import { methodClass } from "../lib/utils";
import { Button } from "./ui/button";
import { SlidersHorizontal } from "lucide-react";
import type { SpecIssue } from "../lib/specValidate";
import type { LintFinding } from "../lib/spectralLint";
import type { CollectionItem } from "../lib/types";

export type Outline = {
  items: CollectionItem[];
  requestCount: number;
  folderCount: number;
};

export type SpecSidePanelProps = {
  issues: SpecIssue[];
  lintFindings: LintFinding[];
  outline: Outline | null;
  busy: boolean;
  lintBusy: boolean;
  hasCustomRuleset: boolean;
  onEditRuleset: () => void;
};

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
  tag,
  danger,
  message,
  detail,
}: {
  tag: string;
  danger: boolean;
  message: string;
  detail?: string;
}) {
  return (
    <div className="px-3 py-1 text-[11px] flex gap-1.5">
      <span
        className={cn(
          "font-mono font-semibold shrink-0 uppercase text-[9px] pt-0.5",
          danger ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]"
        )}
      >
        {tag}
      </span>
      <span className="min-w-0">
        <span className="text-[var(--color-fg)]">{message}</span>
        {detail ? (
          <span className="ml-1 font-mono text-[10px] text-[var(--color-fg-muted)]">{detail}</span>
        ) : null}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  danger,
}: {
  title: string;
  count?: number;
  danger?: boolean;
}) {
  return (
    <div className="px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
      <span>{title}</span>
      {count !== undefined && count > 0 ? (
        <span
          className={cn(
            "font-mono normal-case tracking-normal tabular-nums text-[10px] px-1 rounded",
            danger ? "bg-[var(--color-danger)] text-white" : "bg-[var(--color-bg-elev-2)]"
          )}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function SpecSidePanel({
  issues,
  lintFindings,
  outline,
  busy,
  lintBusy,
  hasCustomRuleset,
  onEditRuleset,
}: SpecSidePanelProps) {
  const t = useT();
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const lintErrors = lintFindings.filter((f) => f.severity === "error").length;

  return (
    <div className="w-[300px] shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      {/* Structural validation */}
      <div className="shrink-0 max-h-[28%] flex flex-col border-b border-[var(--color-border)]">
        <SectionHeader
          title={t("spec.validation.title")}
          count={issues.length}
          danger={errorCount > 0}
        />
        <div className="flex-1 min-h-0 overflow-y-auto pb-1">
          {issues.length === 0 ? (
            <div className="px-3 py-1 text-[11px] text-[var(--color-fg-muted)]">
              {busy ? t("spec.parsing") : t("spec.validation.ok")}
            </div>
          ) : (
            issues.map((issue, i) => (
              <IssueRow
                key={`${issue.path}-${i}`}
                tag={
                  issue.severity === "error"
                    ? t("spec.validation.errorTag")
                    : t("spec.validation.warningTag")
                }
                danger={issue.severity === "error"}
                message={issue.message}
                detail={issue.path || undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Spectral lint */}
      <div className="shrink-0 max-h-[38%] flex flex-col border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between pr-2">
          <SectionHeader
            title={t("spec.lint.title")}
            count={lintFindings.length}
            danger={lintErrors > 0}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditRuleset}
            className="text-[10px] h-auto py-0.5 px-1.5 shrink-0"
            title={t("spec.lint.ruleset.edit")}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {hasCustomRuleset ? t("spec.lint.ruleset.custom") : t("spec.lint.ruleset.default")}
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-1">
          {lintFindings.length === 0 ? (
            <div className="px-3 py-1 text-[11px] text-[var(--color-fg-muted)]">
              {lintBusy ? t("spec.lint.running") : t("spec.lint.ok")}
            </div>
          ) : (
            lintFindings.map((f, i) => (
              <IssueRow
                key={`${f.code}-${i}`}
                tag={f.code || f.severity}
                danger={f.severity === "error"}
                message={f.message}
                detail={f.path || undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Operations outline */}
      <div className="flex-1 min-h-0 flex flex-col">
        <SectionHeader title={t("spec.outline.title")} count={outline?.requestCount} />
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
  );
}
