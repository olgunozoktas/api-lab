/** Olgun Özoktaş geliştirdi · API Lab */

// Toast model — a bounded queue of severity-tagged messages. Replaces
// the former single `{ msg, ts }` slot so toasts fired in quick
// succession stack instead of clobbering each other.

export type ToastSeverity = "success" | "error" | "warning" | "info";

// Optional per-toast affordance — e.g. an "Undo" button. `onAction`
// runs on click; the toast then dismisses.
export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastEntry {
  id: string;
  msg: string;
  severity: ToastSeverity;
  action?: ToastAction;
  duration: number; // ms before auto-dismiss
  ts: number;
}

// Caller-facing options for `showToast(msg, opts?)`. All fields
// optional — a bare `showToast(msg)` yields an `info` toast.
export interface ToastOptions {
  severity?: ToastSeverity;
  action?: ToastAction;
  duration?: number;
}

// Max toasts visible at once. A new toast past the cap evicts the
// oldest — bounds the stack so a burst can't avalanche the screen.
export const TOAST_QUEUE_CAP = 4;

// Default visible lifetime. Toasts carrying an `action` get longer so
// the user has time to reach for it.
export const TOAST_DEFAULT_DURATION = 3500;
export const TOAST_ACTION_DURATION = 6000;

// Append `entry`, evicting the oldest if the queue would exceed `cap`.
export function enqueueToast(
  queue: ToastEntry[],
  entry: ToastEntry,
  cap: number = TOAST_QUEUE_CAP
): ToastEntry[] {
  const next = [...queue, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

// Drop the toast with the given id (no-op if absent).
export function removeToast(queue: ToastEntry[], id: string): ToastEntry[] {
  return queue.filter((toast) => toast.id !== id);
}
