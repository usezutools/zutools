import { PdfToolError, validateRequest } from './pdf/contract.js';
export { PdfToolError, LIMITS as PDF_LIMITS, parseRanges as parsePdfRanges, tools as pdfTools } from './pdf/contract.js';

// One cancellable, disposable worker per job. Callers retain their original bytes.
export function createPdfToolsClient({ workerUrl = new URL('./pdf.worker.js', import.meta.url),
  workerFactory = url => new Worker(url, { type: 'module' }) } = {}) {
  let active = null, disposed = false;
  async function run(toolId, inputs, plan, { signal, timeoutMs = 30000, limits, onProgress, outputNames } = {}) {
    if (disposed) throw new PdfToolError('DISPOSED', 'Cliente cerrado.');
    if (active) throw new PdfToolError('BUSY', 'Ya hay una operación en curso.');
    if (signal != null && (typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw new PdfToolError('INVALID_INPUT', 'AbortSignal no válido.');
    if (onProgress != null && typeof onProgress !== 'function') throw new PdfToolError('INVALID_INPUT', 'Callback no válido.');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new PdfToolError('INVALID_INPUT', 'Timeout no válido.');
    if (signal?.aborted) throw new PdfToolError('ABORTED', 'Operación cancelada.');
    const job = validateRequest(toolId, inputs, plan, limits);
    const copies = inputs.map(bytes => Uint8Array.from(bytes));
    return new Promise((resolve, reject) => {
      let worker, timer, done = false;
      const finish = (error, result) => {
        if (done) return; done = true;
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
        active = null; error ? reject(error) : resolve(result);
      };
      const abort = () => finish(new PdfToolError('ABORTED', 'Operación cancelada.'));
      active = { finish }; signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      timer = setTimeout(() => finish(new PdfToolError('TIMEOUT', 'La operación excedió el tiempo de prueba.')), timeoutMs);
      try {
        worker = workerFactory(workerUrl);
        worker.onerror = worker.onmessageerror = () => finish(new PdfToolError('WORKER_FAILED', 'El motor PDF no pudo completar la operación.'));
        worker.onmessage = ({ data }) => {
          if (done) return;
          if (data?.type === 'ready') worker.postMessage({ type: 'run', toolId, inputs: copies, plan: job.plan, limits: job.limits, outputNames }, copies.map(b => b.buffer));
          else if (data?.type === 'progress') {
            try { onProgress?.(data.progress); } catch { finish(new PdfToolError('CALLBACK_FAILED', 'Falló el callback de progreso.')); }
          } else if (data?.type === 'error') finish(new PdfToolError(data.code, data.message));
          else if (data?.type === 'result') finish(null, data.result);
        };
      } catch { finish(new PdfToolError('WORKER_FAILED', 'No se pudo iniciar el motor PDF.')); }
    });
  }
  return {
    inspect: (input, options) => run('inspect', [input], undefined, options),
    mergePdf: (inputs, options) => run('merge-pdf', inputs, undefined, options),
    organizePdf: (input, pages, options) => run('organize-pdf', [input], pages, options),
    splitPdf: (input, groups, options) => run('split-pdf', [input], groups, options),
    dispose() { disposed = true; active?.finish(new PdfToolError('DISPOSED', 'Cliente cerrado.')); },
  };
}
