import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Send } from "lucide-react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type Props = { busy: boolean; onSend: () => void };

export function UrlBar({ busy, onSend }: Props) {
  const method = useStore((s) => s.current.method);
  const url = useStore((s) => s.current.url);
  const setCurrent = useStore((s) => s.setCurrent);
  const t = useT();

  return (
    <div className="flex gap-1.5 px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)]">
      <Select value={method} onValueChange={(v) => setCurrent({ method: v })}>
        <SelectTrigger
          aria-label="HTTP method"
          className={"w-22 font-mono font-bold " + methodClass(method)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METHODS.map((m) => (
            <SelectItem key={m} value={m}>
              <span className={"font-mono font-bold " + methodClass(m)}>{m}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="text"
        value={url}
        onChange={(e) => setCurrent({ url: e.target.value })}
        placeholder={t("composer.urlPlaceholder", { vars: "{{base_url}}/path" })}
        className={
          "flex-1 bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] " +
          "rounded-md px-2.5 py-1.5 font-mono text-xs outline-none " +
          "focus:border-[var(--color-accent)]"
        }
      />
      <Button variant="primary" onClick={onSend} disabled={busy}>
        <Send className="w-3.5 h-3.5" />
        {busy ? t("composer.sending") : t("composer.send")}
      </Button>
    </div>
  );
}
