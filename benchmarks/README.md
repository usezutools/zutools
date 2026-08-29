# Bundle measurements

`tree-shaking.json` is generated from the actual npm tarballs, installed in a
temporary consumer outside the monorepo. React, React DOM, Lucide and Core are
externalized equally in both React measurements so the comparison only covers
the ZU Tools code requested by each entry.

Regenerate the baseline with:

```bash
npm run measure:tree-shaking
```

The command fails if the individual Word Counter JavaScript or CSS stops being
smaller than the complete Free portal.
