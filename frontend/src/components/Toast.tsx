/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { ToastItem } from "./ToastItem";

// Bottom-centre toast stack. Page-level container — reads the bounded
// queue from the store and maps each entry to a presentational
// <ToastItem>. `role="status"` + `aria-live="polite"` announce new
// toasts to assistive tech.
export function Toast() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[1200] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
