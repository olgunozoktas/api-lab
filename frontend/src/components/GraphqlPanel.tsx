import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";

const taCls =
  "w-full resize-y bg-[var(--color-bg-elev)] border border-[var(--color-border)] " +
  "rounded-md p-2.5 font-mono text-xs leading-6 outline-none " +
  "focus:border-[var(--color-accent)] text-[var(--color-fg)]";

export function GraphqlPanel() {
  const gql = useStore((s) => s.current.gql);
  const setCurrent = useStore((s) => s.setCurrent);
  const t = useT();

  return (
    <div>
      <div className="mb-2 text-[11px] text-[var(--color-fg-muted)]">
        {t("graphql.note")}
      </div>
      <label className="text-[11px] text-[var(--color-fg-muted)]">{t("graphql.query")}</label>
      <textarea
        value={gql.query}
        onChange={(e) => setCurrent({ gql: { ...gql, query: e.target.value } })}
        placeholder="query { users { id name } }"
        spellCheck={false}
        className={taCls + " min-h-[140px]"}
      />
      <label className="text-[11px] text-[var(--color-fg-muted)] block mt-2">{t("graphql.vars")}</label>
      <textarea
        value={gql.vars}
        onChange={(e) => setCurrent({ gql: { ...gql, vars: e.target.value } })}
        placeholder='{ "id": 1 }'
        spellCheck={false}
        className={taCls + " min-h-[80px]"}
      />
    </div>
  );
}
