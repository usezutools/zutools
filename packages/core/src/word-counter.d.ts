export const DEFAULT_WORDS_PER_MINUTE: 200;

export interface TextAnalysisOptions {
  locale?: string | string[];
  wordsPerMinute?: number;
}

export interface TextAnalysis {
  readonly words: number;
  readonly characters: number;
  readonly charactersWithoutSpaces: number;
  readonly sentences: number;
  readonly paragraphs: number;
  readonly readingTimeMinutes: number;
  readonly readingTimeSeconds: number;
  readonly wordsPerMinute: number;
}

export function segmentWords(
  value: string,
  locale?: string | string[]
): string[];
export function countWords(value: string, locale?: string | string[]): number;
export function countCharacters(
  value: string,
  locale?: string | string[]
): { total: number; withoutSpaces: number };
export function countSentences(
  value: string,
  locale?: string | string[]
): number;
export function countParagraphs(value: string): number;
export function analyzeText(
  value: string,
  options?: TextAnalysisOptions
): TextAnalysis;
