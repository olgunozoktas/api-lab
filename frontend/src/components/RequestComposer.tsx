import { useStore } from "../store";
import { UrlBar } from "./UrlBar";
import { KvTable } from "./KvTable";
import { AuthPanel } from "./AuthPanel";
import { BodyPanel } from "./BodyPanel";
import { GraphqlPanel } from "./GraphqlPanel";
import { useT } from "../lib/i18n/useT";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import type { ComposerTab } from "../lib/types";
import type { TKey } from "../lib/i18n";

const TABS: { id: ComposerTab; key: TKey }[] = [
  { id: "params",  key: "composer.tab.params" },
  { id: "headers", key: "composer.tab.headers" },
  { id: "auth",    key: "composer.tab.auth" },
  { id: "body",    key: "composer.tab.body" },
  { id: "graphql", key: "composer.tab.graphql" },
];

type Props = { busy: boolean; onSend: () => void };

export function RequestComposer({ busy, onSend }: Props) {
  const name = useStore((s) => s.current.name);
  const params = useStore((s) => s.current.params);
  const headers = useStore((s) => s.current.headers);
  const setCurrent = useStore((s) => s.setCurrent);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const composerTab = useStore((s) => s.ui.composerTab);
  const setUi = useStore((s) => s.setUi);
  const t = useT();

  const pCount = params.filter((r) => r.enabled && r.k).length;
  const hCount = headers.filter((r) => r.enabled && r.k).length;

  return (
    <section className="bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <input
          value={name}
          onChange={(e) => setCurrent({ name: e.target.value })}
          placeholder={t("composer.requestName")}
          className="flex-1 bg-transparent border-0 outline-none text-sm font-medium"
        />
        <Button variant="secondary" size="sm" onClick={saveCurrent}>{t("composer.save")}</Button>
      </div>

      <UrlBar busy={busy} onSend={onSend} />

      <Tabs
        value={composerTab}
        onValueChange={(v) => setUi({ composerTab: v as ComposerTab })}
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
        <TabsContent value="params"  className="p-3 bg-[var(--color-bg)]">
          <KvTable rows={params}  onChange={(rows) => setCurrent({ params:  rows })} addLabelKey="kv.addParam" />
        </TabsContent>
        <TabsContent value="headers" className="p-3 bg-[var(--color-bg)]">
          <KvTable rows={headers} onChange={(rows) => setCurrent({ headers: rows })} addLabelKey="kv.addHeader" />
        </TabsContent>
        <TabsContent value="auth"    className="p-3 bg-[var(--color-bg)]"><AuthPanel /></TabsContent>
        <TabsContent value="body"    className="p-3 bg-[var(--color-bg)]"><BodyPanel /></TabsContent>
        <TabsContent value="graphql" className="p-3 bg-[var(--color-bg)]"><GraphqlPanel /></TabsContent>
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
