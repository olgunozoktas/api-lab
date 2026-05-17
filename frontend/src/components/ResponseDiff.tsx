/** Olgun Özoktaş geliştirdi · API Lab */
import { cn } from "../lib/cn";
import type { DiffPair, DiffResult } from "../lib/responseDiff";

// Pure presenter — renders an aligned, side-by-side line diff. All data
// arrives as props (the DiffResult is computed by the container), so
// this component is store-agnostic and reusable anywhere.
export type ResponseDiffProps = {
  leftLabel: string;
  rightLabel: string;
  result: DiffResult;
  className?: string;
};

// Per-side cell background by row kind. `equal` stays neutral; the
// changed side is tinted, the empty side gets a faint gutter fill so
// the eye reads the gap as "nothing here".
function leftCellClass(kind: DiffPair["kind"]): string {
  if (kind === "remove") return "bg-[var(--color-danger)]/12";
  if (kind === "add") return "bg-[var(--color-bg-elev-2)]/40";
  return "";
}

function rightCellClass(kind: DiffPair["kind"]): string {
  if (kind === "add") return "bg-[var(--color-success)]/12";
  if (kind === "remove") return "bg-[var(--color-bg-elev-2)]/40";
  return "";
}

function Cell({ cell, bg, sign }: { cell: DiffPair["left"]; bg: string; sign: "" | "+" | "-" }) {
  return (
    <>
      <div
        className={cn(
          "px-2 py-0.5 text-right text-[var(--color-fg-muted)] select-none tabular-nums",
          bg
        )}
      >
        {cell ? cell.num : ""}
      </div>
      <div className={cn("px-2 py-0.5 whitespace-pre-wrap break-all select-text", bg)}>
        {cell ? (
          <>
            <span className="select-none text-[var(--color-fg-muted)] mr-1">{sign || " "}</span>
            {cell.text}
          </>
        ) : null}
      </div>
    </>
  );
}

export function ResponseDiff({ leftLabel, rightLabel, result, className }: ResponseDiffProps) {
  return (
    <div className={cn("flex flex-col min-h-0 font-mono text-[11px] leading-5", className)}>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] font-semibold">
        <div className="col-span-2 px-2 py-1.5 truncate border-r border-[var(--color-border)]">
          {leftLabel}
        </div>
        <div className="col-span-2 px-2 py-1.5 truncate">{rightLabel}</div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-[auto_1fr_auto_1fr]">
          {result.rows.map((row, i) => (
            <div key={i} className="contents">
              <Cell
                cell={row.left}
                bg={cn(leftCellClass(row.kind), "border-r border-[var(--color-border)]")}
                sign={row.kind === "remove" ? "-" : ""}
              />
              <Cell
                cell={row.right}
                bg={rightCellClass(row.kind)}
                sign={row.kind === "add" ? "+" : ""}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
