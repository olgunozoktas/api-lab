import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { CodeEditor } from "./ui/code-editor";
import type { Gql } from "../lib/types";

// Presenter — pure props in / events out.
export type GraphqlPanelProps = {
  value: Gql;
  onChange: (gql: Gql) => void;
};

export function GraphqlPanel({ value, onChange }: GraphqlPanelProps) {
  const t = useT();
  return (
    <div>
      <div className="mb-2 text-[11px] text-[var(--color-fg-muted)]">{t("graphql.note")}</div>
      <label className="text-[11px] text-[var(--color-fg-muted)]">{t("graphql.query")}</label>
      <CodeEditor
        value={value.query}
        onChange={(query) => onChange({ ...value, query })}
        language="graphql"
        placeholder="query { users { id name } }"
        minHeight={120}
        className="mb-2"
      />
      <label className="text-[11px] text-[var(--color-fg-muted)] block mt-1">
        {t("graphql.vars")}
      </label>
      <CodeEditor
        value={value.vars}
        onChange={(vars) => onChange({ ...value, vars })}
        language="json"
        placeholder='{ "id": 1 }'
        minHeight={72}
      />
    </div>
  );
}

// Container — wires the store.
export function GraphqlPanelContainer() {
  const value = useStore((s) => s.current.gql);
  const setCurrent = useStore((s) => s.setCurrent);
  return <GraphqlPanel value={value} onChange={(gql) => setCurrent({ gql })} />;
}
