export const DEFAULT_WORDS_PER_MINUTE = 200;

const WORD_PATTERN = /[\p{L}\p{M}\p{N}]+(?:[’'][\p{L}\p{M}\p{N}]+)*/gu;

function normalizeText(value) {
  return typeof value === 'string' ? value : String(value ?? '');
}

function createSegmenter(locale, granularity) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function')
    return null;

  try {
    return new Intl.Segmenter(locale, { granularity });
  } catch {
    return new Intl.Segmenter(undefined, { granularity });
  }
}

export function segmentWords(value, locale) {
  const text = normalizeText(value);
  if (!text.trim()) return [];

  const segmenter = createSegmenter(locale, 'word');
  if (segmenter)
    return Array.from(segmenter.segment(text))
      .filter(({ isWordLike }) => isWordLike)
      .map(({ segment }) => segment);

  return text.match(WORD_PATTERN) || [];
}

export function countWords(value, locale) {
  return segmentWords(value, locale).length;
}

export function countCharacters(value, locale) {
  const text = normalizeText(value);
  const segmenter = createSegmenter(locale, 'grapheme');
  const characters = segmenter
    ? Array.from(segmenter.segment(text), ({ segment }) => segment)
    : Array.from(text);

  return {
    total: characters.length,
    withoutSpaces: characters.filter((character) => !/\s/u.test(character))
      .length,
  };
}

export function countSentences(value, locale) {
  const text = normalizeText(value).trim();
  if (!text) return 0;

  const segmenter = createSegmenter(locale, 'sentence');
  if (segmenter)
    return Array.from(segmenter.segment(text)).filter(({ segment }) =>
      segment.trim()
    ).length;

  return text
    .split(/(?:[.!?…]+(?:["'»”)\]]*)\s*)+|\n+/u)
    .filter((sentence) => sentence.trim()).length;
}

export function countParagraphs(value) {
  const text = normalizeText(value).trim();
  if (!text) return 0;
  return text.split(/\r?\n\s*\r?\n+/u).filter((paragraph) => paragraph.trim())
    .length;
}

export function analyzeText(
  value,
  { locale, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE } = {}
) {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0)
    throw new RangeError('wordsPerMinute must be a positive number');

  const text = normalizeText(value);
  const wordCount = countWords(text, locale);
  const characters = countCharacters(text, locale);
  const readingTimeMinutes = wordCount / wordsPerMinute;

  return Object.freeze({
    words: wordCount,
    characters: characters.total,
    charactersWithoutSpaces: characters.withoutSpaces,
    sentences: countSentences(text, locale),
    paragraphs: countParagraphs(text),
    readingTimeMinutes,
    readingTimeSeconds: Math.ceil(readingTimeMinutes * 60),
    wordsPerMinute,
  });
}
