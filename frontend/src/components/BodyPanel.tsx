import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import type { BodyMode } from "../lib/types";

export function BodyPanel() {
  const body = useStore((s) => s.current.body);
  const setCurrent = useStore((s) => s.setCurrent);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const setMode = (mode: BodyMode) => setCurrent({ body: { ...body, mode } });
  const setText = (text: string) => setCurrent({ body: { ...body, text } });

  const prettify = () => {
    if (body.mode !== "json") return;
    try {
      setText(JSON.stringify(JSON.parse(body.text), null, 2));
    } catch (e) {
      showToast(t("body.invalidJson", { error: (e as Error).message }));
    }
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        <select
          value={body.mode}
          onChange={(e) => setMode(e.target.value as BodyMode)}
          className="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 text-xs"
        >
          <option value="none">{t("body.mode.none")}</option>
          <option value="json">{t("body.mode.json")}</option>
          <option value="form">{t("body.mode.form")}</option>
          <option value="raw">{t("body.mode.raw")}</option>
        </select>
        <button
          onClick={prettify}
          className="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-2 py-1 text-xs hover:bg-[var(--color-bg-elev-2)]"
        >
          {t("body.prettyFormat")}
        </button>
      </div>
      <textarea
        value={body.text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"key": "value"}'
        spellCheck={false}
        className={
          "w-full min-h-[200px] resize-y bg-[var(--color-bg-elev)] " +
          "border border-[var(--color-border)] rounded-md p-2.5 " +
          "font-mono text-xs leading-6 outline-none " +
          "focus:border-[var(--color-accent)] text-[var(--color-fg)]"
        }
      />
    </div>
  );
}
