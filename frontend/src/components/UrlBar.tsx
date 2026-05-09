import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Send } from "lucide-react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

// Presenter.
export type UrlBarProps = {
  method: string;
  url: string;
  busy: boolean;
  hideSend?: boolean;
  hideMethod?: boolean;
  onMethodChange: (m: string) => void;
  onUrlChange: (u: string) => void;
  onSend: () => void;
};

export function UrlBar({
  method,
  url,
  busy,
  hideSend,
  hideMethod,
  onMethodChange,
  onUrlChange,
  onSend,
}: UrlBarProps) {
  const t = useT();
  return (
    <div className="flex gap-1.5 px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)]">
      {!hideMethod && (
        <Select value={method} onValueChange={onMethodChange}>
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
      )}
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder={t("composer.urlPlaceholder", { vars: "{{base_url}}/path" })}
        className={
          "flex-1 bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] " +
          "rounded-md px-2.5 py-1.5 font-mono text-xs outline-none " +
          "focus:border-[var(--color-accent)]"
        }
      />
      {!hideSend && (
        <Button variant="primary" onClick={onSend} disabled={busy}>
          <Send className="w-3.5 h-3.5" />
          {busy ? t("composer.sending") : t("composer.send")}
        </Button>
      )}
    </div>
  );
}

// Container — wires the store + send action.
export type UrlBarContainerProps = {
  busy: boolean;
  onSend: () => void;
  hideSend?: boolean;
  hideMethod?: boolean;
};

export function UrlBarContainer({ busy, onSend, hideSend, hideMethod }: UrlBarContainerProps) {
  const method = useStore((s) => s.current.method);
  const url = useStore((s) => s.current.url);
  const setCurrent = useStore((s) => s.setCurrent);
  return (
    <UrlBar
      method={method}
      url={url}
      busy={busy}
      hideSend={hideSend}
      hideMethod={hideMethod}
      onMethodChange={(method) => setCurrent({ method })}
      onUrlChange={(url) => setCurrent({ url })}
      onSend={onSend}
    />
  );
}
