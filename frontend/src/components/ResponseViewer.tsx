import { useStore } from "../store";
import { ResponseHead } from "./ResponseHead";
import { ResponseBody } from "./ResponseBody";
import { useT } from "../lib/i18n/useT";
import type { ResponseTab } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ResponseTab; key: TKey }[] = [
  { id: "body",    key: "response.tab.body" },
  { id: "headers", key: "response.tab.headers" },
  { id: "raw",     key: "response.tab.raw" },
];

export function ResponseViewer() {
  const lastResponse = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);
  const setUi = useStore((s) => s.setUi);
  const t = useT();

  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <ResponseHead />
      {lastResponse && (
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 gap-0.5">
          {TABS.map((rt) => {
            const active = tab === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => setUi({ responseTab: rt.id })}
                className={
                  "border-0 bg-transparent px-3.5 py-2 text-xs font-medium border-b-2 -mb-px " +
                  (active
                    ? "text-[var(--color-fg)] border-[var(--color-accent)]"
                    : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)]")
                }
              >
                {t(rt.key)}
              </button>
            );
          })}
        </div>
      )}
      <ResponseBody />
    </section>
  );
}
