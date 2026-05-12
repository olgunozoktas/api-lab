/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { ResponseHeadContainer } from "./ResponseHead";
import { ResponseBodyContainer } from "./ResponseBody";
import { ExamplesPanelContainer } from "./ExamplesPanel";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import type { ResponseTab } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ResponseTab; key: TKey }[] = [
  { id: "body", key: "response.tab.body" },
  { id: "headers", key: "response.tab.headers" },
  { id: "raw", key: "response.tab.raw" },
  { id: "examples", key: "response.tab.examples" },
];

// Presenter — minimal: just lays out the head + body containers and the tab strip.
export type ResponseViewerProps = {
  hasResponse: boolean;
  tab: ResponseTab;
  examplesCount: number;
  headersCount: number;
  onTabChange: (t: ResponseTab) => void;
};

export function ResponseViewer({
  hasResponse,
  tab,
  examplesCount,
  headersCount,
  onTabChange,
}: ResponseViewerProps) {
  const t = useT();
  // Show the tab strip whenever there's a response OR there are saved
  // examples — the Examples tab needs to be reachable even before the
  // user has run a fresh request in this session.
  const showStrip = hasResponse || examplesCount > 0;
  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <ResponseHeadContainer />
      {showStrip && (
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as ResponseTab)}>
          <TabsList>
            {TABS.map((rt) => (
              <TabsTrigger key={rt.id} value={rt.id}>
                {t(rt.key)}
                {rt.id === "examples" && examplesCount > 0 && <Badge n={examplesCount} />}
                {rt.id === "headers" && headersCount > 0 && <Badge n={headersCount} />}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {tab === "examples" ? <ExamplesPanelContainer /> : <ResponseBodyContainer />}
    </section>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="bg-[var(--color-accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
      {n}
    </span>
  );
}

// Container — wires the store.
export function ResponseViewerContainer() {
  const lastResponse = useStore((s) => s.lastResponse);
  const examplesCount = useStore((s) => s.current.examples?.length ?? 0);
  const headersCount = useStore((s) => s.lastResponse?.headers.length ?? 0);
  const tab = useStore((s) => s.ui.responseTab);
  const setUi = useStore((s) => s.setUi);
  return (
    <ResponseViewer
      hasResponse={lastResponse !== null}
      tab={tab}
      examplesCount={examplesCount}
      headersCount={headersCount}
      onTabChange={(responseTab) => setUi({ responseTab })}
    />
  );
}
