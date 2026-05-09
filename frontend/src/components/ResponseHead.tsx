import type { ReactNode } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { humanSize, statusPillClass, statusText } from "../lib/utils";
import { Button } from "./ui/button";
import { Copy } from "lucide-react";
import { CopyAsMenuContainer } from "./CopyAsMenu";
import type { ResponseSnapshot } from "../lib/types";

// Presenter — pure props in / actions in.
export type ResponseHeadProps = {
  response: ResponseSnapshot;
  onCopyBody: () => void;
  copyAsSlot?: ReactNode;
};

export function ResponseHead({ response: r, onCopyBody, copyAsSlot }: ResponseHeadProps) {
  const t = useT();
  return (
    <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
      <span
        className={
          "font-mono font-bold text-xs px-2.5 py-0.5 rounded-full " + statusPillClass(r.status)
        }
      >
        {r.status} {r.statusText || statusText(r.status)}
      </span>
      <span className="text-xs text-[var(--color-fg-muted)]">{r.elapsedMs} ms</span>
      <span className="text-xs text-[var(--color-fg-muted)]">{humanSize(r.sizeBytes)}</span>
      <span
        className={
          "text-xs " +
          (r.transport === "native"
            ? "text-[var(--color-success)]"
            : "text-[var(--color-fg-muted)]")
        }
        title={t("response.transport.title")}
      >
        {r.transport}
      </span>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onCopyBody}>
        <Copy className="w-3 h-3" />
        {t("response.copy.body")}
      </Button>
      {copyAsSlot}
    </div>
  );
}

// Container — wires the store + clipboard.
export function ResponseHeadContainer() {
  const r = useStore((s) => s.lastResponse);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  if (!r) return null;

  const onCopyBody = () =>
    navigator.clipboard.writeText(r.body).then(() => showToast(t("response.bodyCopied")));

  return <ResponseHead response={r} onCopyBody={onCopyBody} copyAsSlot={<CopyAsMenuContainer />} />;
}
