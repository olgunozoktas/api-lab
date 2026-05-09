// Pointer-driven drag handle that sits between two grid columns and
// lets the user resize the column to its left. Pixel-based — pass the
// current column width in `value` and update via `onChange`. Caller
// owns persistence.
//
// Pointer Events cover mouse + touch + pen in one API; setPointerCapture
// keeps drag alive even if the pointer leaves the divider's small
// hit-area mid-drag.

import { useRef, useState } from "react";
import { cn } from "../lib/cn";

// Pure helper exported for unit tests. Clamps `value` into [min, max];
// NaN-safe (returns min so a stray drag math glitch can't wedge the layout).
export function clampDividerValue(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export type ResizableDividerProps = {
  value: number;
  onChange: (next: number) => void;
  onReset?: () => void;
  min: number;
  max: number;
  ariaLabel: string;
  /** "after-left" — value grows when user drags right; the column to the
   *  divider's LEFT is the one being resized. "before-right" — the
   *  column to the divider's RIGHT is the one being resized; value grows
   *  when user drags LEFT. v1 only uses "after-left". */
  direction?: "after-left" | "before-right";
};

export function ResizableDivider({
  value,
  onChange,
  onReset,
  min,
  max,
  ariaLabel,
  direction = "after-left",
}: ResizableDividerProps) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; v: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary button (mouse left / touch / pen tip).
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, v: value };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const sign = direction === "after-left" ? 1 : -1;
    const next = clampDividerValue(startRef.current.v + sign * dx, min, max);
    onChange(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startRef.current = null;
    setDragging(false);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onReset?.()}
      onKeyDown={(e) => {
        // Keyboard accessibility: arrow keys nudge by 16 px, shift = 64.
        const step = e.shiftKey ? 64 : 16;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onChange(clampDividerValue(value - step, min, max));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onChange(clampDividerValue(value + step, min, max));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(min);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
      className={cn(
        "h-full cursor-col-resize select-none transition-colors duration-100",
        // Lives in its own 8px grid column. ::before is the visible 1px
        // line at the center; widens to 2px while hovering / dragging /
        // keyboard-focused so the user can see the seam.
        "relative w-full z-10",
        "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2",
        "before:bg-[var(--color-border)] hover:before:bg-[var(--color-accent)]",
        "before:transition-all before:duration-100",
        dragging && "before:bg-[var(--color-accent)] before:w-0.5",
        "focus-visible:before:bg-[var(--color-accent)] focus-visible:outline-none"
      )}
    />
  );
}
