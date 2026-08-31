import { compareText } from '@zutools/core/text-diff';

self.addEventListener('message', ({ data }) => {
  const { id, before, after, options } = data;
  try {
    self.postMessage({ id, result: compareText(before, after, options) });
  } catch (error) {
    self.postMessage({
      id,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        code: error?.code,
      },
    });
  }
});
