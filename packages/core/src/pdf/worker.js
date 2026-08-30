import { runTool } from './engine.js';
import { zipSync } from 'fflate';
let networkAttempts = 0;
const deny = () => { networkAttempts++; throw new Error('No network in PDF worker.'); };
for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'Worker']) {
  Object.defineProperty(self, key, { value: deny, writable: false, configurable: false });
}
let busy = false;
self.onmessage = async ({ data }) => {
  if (busy || data?.type !== 'run') return; busy = true;
  try {
    const result = await runTool(data.toolId, data.inputs, data.plan, {
      limits: data.limits, accessibility: data.accessibility, onProgress: progress => self.postMessage({ type: 'progress', progress }),
    });
    if (data.toolId === 'split-pdf') {
      result.archive = zipSync(Object.fromEntries(result.outputs.map(o => [o.name, o.bytes])), { level: 0 });
    }
    const transfer = (result.outputs ?? []).map(o => o.bytes.buffer);
    if (result.archive) transfer.push(result.archive.buffer);
    self.postMessage({ type: 'result', result: { ...result, networkAttempts } }, transfer);
  } catch (error) {
    self.postMessage({ type: 'error', code: error.code || 'INVALID_PDF', message: error.message });
  }
};
self.postMessage({ type: 'ready' });
