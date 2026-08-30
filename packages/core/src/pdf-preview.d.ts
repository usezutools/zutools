export interface PdfPreview {
  pageCount: number;
  renderPage(index: number, options?: {width?: number; rotation?: 0 | 90 | 180 | 270}): Promise<Blob>;
  dispose(): Promise<void>;
}
export function createPdfPreview(bytes: Uint8Array, options?: {signal?: AbortSignal; workerUrl?: URL | string}): Promise<PdfPreview>;
