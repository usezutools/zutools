# React example

This example installs the generated `@zutools/core` and `@zutools/react`
tarballs. It demonstrates:

- the isolated Word Counter export;
- the complete catalogue;
- separate stylesheet imports;
- ES/EN interface selection;
- CSS custom-property theming;
- lazy-loaded JavaScript and CSS entries;
- `requestedToolId`, `onToolOpen` and `onToolClose` integration.

From the repository root:

```bash
npm run example:react
```

The initial command prepares the consumer tarballs once. Afterwards, edits to
`examples/react/src` or `packages/react/tools` update in the open browser via
Vite HMR; do not stop or restart the server. Production builds and automated
example checks still resolve the installed tarballs.

Run `npm run examples:test` to build both permanent examples non-interactively.
