import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayBufferToBase64,
  base64ToBytes,
  base64ToUtf8,
  createDataUri,
  csvToObjects,
  dateToUnix,
  formatJson,
  inferCsvValue,
  isValidJson,
  minifyJson,
  objectsToCsv,
  parseCsv,
  timestampToDate,
  transformText,
  utf8ToBase64,
} from './index.js';

test('Base64 conserva texto UTF-8 y bytes', () => {
  const source = 'ZU Tools · Cádiz · 🏕️';
  assert.equal(base64ToUtf8(utf8ToBase64(source)), source);
  const bytes = new Uint8Array([0, 127, 128, 255]);
  const encoded = arrayBufferToBase64(bytes.buffer);
  assert.deepEqual(base64ToBytes(encoded), bytes);
  assert.equal(
    createDataUri(encoded, 'application/test'),
    `data:application/test;base64,${encoded}`
  );
});

test('CSV interpreta separadores, comillas y saltos de línea', () => {
  assert.deepEqual(
    parseCsv('nombre,nota\nAna,"Hola, ""equipo"""\nLuis,"dos\nlíneas"'),
    [
      ['nombre', 'nota'],
      ['Ana', 'Hola, "equipo"'],
      ['Luis', 'dos\nlíneas'],
    ]
  );
});

test('CSV y objetos conservan columnas y tipos opcionales', () => {
  const objects = [
    { nombre: 'Ana', noches: 2 },
    { nombre: 'Luis', activo: false, metadata: { id: '001' } },
  ];
  const csv = objectsToCsv(objects);
  assert.deepEqual(csvToObjects(csv, ',', { inferTypes: true }), [
    { nombre: 'Ana', noches: 2, activo: '', metadata: '' },
    { nombre: 'Luis', noches: '', activo: false, metadata: { id: '001' } },
  ]);
  assert.equal(inferCsvValue('00123'), '00123');
});

test('JSON se formatea, minifica y valida', () => {
  assert.equal(formatJson('{"ok":true}', 2), '{\n  "ok": true\n}');
  assert.equal(minifyJson('{ "ok": true }'), '{"ok":true}');
  assert.equal(isValidJson('{"ok":true}'), true);
  assert.equal(isValidJson('{'), false);
});

test('texto se transforma sin depender de React', () => {
  assert.equal(transformText('hola mundo', 'title', 'es'), 'Hola Mundo');
  assert.equal(transformText('Hola mundo', 'snake', 'es'), 'hola_mundo');
});

test('timestamp detecta segundos y devuelve ambas unidades', () => {
  const date = timestampToDate(1_700_000_000);
  assert.deepEqual(dateToUnix(date), {
    seconds: 1_700_000_000,
    milliseconds: 1_700_000_000_000,
  });
});
