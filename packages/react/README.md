# `@zutools/react`

Ready-made local-first React interfaces from
[ZU Tools](https://github.com/usezutools/zutools#readme). Files and text are
processed on the user's device and are not uploaded by the library.

## Requirements

- React 18.2 or newer.
- React DOM 18.2 or newer.
- `lucide-react` 0.400 or newer.
- `@zutools/core` 0.1.0.

## Install

```bash
npm install @zutools/core @zutools/react lucide-react
```

## Use one tool

Import the individual component and stylesheet to avoid loading the catalogue
or the complete portal registry:

```jsx
import { WordCounter } from '@zutools/react/word-counter';
import '@zutools/react/word-counter.css';

export function TextMetrics() {
  return <WordCounter language="en" />;
}
```

## Embed the complete catalogue

```jsx
import {
  ToolsPortal,
  portalCatalog,
  portalRegistry,
} from '@zutools/react/portal';
import '@zutools/react/styles.css';

export function ToolsPage() {
  return (
    <ToolsPortal
      language="en"
      catalog={portalCatalog}
      registry={portalRegistry}
    />
  );
}
```

`portalCatalog` contains only tools with executable implementations. The
complete source catalogue comes from `@zutools/core/catalog`.

## Style imports

| Import | Contents |
|---|---|
| `@zutools/react/styles.css` | Catalogue shell and every tool workspace |
| `@zutools/react/workspace.css` | Implementations without the catalogue shell |
| `@zutools/react/word-counter.css` | Isolated Word Counter styles |

The package uses plain CSS. Override `--zutools-text`, `--zutools-muted` and
`--zutools-accent` on the portal root to match your application.

## Package behaviour

- `@zutools/react` delegates transformations to `@zutools/core`.
- React, React DOM and Lucide are peer dependencies, not bundled copies.
- CSS is exported separately.
- The package contains compiled ESM, declarations and source maps from `dist/`.
- Source JSX is not part of the published contract.

## Development

From the monorepo root:

```bash
npm run build --workspace=@zutools/react
npm run test --workspace=@zutools/react
npm run test:tarballs
npm run measure:tree-shaking
```

See the [repository documentation](https://github.com/usezutools/zutools#readme)
for the full portal API, theming, architecture and consumer examples.

## License

[MIT](LICENSE) for ZU Tools original code. Dependencies retain their own
licenses.
