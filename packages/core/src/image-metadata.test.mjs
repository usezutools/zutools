import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExifTiff } from './image-metadata.js';

test('lee campos EXIF TIFF básicos en little endian', () => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);

  view.setUint16(10, 0x010f, true);
  view.setUint16(12, 2, true);
  view.setUint32(14, 6, true);
  view.setUint32(18, 38, true);

  view.setUint16(22, 0x0112, true);
  view.setUint16(24, 3, true);
  view.setUint32(26, 1, true);
  view.setUint16(30, 6, true);
  view.setUint32(34, 0, true);

  new Uint8Array(buffer, 38, 6).set(new TextEncoder().encode('Canon\0'));

  assert.deepEqual(parseExifTiff(buffer), [
    { key: 'Fabricante', value: 'Canon' },
    { key: 'Orientación', value: 'Rotada 90°' },
  ]);
});

test('un bloque inválido no provoca errores', () => {
  assert.deepEqual(parseExifTiff(new ArrayBuffer(4)), []);
});
