/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { CodeEditor } from "./ui/code-editor";
import { humanSize, sizeClass } from "../lib/utils";
import { AlertTriangle, Check } from "lucide-react";
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
      <div className="mb-2 text-2xs text-[var(--color-fg-muted)]">{t("graphql.note")}</div>
      <label className="text-2xs text-[var(--color-fg-muted)]">{t("graphql.query")}</label>
      <CodeEditor
        value={value.query}
        onChange={(query) => onChange({ ...value, query })}
        language="graphql"
        placeholder="query { users { id name } }"
        minHeight={120}
        className="mb-2"
      />
      <label className="text-2xs text-[var(--color-fg-muted)] block mt-1">
        {t("graphql.vars")}
      </label>
      <CodeEditor
        value={value.vars}
        onChange={(vars) => onChange({ ...value, vars })}
        language="json"
        placeholder='{ "id": 1 }'
        minHeight={72}
      />
      <VariablesStatus text={value.vars} />
    </div>
  );
}

// Small footer below the Variables editor — live byte count plus a
// JSON-validity chip. Mirrors the v0.2.25 body-editor status line so
// the variable block behaves the same way: silent failure when the
// JSON is malformed becomes visible before Send.
function VariablesStatus({ text }: { text: string }) {
  const t = useT();
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);
  const status = useMemo<null | { ok: true } | { ok: false; error: string }>(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }, [text]);
  if (!status && bytes === 0) return null;
  return (
    <div className="mt-1.5 flex items-center gap-3 px-0.5 text-3xs font-mono">
      <span className={sizeClass(bytes)}>{humanSize(bytes)}</span>
      {status &&
        (status.ok ? (
          <span
            className="inline-flex items-center gap-1 text-[var(--color-success)]"
            title={t("body.status.validJson")}
          >
            <Check className="w-3 h-3" aria-hidden />
            {t("body.status.validJson")}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[var(--color-warning)] cursor-help"
            title={t("body.status.invalidJson", { error: status.error })}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden />
            {t("body.status.invalidJson", { error: status.error })}
          </span>
        ))}
    </div>
  );
}

// Container — wires the store.
export function GraphqlPanelContainer() {
  const value = useStore((s) => s.current.gql);
  const setCurrent = useStore((s) => s.setCurrent);
  return <GraphqlPanel value={value} onChange={(gql) => setCurrent({ gql })} />;
}
