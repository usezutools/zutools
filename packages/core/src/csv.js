export function parseCsv(input, delimiter = ',') {
  if (typeof delimiter !== 'string' || delimiter.length !== 1)
    throw new TypeError('CSV delimiter must be one character.');

  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else value += character;
  }

  if (quoted) throw new Error('Unclosed quote in CSV input.');
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter((currentRow) => currentRow.some((cell) => cell !== ''));
}

export function inferCsvValue(value) {
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  const startsLikeJson =
    (value.startsWith('[') && value.endsWith(']')) ||
    (value.startsWith('{') && value.endsWith('}'));
  if (startsLikeJson) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function csvToObjects(input, delimiter = ',', options = {}) {
  const rows = parseCsv(input, delimiter);
  if (rows.length === 0) return [];
  const headers = rows[0].map(
    (header, index) => header.trim() || `column_${index + 1}`
  );
  return rows.slice(1).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => {
        const value = row[index] ?? '';
        return [header, options.inferTypes ? inferCsvValue(value) : value];
      })
    )
  );
}

function csvCell(value, delimiter) {
  const serialized =
    value == null
      ? ''
      : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return /["\r\n]/.test(serialized) || serialized.includes(delimiter)
    ? `"${serialized.replace(/"/g, '""')}"`
    : serialized;
}

export function objectsToCsv(value, delimiter = ',') {
  if (!Array.isArray(value))
    throw new TypeError('JSON value must be an array of objects.');
  if (value.length === 0) return '';
  if (
    value.some(
      (item) => item == null || Array.isArray(item) || typeof item !== 'object'
    )
  )
    throw new TypeError('Every array item must be an object.');
  const headers = [...new Set(value.flatMap((item) => Object.keys(item)))];
  return [
    headers.map((header) => csvCell(header, delimiter)).join(delimiter),
    ...value.map((item) =>
      headers.map((header) => csvCell(item[header], delimiter)).join(delimiter)
    ),
  ].join('\n');
}
