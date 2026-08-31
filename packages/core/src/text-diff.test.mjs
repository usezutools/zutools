import test from 'node:test';
import assert from 'node:assert/strict';
import { compareText, countTextCharacters } from './text-diff.js';

test('text comparison wraps native word diff results', () => {
  const result = compareText('The quick fox', 'The calm fox');
  assert.deepEqual(result.changes, [
    { type: 'equal', value: 'The ' },
    { type: 'delete', value: 'quick' },
    { type: 'insert', value: 'calm' },
    { type: 'equal', value: ' fox' },
  ]);
  assert.equal(result.identical, false);
});

test('text comparison supports lines, characters and empty values', () => {
  assert.deepEqual(
    compareText('uno\ndos\n', 'uno\ntres\n', { granularity: 'line' }).changes,
    [
      { type: 'equal', value: 'uno\n' },
      { type: 'delete', value: 'dos\n' },
      { type: 'insert', value: 'tres\n' },
    ]
  );
  assert.deepEqual(compareText('', '🏕️', { granularity: 'character' }).changes, [
    { type: 'insert', value: '🏕️' },
  ]);
  assert.deepEqual(compareText('á', '', { granularity: 'character' }).changes, [
    { type: 'delete', value: 'á' },
  ]);
});

test('text comparison delegates case and whitespace options', () => {
  assert.equal(compareText('Hola', 'hola', { ignoreCase: true, locale: 'es' }).identical, true);
  assert.equal(compareText('uno   dos', 'uno dos', { ignoreWhitespace: true }).identical, true);
});

test('text comparison exposes native line blocks as numbered presentation rows', () => {
  const result = compareText('uno\ndos\ntres\n', 'uno\nDOS\ncuatro\ntres\n');

  assert.deepEqual(result.rows.map((row) => ({
    type: row.type,
    before: row.left?.number ?? null,
    after: row.right?.number ?? null,
  })), [
    { type: 'equal', before: 1, after: 1 },
    { type: 'replace', before: 2, after: 2 },
    { type: 'insert', before: null, after: 3 },
    { type: 'equal', before: 3, after: 4 },
  ]);
  assert.deepEqual(result.stats, {
    before: { characters: 10, lines: 3 },
    after: { characters: 16, lines: 4 },
    removedLines: 1,
    addedLines: 2,
  });
  assert.deepEqual(result.rows[1].left.segments, [{ type: 'delete', value: 'dos' }]);
  assert.deepEqual(result.rows[1].right.segments, [{ type: 'insert', value: 'DOS' }]);
});

test('character statistics exclude line separators and count grapheme clusters', () => {
  assert.equal(countTextCharacters('uno\r\ndos\ntres\r'), 10);
  assert.equal(countTextCharacters('A🏕️B'), 3);

  const lineEndingOnly = compareText('uno\n', 'uno\r\n', { granularity: 'character' });
  assert.deepEqual(lineEndingOnly.stats, {
    before: { characters: 3, lines: 1 },
    after: { characters: 3, lines: 1 },
    removedLines: 0,
    addedLines: 0,
  });
  assert.equal(lineEndingOnly.summary.delete, 0);
  assert.equal(lineEndingOnly.summary.insert, 0);
  assert.equal(lineEndingOnly.identical, false);
});

test('smart presentation chooses native character or word highlights per changed line', () => {
  const shortChange = compareText('"edad": 29', '"edad": 30');
  assert.deepEqual(shortChange.rows[0].left.segments.filter((change) => change.type === 'delete'), [
    { type: 'delete', value: '29' },
  ]);
  assert.deepEqual(shortChange.rows[0].right.segments.filter((change) => change.type === 'insert'), [
    { type: 'insert', value: '30' },
  ]);

  const relatedWord = compareText('carlos@example.com', 'carlos.mendoza@example.com');
  assert.deepEqual(relatedWord.rows[0].right.segments.filter((change) => change.type === 'insert'), [
    { type: 'insert', value: '.mendoza' },
  ]);

  const differentWord = compareText('rol: editor', 'rol: administrador');
  assert.deepEqual(differentWord.rows[0].left.segments.filter((change) => change.type === 'delete'), [
    { type: 'delete', value: 'editor' },
  ]);
  assert.deepEqual(differentWord.rows[0].right.segments.filter((change) => change.type === 'insert'), [
    { type: 'insert', value: 'administrador' },
  ]);
});

test('smart comparison transparently falls back to lines for large or minified texts', () => {
  const before = `${'a'.repeat(50_000)}x`;
  const after = `${'a'.repeat(50_000)}y`;
  const result = compareText(before, after, { granularity: 'smart' });

  assert.deepEqual(result.rows[0].left.segments, [{ type: 'delete', value: before }]);
  assert.deepEqual(result.rows[0].right.segments, [{ type: 'insert', value: after }]);
});

test('text comparison rejects unknown granularities and bounded work', () => {
  assert.throws(() => compareText('a', 'b', { granularity: 'paragraph' }), TypeError);
  assert.throws(
    () => compareText('a'.repeat(30), 'b'.repeat(30), { maxEditLength: 1 }),
    (error) => error.code === 'TEXT_DIFF_LIMIT'
  );
});
