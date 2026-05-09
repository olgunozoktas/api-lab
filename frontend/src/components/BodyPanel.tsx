import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Wand2 } from "lucide-react";
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
        <Select value={body.mode} onValueChange={(v) => setMode(v as BodyMode)}>
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
        <Button variant="secondary" size="sm" onClick={prettify}>
          <Wand2 className="w-3 h-3" />
          {t("body.prettyFormat")}
        </Button>
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
