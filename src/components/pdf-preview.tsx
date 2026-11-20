"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
} from "lucide-react";
export function PdfPreview({ url }: { url: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | undefined;
    import("pdfjs-dist")
      .then(async (pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const loading = pdfjs.getDocument({ url });
        task = loading;
        const pdf = await loading.promise;
        if (!cancelled) {
          setDocument(pdf);
          setPage(1);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Preview unavailable. You can still download the PDF.");
      });
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;
    let rendering: { cancel: () => void } | undefined;
    document
      .getPage(page)
      .then(async (pdfPage) => {
        if (cancelled || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.45 * zoom });
        const target = canvas.current;
        target.width = viewport.width;
        target.height = viewport.height;
        const render = pdfPage.render({ canvas: target, viewport });
        rendering = render;
        await render.promise;
        if (!cancelled) setReady(true);
      })
      .catch((e: Error) => {
        if (!cancelled && e.name !== "RenderingCancelledException")
          setError(
            "Could not render this page. The PDF download is still available.",
          );
      });
    return () => {
      cancelled = true;
      rendering?.cancel();
    };
  }, [document, page, zoom]);
  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-toolbar">
        <div>
          <button
            className="icon-btn"
            aria-label="Previous PDF page"
            disabled={!document || page <= 1}
            onClick={() => {
              setReady(false);
              setPage((p) => p - 1);
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {page} / {document?.numPages || "…"}
          </span>
          <button
            className="icon-btn"
            aria-label="Next PDF page"
            disabled={!document || page >= document.numPages}
            onClick={() => {
              setReady(false);
              setPage((p) => p + 1);
            }}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div>
          <button
            className="icon-btn"
            aria-label="Zoom out PDF"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            className="icon-btn"
            aria-label="Zoom in PDF"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : (
        <div className="pdf-canvas-scroll">
          {!ready && (
            <div className="pdf-rendering">
              <LoaderCircle className="spin" size={22} />
              <span>Rendering your report…</span>
            </div>
          )}
          <canvas
            ref={canvas}
            aria-label={`PDF report page ${page}`}
            role="img"
            data-ready={ready}
            style={{
              width: `${zoom * 100}%`,
              display: ready ? "block" : "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
