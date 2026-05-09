import { useStore } from "../store";
import { UrlBarContainer } from "./UrlBar";
import { KvTable } from "./KvTable";
import { AuthPanelContainer } from "./AuthPanel";
import { BodyPanelContainer } from "./BodyPanel";
import { GraphqlPanelContainer } from "./GraphqlPanel";
import { ScriptsPanelContainer } from "./ScriptsPanel";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import type { ComposerTab, KvRow } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ComposerTab; key: TKey }[] = [
  { id: "params", key: "composer.tab.params" },
  { id: "headers", key: "composer.tab.headers" },
  { id: "auth", key: "composer.tab.auth" },
  { id: "body", key: "composer.tab.body" },
  { id: "graphql", key: "composer.tab.graphql" },
  { id: "scripts", key: "composer.tab.scripts" },
];

// Presenter — most state via internal containers since there are many panels;
// the few top-level fields stay on the props surface for testability.
export type RequestComposerProps = {
  busy: boolean;
  onSend: () => void;
  onCancel?: () => void;
  name: string;
  params: KvRow[];
  headers: KvRow[];
  composerTab: ComposerTab;
  onNameChange: (n: string) => void;
  onParamsChange: (rows: KvRow[]) => void;
  onHeadersChange: (rows: KvRow[]) => void;
  onTabChange: (t: ComposerTab) => void;
  onSave: () => void;
};

export function RequestComposer({
  busy,
  onSend,
  onCancel,
  name,
  params,
  headers,
  composerTab,
  onNameChange,
  onParamsChange,
  onHeadersChange,
  onTabChange,
  onSave,
}: RequestComposerProps) {
  const t = useT();
  const pCount = params.filter((r) => r.enabled && r.k).length;
  const hCount = headers.filter((r) => r.enabled && r.k).length;

  return (
    <section className="bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("composer.requestName")}
          className="flex-1 bg-transparent border-0 outline-none text-sm font-medium"
        />
        <Button variant="secondary" size="sm" onClick={onSave}>
          {t("composer.save")}
        </Button>
      </div>

      <UrlBarContainer busy={busy} onSend={onSend} onCancel={onCancel} />

      <Tabs
        value={composerTab}
        onValueChange={(v) => onTabChange(v as ComposerTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {t(tab.key)}
              {tab.id === "params" && pCount > 0 && <Badge n={pCount} />}
              {tab.id === "headers" && hCount > 0 && <Badge n={hCount} />}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="params" className="p-3 bg-[var(--color-bg)]">
          <KvTable rows={params} onChange={onParamsChange} addLabelKey="kv.addParam" />
        </TabsContent>
        <TabsContent value="headers" className="p-3 bg-[var(--color-bg)]">
          <KvTable rows={headers} onChange={onHeadersChange} addLabelKey="kv.addHeader" />
        </TabsContent>
        <TabsContent value="auth" className="p-3 bg-[var(--color-bg)]">
          <AuthPanelContainer />
        </TabsContent>
        <TabsContent value="body" className="p-3 bg-[var(--color-bg)]">
          <BodyPanelContainer />
        </TabsContent>
        <TabsContent value="graphql" className="p-3 bg-[var(--color-bg)]">
          <GraphqlPanelContainer />
        </TabsContent>
        <TabsContent value="scripts" className="p-3 bg-[var(--color-bg)]">
          <ScriptsPanelContainer />
        </TabsContent>
      </Tabs>
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

// Container — wires the store. App-level concerns (busy, onSend) are passed in.
export type RequestComposerContainerProps = {
  busy: boolean;
  onSend: () => void;
  onCancel?: () => void;
};

export function RequestComposerContainer({
  busy,
  onSend,
  onCancel,
}: RequestComposerContainerProps) {
  const name = useStore((s) => s.current.name);
  const params = useStore((s) => s.current.params);
  const headers = useStore((s) => s.current.headers);
  const composerTab = useStore((s) => s.ui.composerTab);
  const setCurrent = useStore((s) => s.setCurrent);
  const setUi = useStore((s) => s.setUi);
  const saveCurrent = useStore((s) => s.saveCurrent);

  return (
    <RequestComposer
      busy={busy}
      onSend={onSend}
      onCancel={onCancel}
      name={name}
      params={params}
      headers={headers}
      composerTab={composerTab}
      onNameChange={(name) => setCurrent({ name })}
      onParamsChange={(params) => setCurrent({ params })}
      onHeadersChange={(headers) => setCurrent({ headers })}
      onTabChange={(composerTab) => setUi({ composerTab })}
      onSave={saveCurrent}
    />
  );
}
