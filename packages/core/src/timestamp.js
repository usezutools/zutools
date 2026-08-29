export function detectTimestampUnit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError('Invalid Unix timestamp.');
  return Math.abs(numeric) < 100_000_000_000 ? 'seconds' : 'milliseconds';
}

export function timestampToDate(value, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError('Invalid Unix timestamp.');
  const unit =
    !options.unit || options.unit === 'auto'
      ? detectTimestampUnit(numeric)
      : options.unit;
  if (unit !== 'seconds' && unit !== 'milliseconds')
    throw new TypeError('Timestamp unit must be seconds, milliseconds or auto.');
  const date = new Date(unit === 'seconds' ? numeric * 1000 : numeric);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date.');
  return date;
}

export function dateToUnix(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date.');
  return {
    seconds: Math.floor(date.getTime() / 1000),
    milliseconds: date.getTime(),
  };
}

export function toDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date.');
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
