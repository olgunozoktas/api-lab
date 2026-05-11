import type { ReactNode } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { humanSize, statusPillClass, statusText } from "../lib/utils";
import { downloadResponseBody } from "../lib/responseDownload";
import { Button } from "./ui/button";
import { Copy, BookmarkPlus, Download } from "lucide-react";
import { CopyAsMenuContainer } from "./CopyAsMenu";
import type { ResponseSnapshot } from "../lib/types";
import { exampleFromResponse, suggestExampleName } from "../lib/examples";

// Presenter — pure props in / actions in.
export type ResponseHeadProps = {
  response: ResponseSnapshot;
  onCopyBody: () => void;
  onDownloadBody: () => void;
  onSaveExample?: () => void;
  copyAsSlot?: ReactNode;
};

export function ResponseHead({
  response: r,
  onCopyBody,
  onDownloadBody,
  onSaveExample,
  copyAsSlot,
}: ResponseHeadProps) {
  const t = useT();
  return (
    <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
      <span
        className={
          "font-mono font-bold text-xs px-2.5 py-0.5 rounded-full " + statusPillClass(r.status)
        }
        aria-live="polite"
        aria-atomic="true"
        aria-label={t("response.statusAriaLabel", {
          status: String(r.status),
          text: r.statusText || statusText(r.status),
        })}
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
      {onSaveExample && (
        <Button variant="ghost" size="sm" onClick={onSaveExample} title={t("examples.saveTitle")}>
          <BookmarkPlus className="w-3 h-3" />
          {t("examples.save")}
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onCopyBody}>
        <Copy className="w-3 h-3" />
        {t("response.copy.body")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDownloadBody}
        title={t("response.download.title")}
      >
        <Download className="w-3 h-3" />
        {t("response.download.body")}
      </Button>
      {copyAsSlot}
    </div>
  );
}

// Container — wires the store + clipboard.
export function ResponseHeadContainer() {
  const r = useStore((s) => s.lastResponse);
  const current = useStore((s) => s.current);
  const addExample = useStore((s) => s.addExample);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  if (!r) return null;

  const onCopyBody = () =>
    navigator.clipboard.writeText(r.body).then(() => showToast(t("response.bodyCopied")));

  const onDownloadBody = () => {
    downloadResponseBody(r.body, r.contentType, r.status);
    showToast(t("response.bodyDownloaded"));
  };

  const onSaveExample = () => {
    const name = suggestExampleName(current, r);
    addExample(exampleFromResponse(name, current, r));
    showToast(t("examples.saved", { name }));
  };

  return (
    <ResponseHead
      response={r}
      onCopyBody={onCopyBody}
      onDownloadBody={onDownloadBody}
      onSaveExample={onSaveExample}
      copyAsSlot={<CopyAsMenuContainer />}
    />
  );
}
