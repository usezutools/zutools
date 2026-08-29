export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds';

export function detectTimestampUnit(value: number | string): Exclude<TimestampUnit, 'auto'>;
export function timestampToDate(
  value: number | string,
  options?: { unit?: TimestampUnit }
): Date;
export function dateToUnix(value: Date | string | number): {
  seconds: number;
  milliseconds: number;
};
export function toDateTimeLocalValue(value: Date | string | number): string;
