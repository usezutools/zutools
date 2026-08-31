export class PdfToolError extends Error {
  constructor(code, message) { super(message); this.name = 'PdfToolError'; this.code = code; }
}
export const fail = (code, message) => { throw new PdfToolError(code, message); };

// Product resource bounds, not limits imposed by the PDF processing dependency.
export const LIMITS = Object.freeze({ maxInputBytes: 16 * 1024 ** 2,
  maxOutputBytes: 32 * 1024 ** 2, maxFiles: 50, maxPages: 200, maxOutputs: 50 });
export const tools = Object.freeze([
  { id: 'merge-pdf', name: 'Unir PDF', edition: 'Free' },
  { id: 'organize-pdf', name: 'Organizar PDF', edition: 'Free' },
  { id: 'split-pdf', name: 'Dividir PDF', edition: 'Free' },
]);

export function validateRequest(toolId, inputs, plan, overrides = {}) {
  const limits = { ...LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!(key in LIMITS) || !Number.isSafeInteger(value) || value < 1 || value > LIMITS[key]) fail('INVALID_INPUT', 'Límites no válidos.');
  }
  if (![...tools.map(t => t.id), 'inspect'].includes(toolId)) fail('INVALID_INPUT', 'Herramienta desconocida.');
  if (!Array.isArray(inputs) || !inputs.length || (toolId !== 'merge-pdf' && inputs.length !== 1)) fail('INVALID_INPUT', 'Selecciona los documentos PDF.');
  if (inputs.length > limits.maxFiles) fail('LIMIT_EXCEEDED', 'Demasiados documentos.');
  let inputBytes = 0;
  for (const bytes of inputs) {
    if (!(bytes instanceof Uint8Array) || !(bytes.buffer instanceof ArrayBuffer) || !bytes.length) fail('INVALID_INPUT', 'Se necesitan bytes de un PDF no vacío.');
    inputBytes += bytes.length;
  }
  if (inputBytes > limits.maxInputBytes) fail('LIMIT_EXCEEDED', 'Los archivos superan el límite de esta prueba.');
  const validIndex = i => Number.isSafeInteger(i) && i >= 0;
  if (toolId === 'organize-pdf') {
    if (!Array.isArray(plan) || !plan.length || plan.some(p => !p || !validIndex(p.index) || ![0, 90, 180, 270].includes(p.rotation))) fail('INVALID_INPUT', 'Selecciona páginas y giros válidos.');
    if (plan.length > limits.maxPages) fail('LIMIT_EXCEEDED', 'Demasiadas páginas de salida.');
    plan = plan.map(({ index, rotation }) => ({ index, rotation }));
  } else if (toolId === 'split-pdf') {
    if (!Array.isArray(plan) || !plan.length || plan.some(g => !Array.isArray(g) || !g.length || g.some(i => !validIndex(i)) || new Set(g).size !== g.length)) fail('INVALID_INPUT', 'Cada salida necesita un rango válido, sin repetir páginas dentro del mismo rango.');
    if (plan.length > limits.maxOutputs || plan.reduce((n, g) => n + g.length, 0) > limits.maxPages) fail('LIMIT_EXCEEDED', 'Demasiadas salidas o páginas.');
    plan = plan.map(g => [...g]);
  }
  return { toolId, inputs, plan, limits, inputBytes };
}

// UI uses human (1-based) page numbers. Semicolon separates output documents.
export function parseRanges(value, count) {
  if (typeof value !== 'string' || value.length > 4000 || !Number.isSafeInteger(count) || count < 1 || count > LIMITS.maxPages) fail('INVALID_INPUT', 'Rangos no válidos.');
  const groups = value.split(';').map(group => {
    const pages = [];
    for (const token of group.split(',')) {
      const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(token);
      if (!match) fail('INVALID_INPUT', 'Usa rangos como 1-3; 4-6 o 1,3; 2,4.');
      const start = Number(match[1]), end = Number(match[2] ?? match[1]);
      if (start < 1 || end < start || end > count) fail('INVALID_INPUT', 'El rango queda fuera del documento.');
      for (let n = start; n <= end; n++) pages.push(n - 1);
    }
    if (new Set(pages).size !== pages.length) fail('INVALID_INPUT', 'Hay páginas repetidas dentro de una salida.');
    return pages;
  });
  if (groups.length > LIMITS.maxOutputs || groups.reduce((n, g) => n + g.length, 0) > LIMITS.maxPages) fail('LIMIT_EXCEEDED', 'Demasiadas salidas o páginas.');
  return groups;
}
