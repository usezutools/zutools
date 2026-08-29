export type TextTransformation =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'snake'
  | 'kebab'
  | 'trim';

export function wordsFrom(value: string): string[];
export function transformText(
  value: string,
  type: TextTransformation,
  locale?: string
): string;
export function countWords(value: string): number;
