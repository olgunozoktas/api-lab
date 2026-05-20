/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ResponseDiff } from "./ResponseDiff";
import { EmptyState } from "./ui/empty-state";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { diffLines, diffStats, prepareDiffBody, MAX_DIFF_LINES } from "../lib/responseDiff";
import { timeAgo } from "../lib/utils";

export type ResponseDiffModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional pre-seeded source ids — set by the "Compare with…" /
  // "Compare response with…" context-menu entries so the modal
  // opens with one side already filled. Either side accepts a tab
  // ("tab:<id>") or history ("hist:<id>") form. The selection
  // resets to the seed every time `open` flips true; if the
  // referenced source no longer exists (a closed tab, a trimmed
  // history entry), the fallback (`sources[0]`) kicks in below.
  initialLeftId?: string | null;
  initialRightId?: string | null;
};

// A response that can be fed into the diff — sourced from an open tab
// or a history entry. Only text bodies are offered; binary responses
// and history entries whose body wasn't retained never become sources.
type DiffSource = {
  id: string;
  label: string;
  body: string;
  contentType: string;
};

const shortUrl = (url: string): string => url.replace(/^https?:\/\//, "").slice(0, 40) || "—";

// Container — collects diffable sources from the store, owns the
// left/right selection, computes the diff, and hosts the presenter.
export function ResponseDiffModal({
  open,
  onOpenChange,
  initialLeftId = null,
  initialRightId = null,
}: ResponseDiffModalProps) {
  const t = useT();
  const tabs = useStore((s) => s.tabs);
  const history = useStore((s) => s.history);

  const sources = useMemo<DiffSource[]>(() => {
    const out: DiffSource[] = [];
    // Open tabs with a non-binary response.
    for (const tab of tabs) {
      const r = tab.lastResponse;
      if (!r || r.bodyBase64 || r.bodyTooLarge) continue;
      out.push({
        id: `tab:${tab.id}`,
        label: `[${t("diff.source.tab")}] ${tab.name} · ${r.status || "—"}`,
        body: r.body,
        contentType: r.contentType,
      });
    }
    // History entries whose response body was retained (see lib/historyBody.ts).
    for (const h of history) {
      if (h.response.body === undefined) continue;
      out.push({
        id: `hist:${h.id}`,
        label: `[${t("diff.source.history")}] ${h.request.method} ${shortUrl(
          h.request.url
        )} · ${h.response.status} · ${timeAgo(h.ts)}`,
        body: h.response.body,
        contentType: h.response.contentType ?? "",
      });
    }
    return out;
  }, [tabs, history, t]);

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  // Reset selection to the seeds every time the modal opens. The
  // modal stays mounted in the React tree (only DialogContent flips
  // with `open`), so without this effect the seeds from a "Compare
  // with…" context menu would be ignored on the second open. Pass
  // both seeds as null to fall back to the default sources[0] /
  // sources[1] picks — preserving the original TopBar-button flow.
  useEffect(() => {
    if (!open) return;
    setLeftId(initialLeftId);
    setRightId(initialRightId);
  }, [open, initialLeftId, initialRightId]);

  // Resolve the effective selection — fall back to the first two
  // sources when nothing is picked yet or a prior pick has vanished.
  const leftSrc = sources.find((s) => s.id === leftId) ?? sources[0] ?? null;
  const rightSrc = sources.find((s) => s.id === rightId) ?? sources[1] ?? sources[0] ?? null;

  const diff = useMemo(() => {
    if (!leftSrc || !rightSrc) return null;
    return diffLines(
      prepareDiffBody(leftSrc.body, leftSrc.contentType),
      prepareDiffBody(rightSrc.body, rightSrc.contentType)
    );
  }, [leftSrc, rightSrc]);

  const stats = diff ? diffStats(diff) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[94vw] h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base flex items-center gap-3">
            {t("diff.title")}
            {stats && !stats.identical && (
              <span className="text-xs font-normal font-mono text-[var(--color-fg-muted)]">
                {t("diff.summary", {
                  added: String(stats.added),
                  removed: String(stats.removed),
                })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {sources.length < 2 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title={t("diff.empty.title")} description={t("diff.empty.body")} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-2 gap-3 px-5 py-3 shrink-0 border-b border-[var(--color-border)]">
              <SourcePicker
                label={t("diff.left")}
                value={leftSrc?.id ?? ""}
                sources={sources}
                onChange={setLeftId}
              />
              <SourcePicker
                label={t("diff.right")}
                value={rightSrc?.id ?? ""}
                sources={sources}
                onChange={setRightId}
              />
            </div>

            {diff?.truncated && (
              <p className="px-5 py-1.5 shrink-0 text-2xs text-[var(--color-warning)] bg-[var(--color-warning)]/10">
                {t("diff.truncated", { n: String(MAX_DIFF_LINES) })}
              </p>
            )}
            {stats?.identical && (
              <p className="px-5 py-1.5 shrink-0 text-2xs text-[var(--color-fg-muted)]">
                {t("diff.identical")}
              </p>
            )}

            {diff && leftSrc && rightSrc && (
              <ResponseDiff
                leftLabel={leftSrc.label}
                rightLabel={rightSrc.label}
                result={diff}
                className="flex-1 min-h-0"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// One labelled source dropdown. Leaf — all data + the change callback
// arrive as props.
function SourcePicker({
  label,
  value,
  sources,
  onChange,
}: {
  label: string;
  value: string;
  sources: DiffSource[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-medium text-[var(--color-fg-muted)]">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sources.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
