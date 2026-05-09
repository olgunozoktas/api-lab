import { useStore } from "../store";
import { ResponseHeadContainer } from "./ResponseHead";
import { ResponseBodyContainer } from "./ResponseBody";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import type { ResponseTab } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ResponseTab; key: TKey }[] = [
  { id: "body",    key: "response.tab.body" },
  { id: "headers", key: "response.tab.headers" },
  { id: "raw",     key: "response.tab.raw" },
];

// Presenter — minimal: just lays out the head + body containers and the tab strip.
export type ResponseViewerProps = {
  hasResponse: boolean;
  tab: ResponseTab;
  onTabChange: (t: ResponseTab) => void;
};

export function ResponseViewer({ hasResponse, tab, onTabChange }: ResponseViewerProps) {
  const t = useT();
  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <ResponseHeadContainer />
      {hasResponse && (
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as ResponseTab)}>
          <TabsList>
            {TABS.map((rt) => <TabsTrigger key={rt.id} value={rt.id}>{t(rt.key)}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}
      <ResponseBodyContainer />
    </section>
  );
}

// Container — wires the store.
export function ResponseViewerContainer() {
  const lastResponse = useStore((s) => s.lastResponse);
  const tab = useStore((s) => s.ui.responseTab);
  const setUi = useStore((s) => s.setUi);
  return (
    <ResponseViewer
      hasResponse={lastResponse !== null}
      tab={tab}
      onTabChange={(responseTab) => setUi({ responseTab })}
    />
  );
}
