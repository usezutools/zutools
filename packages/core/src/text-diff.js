import { diffChars, diffLines, diffWords, diffWordsWithSpace } from 'diff';

const ENGINES = {
  character: diffChars,
  line: diffLines,
  smart: diffWordsWithSpace,
  word: diffWordsWithSpace,
};

const LINE_SEPARATOR_PATTERN = /\r\n|[\n\r\u2028\u2029]/gu;
const SMART_LINE_FALLBACK = {
  combinedCharacters: 500_000,
  linesPerText: 10_000,
  charactersPerLine: 50_000,
};

function textNeedsLineDiff(value) {
  let lines = value ? 1 : 0;
  let lineLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    const isLineBreak = character === 10 || character === 13 || character === 0x2028 || character === 0x2029;
    if (!isLineBreak) {
      lineLength += 1;
      if (lineLength >= SMART_LINE_FALLBACK.charactersPerLine) return true;
      continue;
    }
    if (character === 13 && value.charCodeAt(index + 1) === 10) index += 1;
    lines += 1;
    lineLength = 0;
    if (lines >= SMART_LINE_FALLBACK.linesPerText) return true;
  }
  return false;
}

function effectiveGranularity(before, after, requested) {
  if (requested !== 'smart') return requested;
  if (before.length + after.length >= SMART_LINE_FALLBACK.combinedCharacters) return 'line';
  return textNeedsLineDiff(before) || textNeedsLineDiff(after) ? 'line' : requested;
}

/**
 * Count user-perceived text characters while treating line separators as
 * structure measured by the separate line statistic.
 * @param {string} value
 * @param {string|string[]} [locale]
 */
