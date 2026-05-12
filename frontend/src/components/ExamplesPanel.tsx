/** Olgun Özoktaş geliştirdi · API Lab */
import { useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { useConfirm } from "../lib/dialogs";
import { Button } from "./ui/button";
import { Trash2, Eye, Pencil } from "lucide-react";
import { exampleToResponse } from "../lib/examples";
import { humanSize, sizeClass, statusPillClass, statusText, timeAgo } from "../lib/utils";
import type { Example } from "../lib/types";

// Presenter — pure props in / actions in.
export type ExamplesPanelProps = {
  examples: Example[];
  onView: (example: Example) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

export function ExamplesPanel({ examples, onView, onDelete, onRename }: ExamplesPanelProps) {
  const t = useT();

  if (examples.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">{t("examples.empty.title")}</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-2">{t("examples.empty.hint")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {examples.map((ex) => (
        <ExampleRow
          key={ex.id}
          example={ex}
          onView={onView}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

function ExampleRow({
  example: ex,
  onView,
  onDelete,
  onRename,
}: {
  example: Example;
  onView: (e: Example) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const t = useT();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ex.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== ex.name) onRename(ex.id, draft.trim());
    else setDraft(ex.name);
  };

  return (
    <div className="px-3 py-2 flex items-center gap-2 hover:bg-[var(--color-bg-elev)]">
      <span
        className={
          "font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-full " + statusPillClass(ex.status)
        }
        title={ex.status > 0 ? `${ex.status} ${statusText(ex.status)}`.trim() : undefined}
      >
        {ex.status}
      </span>
      <span className="font-mono text-[10px] text-[var(--color-fg-muted)] uppercase w-12">
        {ex.method}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(ex.name);
              setEditing(false);
            }
          }}
          className="flex-1 bg-[var(--color-bg-elev-2)] border border-[var(--color-accent)] rounded px-1 text-xs outline-none"
          aria-label={t("examples.rename")}
        />
      ) : (
        <button
          onClick={() => onView(ex)}
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-left text-xs truncate text-[var(--color-fg)] hover:underline"
          title={ex.path}
        >
          {ex.name}
        </button>
      )}
      {ex.savedAt > 0 && (
        <span
          className="font-mono text-[10px] text-[var(--color-fg-muted)] cursor-help"
          title={new Date(ex.savedAt).toLocaleString()}
        >
          {timeAgo(ex.savedAt)}
        </span>
      )}
      <span className={"font-mono text-[10px] " + sizeClass(ex.body.length)}>
        {humanSize(ex.body.length)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
        title={t("examples.rename")}
        className="h-6 w-6 p-0"
      >
        <Pencil className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(ex)}
        title={t("examples.view")}
        className="h-6 w-6 p-0"
      >
        <Eye className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          const ok = await confirm({
            title: t("examples.confirmDelete", { name: ex.name }),
            confirmLabel: t("kv.delete"),
            cancelLabel: t("dialog.cancel"),
            danger: true,
          });
          if (ok) onDelete(ex.id);
        }}
        title={t("kv.delete")}
        className="h-6 w-6 p-0 text-[var(--color-danger)]"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// Stable empty array used as the `?? fallback` AFTER the selector
// returns. Selector itself returns the real reference (or undefined);
// we coalesce outside so the selector output stays stable across
// renders. Without this, `(s) => s.current.examples ?? []` returned a
// fresh [] every render → Zustand's Object.is comparison saw it as a
// new value → infinite render loop (React #185). See handoff §5
// gotcha #1 — same Zustand selector instability bug class as the
// QuickSwitcher fix from 2026-05-09 commit `c23ade6`.
const EMPTY_EXAMPLES: Example[] = [];

// Container — wires the store.
export function ExamplesPanelContainer() {
  const examples = useStore((s) => s.current.examples) ?? EMPTY_EXAMPLES;
  const url = useStore((s) => s.current.url);
  const renameExample = useStore((s) => s.renameExample);
  const deleteExample = useStore((s) => s.deleteExample);
  const setLastResponse = useStore((s) => s.setLastResponse);
  return (
    <ExamplesPanel
      examples={examples}
      onView={(ex) => setLastResponse(exampleToResponse(ex, url || "mock://example"))}
      onDelete={deleteExample}
      onRename={renameExample}
    />
  );
}
