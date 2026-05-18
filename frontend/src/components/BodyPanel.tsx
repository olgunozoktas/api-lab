/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CodeEditor } from "./ui/code-editor";
import { BodyMultipart, BodyBinary } from "./BodyFilePanels";
import { humanSize, sizeClass } from "../lib/utils";
import { AlertTriangle, Check, Wand2 } from "lucide-react";
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
            <SelectItem value="multipart">{t("body.mode.multipart")}</SelectItem>
            <SelectItem value="binary">{t("body.mode.binary")}</SelectItem>
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
      ) : value.mode === "multipart" ? (
        <BodyMultipart
          parts={value.parts ?? []}
          onChange={(parts) => onChange({ ...value, parts })}
        />
      ) : value.mode === "binary" ? (
        <BodyBinary
          filePath={value.filePath ?? ""}
          fileName={value.fileName ?? ""}
          onChange={(filePath, fileName) => onChange({ ...value, filePath, fileName })}
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
      <BodyStatusLine value={value} />
    </div>
  );
}

// Small footer beneath the body editor — shows live byte count and,
// for JSON mode, a parse-validity chip. Hidden entirely when the
// body is empty so an empty None-mode panel doesn't carry a stub.
function BodyStatusLine({ value }: { value: Body }) {
  const t = useT();
  const bytes = useMemo(() => new TextEncoder().encode(value.text).length, [value.text]);
  const jsonStatus = useMemo<null | { ok: true } | { ok: false; error: string }>(() => {
    if (value.mode !== "json") return null;
    const trimmed = value.text.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }, [value.mode, value.text]);
  if (value.mode === "none" || (bytes === 0 && !jsonStatus)) return null;
  return (
    <div className="mt-1.5 flex items-center gap-3 px-0.5 text-3xs font-mono">
      <span className={sizeClass(bytes)}>{humanSize(bytes)}</span>
      {jsonStatus &&
        (jsonStatus.ok ? (
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
            title={t("body.status.invalidJson", { error: jsonStatus.error })}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden />
            {t("body.status.invalidJson", { error: jsonStatus.error })}
          </span>
        ))}
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
      className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-2xs leading-relaxed text-[var(--color-fg-muted)]"
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
