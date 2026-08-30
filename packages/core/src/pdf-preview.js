import { PDF_LIMITS, PdfToolError } from './pdf.js';

/** Opens a local, read-only thumbnail session. Renderer and assets load on demand. */
export async function createPdfPreview(bytes, { signal, workerUrl = new URL('./pdfjs.worker.js', import.meta.url) } = {}) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > PDF_LIMITS.maxInputBytes) throw new PdfToolError('INVALID_INPUT', 'Invalid PDF bytes.');
  if (signal?.aborted) throw new PdfToolError('ABORTED', 'Preview cancelled.');
  const [{ getDocument, PDFWorker }, { LocalPdfAssets }] = await Promise.all([import('pdfjs-dist/build/pdf.mjs'), import('zutools:pdf-assets')]);
  if (signal?.aborted) throw new PdfToolError('ABORTED', 'Preview cancelled.');
  const port = new Worker(workerUrl, { type: 'module' }), worker = new PDFWorker({ port });
  const task = getDocument({ data: bytes.slice(), worker, isEvalSupported: false, stopAtErrors: true,
    useSystemFonts: true, useWorkerFetch: false, cMapPacked: true, BinaryDataFactory: LocalPdfAssets,
    enableXfa: false, isOffscreenCanvasSupported: false, isImageDecoderSupported: false,
    maxImageSize: 16 * 1024 ** 2, canvasMaxAreaInBytes: 32 * 1024 ** 2 });
  let disposed = false, renderTask, rendering = false;
  async function dispose() {
    if (disposed) return; disposed = true; signal?.removeEventListener('abort', abort);
    renderTask?.cancel();
    try { await task.destroy(); } finally { worker.destroy(); port.terminate(); }
  }
  const abort = () => { void dispose(); };
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) { await dispose(); throw new PdfToolError('ABORTED', 'Preview cancelled.'); }
  try {
    const document = await task.promise;
    if (document.numPages > PDF_LIMITS.maxPages) throw new PdfToolError('LIMIT_EXCEEDED', 'Too many preview pages.');
    return {
      pageCount: document.numPages,
      async renderPage(index, { width = 160, rotation = 0 } = {}) {
        if (disposed) throw new PdfToolError('DISPOSED', 'Preview closed.');
        if (rendering) throw new PdfToolError('BUSY', 'Render thumbnails sequentially.');
        if (!Number.isInteger(index) || index < 0 || index >= document.numPages || !Number.isInteger(width) || width < 40 || width > 600 || ![0,90,180,270].includes(rotation)) throw new PdfToolError('INVALID_INPUT', 'Invalid thumbnail options.');
        rendering = true;
        let page, canvas;
        try {
          page = await document.getPage(index + 1);
          const unit = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
          if (!(unit.width > 0 && unit.height > 0 && Number.isFinite(unit.width * unit.height))) throw new PdfToolError('INVALID_PDF', 'Invalid page dimensions.');
          const viewport = page.getViewport({ scale: Math.min(width / unit.width, 600 / unit.height), rotation: (page.rotate + rotation) % 360 });
          canvas = window.document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
          await renderTask.promise;
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob || disposed) throw new PdfToolError('ABORTED', 'Preview cancelled.');
          return blob;
        } finally { renderTask = null; rendering = false; page?.cleanup(); if (canvas) canvas.width = canvas.height = 0; }
      },
      dispose,
    };
  } catch (error) { await dispose(); throw error; }
}
