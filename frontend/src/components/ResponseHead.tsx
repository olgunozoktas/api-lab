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
      <TimingBadge response={r} />
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

// Elapsed-time badge with a curl-timing breakdown tooltip. The
// Zig bridge fills `timing` from curl's `--write-out '%{json}'`
// — DNS, TCP/TLS connect, and TTFB are extremely useful for
// answering "why was this request slow?". When the request was
// replayed from history (no timing) the tooltip degrades to a
// plain "Elapsed: Xms" string.
function TimingBadge({ response: r }: { response: ResponseSnapshot }) {
  const t = useT();
  const tooltip = r.timing
    ? [
        `${t("response.timing.dns")}: ${Math.round(r.timing.namelookup_ms)} ms`,
        `${t("response.timing.connect")}: ${Math.round(r.timing.connect_ms)} ms`,
        `${t("response.timing.ttfb")}: ${Math.round(r.timing.ttfb_ms)} ms`,
        `${t("response.timing.total")}: ${Math.round(r.timing.total_ms)} ms`,
      ].join("\n")
    : t("response.timing.elapsed", { ms: String(r.elapsedMs) });
  return (
    <span
      className="text-xs text-[var(--color-fg-muted)] cursor-help"
      title={tooltip}
      aria-label={tooltip.replace(/\n/g, " · ")}
    >
      {r.elapsedMs} ms
    </span>
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
