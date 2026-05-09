import { useStore } from "../store";
import { UrlBar } from "./UrlBar";
import { KvTable } from "./KvTable";
import { AuthPanel } from "./AuthPanel";
import { BodyPanel } from "./BodyPanel";
import { GraphqlPanel } from "./GraphqlPanel";
import { useT } from "../lib/i18n/useT";
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
  const ui = useStore((s) => s.ui);
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
        <button
          onClick={saveCurrent}
          className="bg-[var(--color-bg-elev-2)] hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-fg)] px-3 py-1 rounded-md text-xs"
        >
          {t("composer.save")}
        </button>
      </div>

      <UrlBar busy={busy} onSend={onSend} />

      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 gap-0.5">
        {TABS.map((tab) => {
          const active = ui.composerTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setUi({ composerTab: tab.id })}
              className={
                "border-0 bg-transparent px-3.5 py-2 text-xs font-medium border-b-2 -mb-px " +
                (active
                  ? "text-[var(--color-fg)] border-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)]")
              }
            >
              {t(tab.key)}
              {tab.id === "params" && pCount > 0 && <Badge n={pCount} />}
              {tab.id === "headers" && hCount > 0 && <Badge n={hCount} />}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-[var(--color-bg)]">
        {ui.composerTab === "params"   && <KvTable rows={params}  onChange={(rows) => setCurrent({ params:  rows })} addLabelKey="kv.addParam" />}
        {ui.composerTab === "headers"  && <KvTable rows={headers} onChange={(rows) => setCurrent({ headers: rows })} addLabelKey="kv.addHeader" />}
        {ui.composerTab === "auth"     && <AuthPanel />}
        {ui.composerTab === "body"     && <BodyPanel />}
        {ui.composerTab === "graphql"  && <GraphqlPanel />}
      </div>
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
