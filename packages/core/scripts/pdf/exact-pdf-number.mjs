// ZU Tools serializer patch. Preserve the shortest round-tripping decimal
// representation of a finite JS Number; PDF numeric tokens cannot use exponents.
// This cannot recover precision already lost when a source was parsed to Number.
export function formatPdfNumberExact(value) {
  if (!Number.isFinite(value)) throw new Error('Cannot serialize a non-finite PDF number');
  const text = String(value); // Includes normalization of -0 to 0.
  if (!/[eE]/.test(text)) return text;
  const [coefficient, exponentText] = text.split('e');
  const negative = coefficient.startsWith('-');
  const unsigned = negative ? coefficient.slice(1) : coefficient;
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = integer + fraction;
  const position = integer.length + Number(exponentText);
  const decimal = position <= 0 ? '0.' + '0'.repeat(-position) + digits
    : position >= digits.length ? digits + '0'.repeat(position - digits.length)
      : digits.slice(0, position) + '.' + digits.slice(position);
  return (negative ? '-' : '') + decimal;
}
