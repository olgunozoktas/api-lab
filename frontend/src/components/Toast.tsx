import { useEffect, useState } from "react";
import { useStore } from "../store";

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs " +
        "bg-[var(--color-fg)] text-[var(--color-bg)] pointer-events-none transition-opacity " +
        (visible ? "opacity-100" : "opacity-0")
      }
    >
      {toast.msg}
    </div>
  );
}
