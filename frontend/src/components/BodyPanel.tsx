/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CodeEditor } from "./ui/code-editor";
import { Wand2 } from "lucide-react";
import type { Body, BodyMode } from "../lib/types";

// Presenter — pure props in / events out. No store.
export type BodyPanelProps = {
  value: Body;
  onChange: (body: Body) => void;
  onInvalidJson?: (err: string) => void;
};

export function BodyPanel({ value, onChange, onInvalidJson }: BodyPanelProps) {
  const t = useT();

  const setMode = (mode: BodyMode) => onChange({ ...value, mode });
  const setText = (text: string) => onChange({ ...value, text });

  const prettify = () => {
    if (value.mode !== "json") return;
    try {
      onChange({ ...value, text: JSON.stringify(JSON.parse(value.text), null, 2) });
    } catch (e) {
      onInvalidJson?.((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        <Select value={value.mode} onValueChange={(v) => setMode(v as BodyMode)}>
          <SelectTrigger aria-label="Body mode" className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("body.mode.none")}</SelectItem>
            <SelectItem value="json">{t("body.mode.json")}</SelectItem>
            <SelectItem value="form">{t("body.mode.form")}</SelectItem>
            <SelectItem value="raw">{t("body.mode.raw")}</SelectItem>
          </SelectContent>
        </Select>
        {value.mode === "json" && (
          <Button variant="secondary" size="sm" onClick={prettify}>
            <Wand2 className="w-3 h-3" />
            {t("body.prettyFormat")}
          </Button>
        )}
      </div>
      <BodyModeHint mode={value.mode} />
      {value.mode === "json" ? (
        <CodeEditor
          value={value.text}
          onChange={setText}
          language="json"
          placeholder='{"key": "value"}'
          minHeight={240}
        />
      ) : (
        <textarea
          value={value.text}
          onChange={(e) => setText(e.target.value)}
          placeholder={value.mode === "form" ? "key1=value1&key2=value2" : "raw body..."}
          spellCheck={false}
          className={
            "w-full min-h-[200px] resize-y bg-[var(--color-bg-elev)] " +
            "border border-[var(--color-border)] rounded-md p-2.5 " +
            "font-mono text-xs leading-6 outline-none " +
            "focus:border-[var(--color-accent)] text-[var(--color-fg)]"
          }
        />
      )}
    </div>
  );
}

// One-line note explaining what the selected body mode sends — what
// content-type the request will carry and how the editor's text is
// interpreted on the wire.
function BodyModeHint({ mode }: { mode: BodyMode }) {
  const t = useT();
  const hintKey = `body.hint.${mode}` as import("../lib/i18n").TKey;
  return (
    <div
      className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-fg-muted)]"
      role="note"
    >
      {t(hintKey)}
    </div>
  );
}

// Container — wires the store.
export function BodyPanelContainer() {
  const value = useStore((s) => s.current.body);
  const setCurrent = useStore((s) => s.setCurrent);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  return (
    <BodyPanel
      value={value}
      onChange={(body) => setCurrent({ body })}
      onInvalidJson={(error) => showToast(t("body.invalidJson", { error }))}
    />
  );
}
