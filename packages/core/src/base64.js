function bytesToBinary(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return binary;
}

export function bytesToBase64(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return btoa(bytesToBinary(bytes));
}

export function base64ToBytes(value) {
  const { payload } = parseDataUri(value);
  const binary = atob(payload.replace(/\s/g, ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function utf8ToBase64(value) {
  return bytesToBase64(new TextEncoder().encode(value));
}

export function base64ToUtf8(value) {
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(value));
}

export function arrayBufferToBase64(buffer) {
  return bytesToBase64(new Uint8Array(buffer));
}

export function parseDataUri(value) {
  const normalized = String(value).trim();
  const match = normalized.match(/^data:([^;,]+)?;base64,(.*)$/s);
  return {
    mediaType: match?.[1] || null,
    payload: match ? match[2] : normalized,
  };
}

export function createDataUri(value, mediaType = 'application/octet-stream') {
  const payload = typeof value === 'string' ? value : bytesToBase64(value);
  return `data:${mediaType};base64,${payload.replace(/\s/g, '')}`;
}
