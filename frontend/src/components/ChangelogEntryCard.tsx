/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo } from "react";
import type { ChangelogEntry } from "../lib/changelog";
import { renderMarkdown } from "../lib/markdown";
import { cn } from "../lib/cn";

export type ChangelogEntryCardProps = {
  entry: ChangelogEntry;
  // Localized strings — passed in so the leaf stays i18n-agnostic.
  unreleasedLabel: string;
  className?: string;
};

// Pure presenter — no store reads, no side effects. Renders one
// changelog entry as a card with a status pill, title, date, and
// markdown body.
export function ChangelogEntryCard({ entry, unreleasedLabel, className }: ChangelogEntryCardProps) {
  const html = useMemo(() => renderMarkdown(entry.body), [entry.body]);
  const dateLabel = entry.date || "";

  return (
    <article
      className={cn(
        "border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-elev)] px-5 py-4",
        className
      )}
      aria-labelledby={`changelog-${entry.sourcePath}-title`}
    >
      <header className="flex items-baseline gap-2 flex-wrap mb-2">
        {entry.status === "unreleased" ? (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
            {unreleasedLabel}
          </span>
        ) : entry.version ? (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-fg-muted)] border border-[var(--color-border)]">
            {entry.version}
          </span>
        ) : null}
        <h3
          id={`changelog-${entry.sourcePath}-title`}
          className="text-base font-semibold flex-1 min-w-0"
        >
          {entry.title}
        </h3>
        {dateLabel ? (
          <time className="text-xs text-[var(--color-fg-muted)] font-mono">{dateLabel}</time>
        ) : null}
      </header>
      <div
        className="changelog-prose text-sm leading-relaxed text-[var(--color-fg)] [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_code]:font-mono [&_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[var(--color-bg)] [&_pre]:my-3 [&_pre]:p-3 [&_pre]:rounded [&_pre]:bg-[var(--color-bg)] [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-[var(--color-accent)] [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_hr]:my-3 [&_hr]:border-t [&_hr]:border-[var(--color-border)] [&_table]:my-3 [&_table]:w-full [&_table]:text-xs [&_table]:border [&_table]:border-[var(--color-border)] [&_table]:rounded [&_table]:border-collapse [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-[var(--color-bg)] [&_th]:border-b [&_th]:border-[var(--color-border)] [&_td]:px-3 [&_td]:py-1.5 [&_td]:border-b [&_td]:border-[var(--color-border)] [&_td]:align-top [&_tr:last-child_td]:border-b-0"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
