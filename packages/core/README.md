# `@zutools/core`

Framework-independent, local-first engines from
[ZU Tools](https://github.com/usezutools/zutools#readme).
Use them from JavaScript, TypeScript, Angular, Vue, Svelte, React, Web Workers or
any ESM-compatible bundler.

## Install

```bash
npm install @zutools/core
```

## Use one capability

```js
import { csvToObjects, objectsToCsv } from '@zutools/core/csv';
import { utf8ToBase64 } from '@zutools/core/base64';
import { timestampToDate } from '@zutools/core/timestamp';
import { analyzeText } from '@zutools/core/word-counter';
```

All functions can also be imported from `@zutools/core`, but capability entries
make the engine in use explicit and give bundlers the smallest possible input.

## Entries

| Entry | Contents |
|---|---|
| `@zutools/core/base64` | Text, bytes, `ArrayBuffer`, Base64 and Data URIs |
| `@zutools/core/csv` | CSV ↔ JavaScript objects |
| `@zutools/core/json` | JSON parsing, validation, formatting and minification |
| `@zutools/core/text` | Case and naming-style transformations |
| `@zutools/core/timestamp` | Unix timestamps and JavaScript dates |
| `@zutools/core/word-counter` | Words, graphemes, sentences, paragraphs and reading time |
| `@zutools/core/image` | Browser image loading, Canvas and `Blob` output |
| `@zutools/core/image-metadata` | Local EXIF, PNG and WebP metadata reading |
| `@zutools/core/catalog` | Typed catalogue, selectors and validation |
| `@zutools/core/catalog.json` | Raw catalogue JSON without executing JavaScript |

## Runtime behaviour

- No React or UI dependency.
- No runtime package dependencies.
- No network requests or uploads.
- ESM with TypeScript declarations and source maps.
- Text and data engines can run outside the browser.
- Image helpers use browser APIs such as Canvas and DOM image types.

Only compiled files from `dist/` are included in the npm tarball. Treat the
declared package `exports` as the public API.

## Development

From the monorepo root:

```bash
npm run build --workspace=@zutools/core
npm run test --workspace=@zutools/core
npm run validate:catalog --workspace=@zutools/core
```

See the [repository documentation](https://github.com/usezutools/zutools#readme)
for Angular examples, tarball testing, bundle measurements and the complete
development workflow.

## License

[MIT](LICENSE).

## PDF beta

Import `createPdfToolsClient` from `@zutools/core/pdf`. The PDF worker is separate
from the main bundle, runs locally and verifies results before returning them.
