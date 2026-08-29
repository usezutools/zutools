export function parseJson(value) {
  return JSON.parse(value);
}

export function formatJson(value, indentation = 2) {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  return JSON.stringify(parsed, null, indentation);
}

export function minifyJson(value) {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  return JSON.stringify(parsed);
}

export function isValidJson(value) {
  try {
    parseJson(value);
    return true;
  } catch {
    return false;
  }
}
