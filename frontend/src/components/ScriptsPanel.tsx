/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";

const editorCls =
  "w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] " +
  "rounded px-2 py-1.5 font-mono text-xs outline-none resize-none " +
  "focus:border-[var(--color-accent)] text-[var(--color-fg)] min-h-[180px]";

// Presenter — pure props in / events out.
export type ScriptsPanelProps = {
  preScript: string;
  postScript: string;
  onPreScriptChange: (s: string) => void;
  onPostScriptChange: (s: string) => void;
};

export function ScriptsPanel({
  preScript,
  postScript,
  onPreScriptChange,
  onPostScriptChange,
}: ScriptsPanelProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <Block
        labelKey="scripts.preLabel"
        helpKey="scripts.preHelp"
        value={preScript}
        onChange={onPreScriptChange}
        ariaLabel={t("scripts.preLabel")}
        placeholder={
          "// pre-request — runs before the HTTP call\n" +
          '// pm.environment.set("token", "...");\n' +
          '// pm.request.headers.upsert({ key: "X-Trace", value: Date.now() });'
        }
      />
      <Block
        labelKey="scripts.postLabel"
        helpKey="scripts.postHelp"
        value={postScript}
        onChange={onPostScriptChange}
        ariaLabel={t("scripts.postLabel")}
        placeholder={
          "// post-response — runs after the HTTP response\n" +
          '// pm.test("status is 200", function() {\n' +
          "//   pm.expect(pm.response.code).to.equal(200);\n" +
          "// });\n" +
          "// const j = pm.response.json();\n" +
          '// pm.environment.set("user_id", j.id);'
        }
      />
      <p className="text-[10px] text-[var(--color-fg-muted)] mt-1">{t("scripts.sandboxNote")}</p>
    </div>
  );
}

function Block({
  labelKey,
  helpKey,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  labelKey: import("../lib/i18n").TKey;
  helpKey: import("../lib/i18n").TKey;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const t = useT();
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <label className="text-[11px] font-medium text-[var(--color-fg)]">{t(labelKey)}</label>
        <span className="text-[10px] text-[var(--color-fg-muted)]">{t(helpKey)}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        aria-label={ariaLabel}
        className={editorCls}
      />
    </div>
  );
}

// Container — wires the store. Presenter stays pure.
export function ScriptsPanelContainer() {
  const preScript = useStore((s) => s.current.preScript ?? "");
  const postScript = useStore((s) => s.current.postScript ?? "");
  const setCurrent = useStore((s) => s.setCurrent);
  return (
    <ScriptsPanel
      preScript={preScript}
      postScript={postScript}
      onPreScriptChange={(preScript) => setCurrent({ preScript })}
      onPostScriptChange={(postScript) => setCurrent({ postScript })}
    />
  );
}
