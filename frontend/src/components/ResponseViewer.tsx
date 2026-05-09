import { useStore } from "../store";
import { ResponseHead } from "./ResponseHead";
import { ResponseBody } from "./ResponseBody";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
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
        <Tabs value={tab} onValueChange={(v) => setUi({ responseTab: v as ResponseTab })}>
          <TabsList>
            {TABS.map((rt) => <TabsTrigger key={rt.id} value={rt.id}>{t(rt.key)}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}
      <ResponseBody />
    </section>
  );
}
