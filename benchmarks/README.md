# Bundle measurements

`tree-shaking.json` is generated from the actual npm tarballs, installed in a
temporary consumer outside the monorepo. React, React DOM, Lucide and Core are
externalized equally in both React measurements so the comparison only covers
the ZU Tools code requested by each entry.

Check the current packages against the committed baseline with:

```bash
npm run measure:tree-shaking
```

The command fails if the individual Word Counter JavaScript or CSS stops being
smaller than the complete Free portal, or if any measured gzip bundle grows by
more than 5% plus a 64-byte tolerance.

After reviewing and accepting an intentional size increase, regenerate the
baseline explicitly with:

```bash
npm run measure:tree-shaking:update
```
