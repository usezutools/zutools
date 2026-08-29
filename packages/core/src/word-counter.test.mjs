import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeText,
  countCharacters,
  countParagraphs,
  countSentences,
  countWords,
} from './word-counter.js';

test('analiza palabras, frases, párrafos y tiempo de lectura', () => {
  const result = analyzeText('Hola mundo.\n\nEsto es ZU Tools!', {
    locale: 'es',
    wordsPerMinute: 120,
  });

  assert.equal(result.words, 6);
  assert.equal(result.sentences, 2);
  assert.equal(result.paragraphs, 2);
  assert.equal(result.readingTimeSeconds, 3);
  assert.equal(result.wordsPerMinute, 120);
});

test('cuenta grafemas visibles sin romper emoji compuestos', () => {
  assert.deepEqual(countCharacters('A 👨‍👩‍👧', 'es'), {
    total: 3,
    withoutSpaces: 2,
  });
});

test('segmenta idiomas sin espacios mediante Intl.Segmenter', () => {
  assert.ok(countWords('吾輩は猫である', 'ja') > 1);
});

test('maneja contenido vacío y valida la velocidad de lectura', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countSentences('   '), 0);
  assert.equal(countParagraphs('\n\n'), 0);
  assert.throws(
    () => analyzeText('texto', { wordsPerMinute: 0 }),
    /positive number/
  );
});
