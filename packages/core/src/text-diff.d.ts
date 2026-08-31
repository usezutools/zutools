export type TextDiffGranularity = 'smart' | 'line' | 'word' | 'character';
export type TextDiffChangeType = 'equal' | 'insert' | 'delete';

export interface TextDiffOptions {
  granularity?: TextDiffGranularity;
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  locale?: string;
  timeout?: number;
  maxEditLength?: number;
}

export interface TextDiffChange {
  type: TextDiffChangeType;
  value: string;
}

export interface TextDiffLineSide {
  number: number;
  segments: TextDiffChange[];
}

export interface TextDiffRow {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  left: TextDiffLineSide | null;
  right: TextDiffLineSide | null;
}

export interface TextDiffResult {
  changes: TextDiffChange[];
  rows: TextDiffRow[];
  summary: { insert: number; delete: number; equal: number };
  stats: {
    before: { characters: number; lines: number };
    after: { characters: number; lines: number };
    removedLines: number;
    addedLines: number;
  };
  identical: boolean;
}

export function countTextCharacters(
  value: string,
  locale?: string | string[]
): number;

export function compareText(
  before: string,
  after: string,
  options?: TextDiffOptions
): TextDiffResult;