export function countTextCharacters(value, locale) {
  const text = String(value).replace(LINE_SEPARATOR_PATTERN, '');
  if (!/[\p{M}\u200d\ufe0e\ufe0f\uD800-\uDFFF]/u.test(text)) return text.length;
  if (typeof Intl.Segmenter !== 'function') return Array.from(text).length;
  let segmenter;
  try {
    segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  } catch {
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
  return Array.from(segmenter.segment(text)).length;
}

function splitLines(value) {
  if (!value) return [];
  const lines = value.split(/\r\n|\n|\r/);
  if (/\r\n$|[\n\r]$/.test(value)) lines.pop();
  return lines;
}

function normalizeChanges(changes) {
  return changes.map(({ added, removed, value }) => ({
    type: added ? 'insert' : removed ? 'delete' : 'equal',
    value,
  }));
}

function runEngine(engine, before, after, options, intlSegmenter) {
  const engineOptions = {
    ignoreCase: Boolean(options.ignoreCase),
    ignoreWhitespace: Boolean(options.ignoreWhitespace),
    intlSegmenter,
    stripTrailingCr: true,
  };
  if (options.timeout !== undefined) engineOptions.timeout = options.timeout;
  if (options.maxEditLength !== undefined) engineOptions.maxEditLength = options.maxEditLength;
  return engine(before, after, engineOptions);
}

function inlineSegments(before, after, engine, options, intlSegmenter) {
  if (before === undefined) return { left: [], right: [{ type: 'insert', value: after }] };
  if (after === undefined) return { left: [{ type: 'delete', value: before }], right: [] };
  if (engine === diffLines) {
    return {
      left: [{ type: 'delete', value: before }],
      right: [{ type: 'insert', value: after }],
    };
  }
  if (options.granularity === 'smart') {
    const wordEngine = options.ignoreWhitespace ? diffWords : diffWordsWithSpace;
    const wordChanges = normalizeChanges(runEngine(wordEngine, before, after, options, intlSegmenter) || []);
    const removed = wordChanges.filter((change) => change.type === 'delete').map((change) => change.value).join('');
    const inserted = wordChanges.filter((change) => change.type === 'insert').map((change) => change.value).join('');
    const changedTextHasSpaces = /\s/.test(removed) || /\s/.test(inserted);
    const changedLength = Math.max(removed.length, inserted.length);
    const characterChanges = normalizeChanges(runEngine(diffChars, removed, inserted, options) || []);
    const sharedCharacters = characterChanges.filter((change) => change.type === 'equal').reduce((total, change) => total + change.value.length, 0);
    const sharedRatio = changedLength ? sharedCharacters / changedLength : 0;
    engine = !changedTextHasSpaces && (changedLength <= 3 || sharedRatio >= 0.45)
      ? diffChars
      : wordEngine;
  }
  const changes = normalizeChanges(runEngine(engine, before, after, options, intlSegmenter) || []);
  const reverseChanges = normalizeChanges(runEngine(engine, after, before, options, intlSegmenter) || []);
  return {
    left: reverseChanges
      .filter((change) => change.type !== 'delete')
      .map((change) => ({ ...change, type: change.type === 'insert' ? 'delete' : change.type })),
    right: changes.filter((change) => change.type !== 'delete'),
  };
}

function buildRows(lineChanges, engine, options, intlSegmenter) {
  const rows = [];
  let beforeLine = 1;
  let afterLine = 1;

  for (let index = 0; index < lineChanges.length;) {
    const change = lineChanges[index];
    if (change.type === 'equal') {
      for (const text of splitLines(change.value)) {
        rows.push({
          type: 'equal',
          left: { number: beforeLine++, segments: [{ type: 'equal', value: text }] },
          right: { number: afterLine++, segments: [{ type: 'equal', value: text }] },
        });
      }
      index += 1;
      continue;
    }

    const removed = [];
    const inserted = [];
    while (index < lineChanges.length && lineChanges[index].type !== 'equal') {
      const current = lineChanges[index];
      const target = current.type === 'delete' ? removed : inserted;
      for (const text of splitLines(current.value)) target.push(text);
      index += 1;
    }

    const length = Math.max(removed.length, inserted.length);
    for (let offset = 0; offset < length; offset += 1) {
      const before = removed[offset];
      const after = inserted[offset];
      const segments = inlineSegments(before, after, engine, options, intlSegmenter);
      const meaningful = segments.left.some((segment) => segment.type === 'delete')
        || segments.right.some((segment) => segment.type === 'insert');
      rows.push({
        type: before === undefined ? 'insert' : after === undefined ? 'delete' : meaningful ? 'replace' : 'equal',
        left: before === undefined ? null : { number: beforeLine++, segments: segments.left },
        right: after === undefined ? null : { number: afterLine++, segments: segments.right },
      });
    }
  }
  return rows;
}

/**
 * Compare two text values through the selected native diff operation.
 * @param {string} before
 * @param {string} after
 * @param {{granularity?: 'smart'|'line'|'word'|'character', ignoreCase?: boolean, ignoreWhitespace?: boolean, locale?: string, timeout?: number, maxEditLength?: number}} [options]
 */
export function compareText(before, after, options = {}) {
  const beforeText = String(before);
  const afterText = String(after);
  const requestedGranularity = options.granularity || 'smart';
  const granularity = effectiveGranularity(beforeText, afterText, requestedGranularity);
  let engine = ENGINES[granularity];
  if (!ENGINES[requestedGranularity]) throw new TypeError(`Unsupported diff granularity: ${requestedGranularity}`);
  if (['smart', 'word'].includes(granularity) && options.ignoreWhitespace) engine = diffWords;

  const intlSegmenter = ['smart', 'word'].includes(granularity) && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(options.locale || 'en', { granularity: 'word' })
    : undefined;
  const changes = runEngine(engine, beforeText, afterText, options, intlSegmenter);
  const nativeLineChanges = engine === diffLines && !options.ignoreCase && !options.ignoreWhitespace
    ? changes
    : runEngine(diffLines, beforeText, afterText, {
      ...options,
      ignoreCase: false,
      ignoreWhitespace: false,
    });

  if (!changes || !nativeLineChanges) {
    const error = new RangeError('The text comparison exceeded its processing limit.');
    error.code = 'TEXT_DIFF_LIMIT';
    throw error;
  }

  const normalized = normalizeChanges(changes);
  const lineChanges = normalizeChanges(nativeLineChanges);
  const summary = normalized.reduce((total, change) => {
    total[change.type] += countTextCharacters(change.value, options.locale);
    return total;
  }, { insert: 0, delete: 0, equal: 0 });

  const rows = buildRows(lineChanges, engine, { ...options, granularity }, intlSegmenter);
  return {
    changes: normalized,
    rows,
    summary,
    stats: {
      before: { characters: countTextCharacters(beforeText, options.locale), lines: splitLines(beforeText).length },
      after: { characters: countTextCharacters(afterText, options.locale), lines: splitLines(afterText).length },
      removedLines: rows.filter((row) => row.type !== 'equal' && row.left).length,
      addedLines: rows.filter((row) => row.type !== 'equal' && row.right).length,
    },
    identical: !normalized.some((change) => change.type !== 'equal'),
  };
}
