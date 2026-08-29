import { countWords as countLocalizedWords } from './word-counter.js';

export function wordsFrom(value) {
  return value
    .replace(/([a-záéíóúüñ0-9])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function transformText(value, type, locale = 'es') {
  const words = wordsFrom(value);
  if (type === 'upper') return value.toLocaleUpperCase(locale);
  if (type === 'lower') return value.toLocaleLowerCase(locale);
  if (type === 'title')
    return words
      .map(
        (word) =>
          word.charAt(0).toLocaleUpperCase(locale) +
          word.slice(1).toLocaleLowerCase(locale)
      )
      .join(' ');
  if (type === 'sentence') {
    const lower = value.trim().toLocaleLowerCase(locale);
    return lower.replace(
      /(^|[.!?]\s+)([a-záéíóúüñ])/g,
      (_, prefix, letter) => prefix + letter.toLocaleUpperCase(locale)
    );
  }
  if (type === 'camel')
    return words
      .map((word, index) => {
        const lower = word.toLocaleLowerCase(locale);
        return index === 0
          ? lower
          : lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
      })
      .join('');
  if (type === 'snake')
    return words.map((word) => word.toLocaleLowerCase(locale)).join('_');
  if (type === 'kebab')
    return words.map((word) => word.toLocaleLowerCase(locale)).join('-');
  if (type === 'trim')
    return value
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .join('\n');
  return value;
}

export function countWords(value, locale = 'es') {
  return countLocalizedWords(value, locale);
}
