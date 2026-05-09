// Reusable search input — used by the sidebar Collections + History tabs.
// Extracted from Sidebar.tsx (commit bf59e5e) so both tabs render the
// exact same UX: leading magnifier glyph, trailing X clear button when
// non-empty, accent-color focus ring.

import { Search, X } from "lucide-react";
import { useT } from "../../lib/i18n/useT";

export type SearchInputProps = {
  query: string;
  onChange: (s: string) => void;
  placeholderKey?: Parameters<ReturnType<typeof useT>>[0];
  clearLabelKey?: Parameters<ReturnType<typeof useT>>[0];
};

export function SearchInput({
  query,
  onChange,
  placeholderKey = "collections.search.placeholder",
  clearLabelKey = "collections.search.clear",
}: SearchInputProps) {
  const t = useT();
  return (
    <div className="px-2 pb-2 shrink-0 relative">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-fg-muted)] pointer-events-none"
        aria-hidden
      />
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholderKey)}
        aria-label={t(placeholderKey)}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md pl-7 pr-7 py-1 text-xs outline-none focus:border-[var(--color-accent)] transition-colors"
      />
      {query.length > 0 && (
        <button
          type="button"
          aria-label={t(clearLabelKey)}
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
