/** Olgun Özoktaş geliştirdi · API Lab */
import type { ReactNode } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import {
  humanSize,
  sizeBand,
  sizeClass,
  statusClass,
  statusPillClass,
  statusText,
  timingBand,
  timingClass,
} from "../lib/utils";
import type { TKey } from "../lib/i18n";
import { downloadResponseBody } from "../lib/responseDownload";
import { Button } from "./ui/button";
import { Check, Copy, BookmarkPlus, Download, Terminal, Globe } from "lucide-react";
import { useCopyFeedback } from "../lib/useCopyFeedback";
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
  // Plain-English description of the status class — gives newcomers
  // context for what "401" or "503" actually means without leaving the
  // app. `other` (e.g. 0 = no response) produces no tooltip.
  const klass = statusClass(r.status);
  const classDesc = klass === "other" ? "" : t(`response.status.class.${klass}` as TKey);
  const statusLabel = `${r.status} ${r.statusText || statusText(r.status)}`;
  const tooltip = classDesc ? `${statusLabel}\n\n${classDesc}` : statusLabel;
  // Brief Copy→Check icon flip after a successful clipboard write —
  // the action feels instant before the toast even renders.
  const { copied, flash } = useCopyFeedback();
  return (
    <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
      <span
        className={
          "font-mono font-bold text-xs px-2.5 py-0.5 rounded-full cursor-help " +
          statusPillClass(r.status)
        }
        aria-live="polite"
        aria-atomic="true"
        title={tooltip}
        aria-label={t("response.statusAriaLabel", {
          status: String(r.status),
          text: r.statusText || statusText(r.status),
        })}
      >
        {r.status} {r.statusText || statusText(r.status)}
      </span>
      <TimingBadge response={r} />
      <SizeBadge bytes={r.sizeBytes} />
      <TransportChip transport={r.transport} />

      <div className="flex-1" />
      {onSaveExample && (
        <Button variant="ghost" size="sm" onClick={onSaveExample} title={t("examples.saveTitle")}>
          <BookmarkPlus className="w-3 h-3" />
          {t("examples.save")}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onCopyBody();
          flash();
        }}
        aria-live="polite"
      >
        {copied ? (
          <Check className="w-3 h-3 text-[var(--color-success)]" aria-hidden />
        ) : (
          <Copy className="w-3 h-3" aria-hidden />
        )}
        {copied ? t("response.copy.bodyDone") : t("response.copy.body")}
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
  const band = timingBand(r.elapsedMs);
  const bandLabel = t(`response.timing.band.${band}` as TKey);
  const breakdown = r.timing
    ? [
        `${t("response.timing.dns")}: ${Math.round(r.timing.namelookup_ms)} ms`,
        `${t("response.timing.connect")}: ${Math.round(r.timing.connect_ms)} ms`,
        `${t("response.timing.ttfb")}: ${Math.round(r.timing.ttfb_ms)} ms`,
        `${t("response.timing.total")}: ${Math.round(r.timing.total_ms)} ms`,
      ].join("\n")
    : t("response.timing.elapsed", { ms: String(r.elapsedMs) });
  const tooltip = `${bandLabel}\n\n${breakdown}`;
  return (
    <span
      className={"text-xs font-medium cursor-help " + timingClass(r.elapsedMs)}
      title={tooltip}
      aria-label={tooltip.replace(/\n/g, " · ")}
    >
      {r.elapsedMs} ms
    </span>
  );
}

// Payload size badge — mirrors the timing badge's perceptual-band
// colour palette so large/huge responses stand out without stealing
// focus from the status pill.
function SizeBadge({ bytes }: { bytes: number }) {
  const t = useT();
  const band = sizeBand(bytes);
  const bandLabel = t(`response.size.band.${band}` as TKey);
  const exact = t("response.size.bytes", { bytes: bytes.toLocaleString() });
  const tooltip = `${bandLabel}\n\n${exact}`;
  return (
    <span
      className={"text-xs font-medium cursor-help " + sizeClass(bytes)}
      title={tooltip}
      aria-label={tooltip.replace(/\n/g, " · ")}
    >
      {humanSize(bytes)}
    </span>
  );
}

// Transport indicator chip — `native` means the request went through
// the Zig curl bridge (CORS-free, full headers); `fetch` is the
// browser fallback. Icon + tooltip explains the difference without
// hijacking text density.
function TransportChip({ transport }: { transport: "native" | "fetch" }) {
  const t = useT();
  const isNative = transport === "native";
  const Icon = isNative ? Terminal : Globe;
  const labelKey: TKey = isNative ? "response.transport.native" : "response.transport.fetch";
  const titleKey: TKey = isNative
    ? "response.transport.native.title"
    : "response.transport.fetch.title";
  return (
    <span
      className={
        "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded cursor-help " +
        (isNative
          ? "bg-green-500/15 text-[var(--color-success)]"
          : "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]")
      }
      title={t(titleKey)}
      aria-label={t(titleKey)}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {t(labelKey)}
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
    downloadResponseBody(r.body, r.contentType, r.status, r.bodyBase64);
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
