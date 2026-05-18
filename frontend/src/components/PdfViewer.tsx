/** Olgun Özoktaş geliştirdi · API Lab */
// Lazy-loaded PDF preview for the binary response channel. Renders
// pages to a <canvas> via pdfjs-dist with prev/next navigation.
// Dynamic-imported by ResponseBinaryBody so the ~400 KB pdfjs payload
// lands in its own chunk and never weighs down the main bundle.

import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useT } from "../lib/i18n/useT";

GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfViewerProps = { bytes: Uint8Array };

export default function PdfViewer({ bytes }: PdfViewerProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Load the document once per body.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setDoc(null);
    setPage(1);
    // pdfjs detaches the buffer it is handed — clone so the caller's
    // memoized bytes survive untouched.
    const task = getDocument({ data: bytes.slice() });
    task.promise.then(
      (loaded) => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        setDoc(loaded);
        setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("error");
      }
    );
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [bytes]);

  // Destroy the document when it is replaced or the viewer unmounts.
  useEffect(() => {
    return () => {
      doc?.destroy();
    };
  }, [doc]);

  // Render the active page whenever the document or page index changes.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    doc.getPage(page).then((p) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const viewport = p.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTask = p.render({ canvasContext: ctx, viewport, canvas });
      renderTask.promise.catch(() => {
        /* cancelled render — ignore */
      });
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, page]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center text-2xs text-[var(--color-fg-muted)]">
        {t("response.binary.pdf.loading")}
      </div>
    );
  }
  if (status === "error" || !doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-2xs text-[var(--color-fg-muted)]">
        {t("response.binary.pdf.error")}
      </div>
    );
  }

  const total = doc.numPages;
  return (
    <div className="flex-1 overflow-auto p-3 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3 text-2xs text-[var(--color-fg)]">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label={t("response.binary.pdf.prev")}
          className="px-2 py-0.5 rounded border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg-elev)]"
        >
          ‹
        </button>
        <span className="font-mono">
          {t("response.binary.pdf.page", { page: String(page), total: String(total) })}
        </span>
        <button
          type="button"
          disabled={page >= total}
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          aria-label={t("response.binary.pdf.next")}
          className="px-2 py-0.5 rounded border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg-elev)]"
        >
          ›
        </button>
      </div>
      <canvas ref={canvasRef} className="border border-[var(--color-border)] bg-white max-w-full" />
    </div>
  );
}
