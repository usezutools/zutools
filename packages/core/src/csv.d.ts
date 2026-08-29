export interface CsvOptions {
  inferTypes?: boolean;
}

export function parseCsv(input: string, delimiter?: string): string[][];
export function inferCsvValue(value: string): unknown;
export function csvToObjects(
  input: string,
  delimiter?: string,
  options?: CsvOptions
): Array<Record<string, unknown>>;
export function objectsToCsv(
  value: Array<Record<string, unknown>>,
  delimiter?: string
): string;
