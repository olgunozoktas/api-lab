/** Olgun Özoktaş geliştirdi · API Lab */
// Rich viewers for the binary response channel. The native bridge
// flags non-text bodies and ships them base64-encoded; this component
// decodes the bytes once and dispatches to an image / audio / video /
// PDF preview, falling back to the hex viewer for anything else.

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useT } from "../lib/i18n/useT";
import { base64ToBytes, MAX_BINARY_RAW, pickBinaryViewer } from "../lib/binaryBody";
import { HexViewer } from "./HexViewer";
import type { ResponseSnapshot } from "../lib/types";

// pdfjs-dist (~400 KB) is pulled into a lazy chunk so it never weighs
// down the main bundle — only a PDF response loads it.
const PdfViewer = lazy(() => import("./PdfViewer"));

export type ResponseBinaryBodyProps = { response: ResponseSnapshot };

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Build an object URL for the decoded bytes, revoking it on unmount /
// change so blobs don't leak across responses.
function useObjectUrl(bytes: Uint8Array<ArrayBuffer>, mimeType: string): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bytes, mimeType]);
  return url;
}

function ImagePreview({ bytes, mimeType }: { bytes: Uint8Array<ArrayBuffer>; mimeType: string }) {
  const t = useT();
  const url = useObjectUrl(bytes, mimeType);
  return (
    <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-[var(--color-bg)]">
      {url ? (
        <img
          src={url}
          alt={t("response.binary.image.alt")}
          className="max-w-full max-h-full border border-[var(--color-border)] rounded"
        />
      ) : null}
    </div>
  );
}

function AudioPreview({ bytes, mimeType }: { bytes: Uint8Array<ArrayBuffer>; mimeType: string }) {
  const t = useT();
  const url = useObjectUrl(bytes, mimeType);
  return (
    <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-[var(--color-bg)]">
      {url ? (
        <audio src={url} controls className="w-full max-w-md">
          {t("response.binary.mediaUnsupported")}
        </audio>
      ) : null}
    </div>
  );
}

function VideoPreview({ bytes, mimeType }: { bytes: Uint8Array<ArrayBuffer>; mimeType: string }) {
  const t = useT();
  const url = useObjectUrl(bytes, mimeType);
  return (
    <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-[var(--color-bg)]">
      {url ? (
        <video src={url} controls className="max-w-full max-h-full">
          {t("response.binary.mediaUnsupported")}
        </video>
      ) : null}
    </div>
  );
}

function PdfLoading() {
  const t = useT();
  return (
    <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--color-fg-muted)]">
      {t("response.binary.pdf.loading")}
    </div>
  );
}

export function ResponseBinaryBody({ response: r }: ResponseBinaryBodyProps) {
  const t = useT();
  const bytes = useMemo<Uint8Array<ArrayBuffer>>(
    () => (r.bodyBase64 ? base64ToBytes(r.bodyBase64) : new Uint8Array(0)),
    [r.bodyBase64]
  );

  if (r.bodyTooLarge) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-[12px] text-[var(--color-fg-muted)] max-w-sm leading-6">
          {t("response.binary.tooLarge", {
            size: humanSize(r.sizeBytes),
            limit: humanSize(MAX_BINARY_RAW),
          })}
        </p>
      </div>
    );
  }

  switch (pickBinaryViewer(r.contentType)) {
    case "image":
      return <ImagePreview bytes={bytes} mimeType={r.contentType} />;
    case "audio":
      return <AudioPreview bytes={bytes} mimeType={r.contentType} />;
    case "video":
      return <VideoPreview bytes={bytes} mimeType={r.contentType} />;
    case "pdf":
      return (
        <Suspense fallback={<PdfLoading />}>
          <PdfViewer bytes={bytes} />
        </Suspense>
      );
    default:
      return (
        <div className="flex-1 overflow-hidden flex flex-col">
          <HexViewer body={bytes} />
        </div>
      );
  }
}
