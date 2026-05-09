import { useStore } from "../store";
import { UrlBar } from "./UrlBar";
import { KvTable } from "./KvTable";
import { AuthPanel } from "./AuthPanel";
import { BodyPanel } from "./BodyPanel";
import { GraphqlPanel } from "./GraphqlPanel";
import type { ComposerTab } from "../lib/types";

const TABS: { id: ComposerTab; label: string }[] = [
  { id: "params",  label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "auth",    label: "Auth" },
  { id: "body",    label: "Body" },
  { id: "graphql", label: "GraphQL" },
];

type Props = {
  busy: boolean;
  onSend: () => void;
};

export function RequestComposer({ busy, onSend }: Props) {
  const name = useStore((s) => s.current.name);
  const params = useStore((s) => s.current.params);
  const headers = useStore((s) => s.current.headers);
  const setCurrent = useStore((s) => s.setCurrent);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);

  const pCount = params.filter((r) => r.enabled && r.k).length;
  const hCount = headers.filter((r) => r.enabled && r.k).length;

  return (
    <section className="bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <input
          value={name}
          onChange={(e) => setCurrent({ name: e.target.value })}
          placeholder="İstek adı"
          className="flex-1 bg-transparent border-0 outline-none text-sm font-medium"
        />
        <button
          onClick={saveCurrent}
          className="bg-[var(--color-bg-elev-2)] hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-fg)] px-3 py-1 rounded-md text-xs"
        >
          Kaydet
        </button>
      </div>

      <UrlBar busy={busy} onSend={onSend} />

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 gap-0.5">
        {TABS.map((t) => {
          const active = ui.composerTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setUi({ composerTab: t.id })}
              className={
                "border-0 bg-transparent px-3.5 py-2 text-xs font-medium border-b-2 -mb-px " +
                (active
                  ? "text-[var(--color-fg)] border-[var(--color-accent)]"
                  : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)]")
              }
            >
              {t.label}
              {t.id === "params" && pCount > 0 && (
                <span className="bg-[var(--color-accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                  {pCount}
                </span>
              )}
              {t.id === "headers" && hCount > 0 && (
                <span className="bg-[var(--color-accent)] text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                  {hCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-y-auto p-3 bg-[var(--color-bg)]">
        {ui.composerTab === "params"   && <KvTable rows={params}  onChange={(rows) => setCurrent({ params:  rows })} addLabel="+ Param ekle" />}
        {ui.composerTab === "headers"  && <KvTable rows={headers} onChange={(rows) => setCurrent({ headers: rows })} addLabel="+ Header ekle" />}
        {ui.composerTab === "auth"     && <AuthPanel />}
        {ui.composerTab === "body"     && <BodyPanel />}
        {ui.composerTab === "graphql"  && <GraphqlPanel />}
      </div>
    </section>
  );
}
