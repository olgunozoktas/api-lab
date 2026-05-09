import { useStore } from "../store";
import { ResponseHead } from "./ResponseHead";
import { ResponseBody } from "./ResponseBody";
import type { ResponseTab } from "../lib/types";

const TABS: { id: ResponseTab; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "headers", label: "Headers" },
  { id: "raw", label: "Raw" },
];

export function ResponseViewer() {
  const lastResponse = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);
  const setUi = useStore((s) => s.setUi);

  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <ResponseHead />
      {lastResponse && (
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 gap-0.5">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setUi({ responseTab: t.id })}
                className={
                  "border-0 bg-transparent px-3.5 py-2 text-xs font-medium border-b-2 -mb-px " +
                  (active
                    ? "text-[var(--color-fg)] border-[var(--color-accent)]"
                    : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)]")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
      <ResponseBody />
    </section>
  );
}
