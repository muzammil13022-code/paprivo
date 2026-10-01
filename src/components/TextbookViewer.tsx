"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function TextbookViewer({ fileUrl, title }: { fileUrl: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<ReturnType<typeof pdfjs.getDocument> | null>(null);
  const renderTaskRef = useRef<ReturnType<PDFPageProxy["render"]> | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.2);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomFit, setZoomFit] = useState(true);

  // Load the document — only when this route is opened
  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjs.getDocument({ url: fileUrl });
    loadingTaskRef.current = loadingTask;
    loadingTask
      .promise.then((pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setPageInput("1");
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      pdfRef.current = null;
    };
  }, [fileUrl]);

  // Render the current page
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || status !== "ready") return;
    let cancelled = false;

    (async () => {
      try {
        renderTaskRef.current?.cancel();
        const p = await pdf.getPage(page);
        if (cancelled) return;

        // Fit width on first render / when fit is requested
        let s = scale;
        const container = containerRef.current;
        if (zoomFit && container) {
          const base = p.getViewport({ scale: 1 });
          s = Math.min(2, Math.max(0.5, (container.clientWidth - 24) / base.width));
          setScale(s);
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale: s * dpr });
        const cssViewport = p.getViewport({ scale: s });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        const task = p.render({ canvasContext: canvas.getContext("2d")!, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        /* render cancelled — ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, scale, status, zoomFit]);

  const goPage = useCallback(
    (n: number) => {
      if (!pdfRef.current) return;
      const clamped = Math.min(numPages, Math.max(1, n));
      setPage(clamped);
      setPageInput(String(clamped));
      containerRef.current?.scrollTo({ top: 0 });
    },
    [numPages],
  );

  function onJumpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(pageInput);
    if (Number.isInteger(n)) goPage(n);
  }

  function toggleFullscreen() {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-background-soft/70 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/10 text-sm">
        <button
          onClick={() => goPage(page - 1)}
          disabled={page <= 1 || status !== "ready"}
          className="btn-secondary h-8 px-3 text-sm disabled:opacity-40"
          aria-label="Previous page"
        >
          ←
        </button>
        <form onSubmit={onJumpSubmit} className="flex items-center gap-1.5">
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            onBlur={() => goPage(Number(pageInput))}
            aria-label="Page number"
            className="w-14 h-8 text-center rounded-lg border border-white/15 bg-white/5 text-foreground text-sm"
          />
          <span className="text-muted">/ {status === "ready" ? numPages : "…"}</span>
        </form>
        <button
          onClick={() => goPage(page + 1)}
          disabled={page >= numPages || status !== "ready"}
          className="btn-secondary h-8 px-3 text-sm disabled:opacity-40"
          aria-label="Next page"
        >
          →
        </button>

        <span className="mx-1 hidden sm:block w-px h-6 bg-white/10" aria-hidden />

        <button
          onClick={() => {
            setZoomFit(false);
            setScale((s) => Math.max(0.5, s - 0.2));
          }}
          disabled={status !== "ready"}
          className="btn-secondary h-8 px-3 text-sm disabled:opacity-40"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-muted w-12 text-center" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => {
            setZoomFit(false);
            setScale((s) => Math.min(3, s + 0.2));
          }}
          disabled={status !== "ready"}
          className="btn-secondary h-8 px-3 text-sm disabled:opacity-40"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoomFit(true)}
          disabled={status !== "ready"}
          className="btn-secondary h-8 px-3 text-sm hidden sm:inline-flex disabled:opacity-40"
        >
          Fit width
        </button>

        <span className="ml-auto flex items-center gap-2">
          <button onClick={toggleFullscreen} className="btn-secondary h-8 px-3 text-sm" disabled={status !== "ready"}>
            Fullscreen
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary h-8 px-3 text-sm"
          >
            New tab <span aria-hidden>↗</span>
          </a>
        </span>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="bg-[#0b1120] p-3 sm:p-4 overflow-auto max-h-[75vh]">
        {status === "loading" && (
          <div className="flex items-center justify-center h-64 text-muted text-sm gap-3">
            <span className="anim-spin h-5 w-5 rounded-full border-2 border-white/20 border-t-white" aria-hidden />
            Loading “{title}”…
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center justify-center h-64 text-muted text-sm text-center px-6">
            <div>
              <p>This PDF could not be loaded. It may have been moved — the library link will always point to a working copy.</p>
              {errorMsg && <p className="text-xs mt-2 opacity-60">Detail: {errorMsg}</p>}
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className={`mx-auto rounded-lg shadow-lg ${status === "ready" ? "" : "hidden"}`} />
      </div>
    </div>
  );
}
