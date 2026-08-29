export function bytesToBase64(value: Uint8Array | ArrayBuffer): string;
export function base64ToBytes(value: string): Uint8Array;
export function utf8ToBase64(value: string): string;
export function base64ToUtf8(value: string): string;
export function arrayBufferToBase64(buffer: ArrayBuffer): string;
export function parseDataUri(value: string): {
  mediaType: string | null;
  payload: string;
};
export function createDataUri(
  value: string | Uint8Array | ArrayBuffer,
  mediaType?: string
): string;
