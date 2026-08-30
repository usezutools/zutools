export type PdfToolId = 'merge-pdf' | 'organize-pdf' | 'split-pdf';
export type PdfRotation = 0 | 90 | 180 | 270;
export interface PdfPageSelection { index: number; rotation: PdfRotation }
export interface PdfLimits { maxInputBytes: number; maxOutputBytes: number; maxFiles: number; maxPages: number; maxOutputs: number }
export interface PdfProgress { phase: 'checking-input' | 'checking-output'; current: number; total: number }
export interface PdfJobOptions { signal?: AbortSignal; timeoutMs?: number; limits?: Partial<PdfLimits>; onProgress?: (progress: PdfProgress) => void; accessibility?: 'remove' }
export interface PdfOutput { name: string; bytes: Uint8Array; pageCount: number }
export interface PdfResult { outputs: PdfOutput[]; archive?: Uint8Array; inputBytes: number; outputBytes: number; elapsedMs: number; validation: string; warnings: string[]; networkAttempts: number }
export interface PdfInspection { pageCount: number; pages: Array<{width: number; height: number; rotation: PdfRotation}>; features: {bookmarks: boolean; forms: boolean; metadata: boolean; accessibilityTags: boolean}; networkAttempts: number }
export class PdfToolError extends Error { constructor(code: string, message: string); code: string }
export const PDF_LIMITS: Readonly<PdfLimits>;
export const pdfTools: ReadonlyArray<{id: PdfToolId; name: string; edition: 'Free'}>;
export function parsePdfRanges(value: string, pageCount: number): number[][];
export interface PdfToolsClient {
  inspect(bytes: Uint8Array, options?: PdfJobOptions): Promise<PdfInspection>;
  /** Free always removes document Info/XMP. This is not a full sanitization API. */
  mergePdf(inputs: Uint8Array[], options?: PdfJobOptions): Promise<PdfResult>;
  organizePdf(bytes: Uint8Array, pages: PdfPageSelection[], options?: PdfJobOptions): Promise<PdfResult>;
  splitPdf(bytes: Uint8Array, groups: number[][], options?: PdfJobOptions): Promise<PdfResult>;
  dispose(): void;
}
export function createPdfToolsClient(options?: {workerUrl?: URL | string; workerFactory?: (url: URL | string) => Worker}): PdfToolsClient;
