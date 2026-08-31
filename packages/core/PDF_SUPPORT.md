# PDF tools - beta

> Internal engineering documentation. Library selection, versions, adaptations
> and capability boundaries from this document must not be reused in public UI,
> product help, user-facing errors or marketing copy. Baseline operations do not
> expose structure diagnostics or request preservation consent. Mandatory
> dependency and license notices remain complete.

Reviewed 2026-08-30. `merge-pdf`, `organize-pdf` and `split-pdf` are local,
bounded adapters over `@libpdf/core@0.4.1`. LibPDF parses, copies, extracts,
reorders and serializes the documents. ZU Tools does not maintain a second PDF
object copier or an allowlist of accepted catalog structures.

The integration rule is to exhaust LibPDF's documented public high-level APIs
before adding any lower-level behavior. ZU Tools does not implement around an
assumed limitation: a workaround is considered only after a bug or missing
capability is reproduced on the pinned version. It must then remain narrow,
documented, regression-tested and removable when upstream behavior improves.

LibPDF is not assumed to be the best engine for every future PDF operation. If
its current release cannot preserve the structures required by a specific use
case, the next step is to evaluate other maintained libraries through their own
public high-level APIs. Candidates must be tested with the same real PDFs and
reviewed for preservation, browser support, bundle cost, maintenance and license
compatibility. A compatible library may be selected for that operation rather
than recreating its PDF logic inside ZU Tools.

## Product behavior

- Inputs never leave the browser and are never modified.
- Merge empties document Info/XMP metadata without displaying a metadata
  warning. Page content, annotations and visible personal information are not
  metadata sanitization targets.
- A whole-document merge or page permutation keeps the first/source catalog and
  delegates its preservation to LibPDF. This includes structures unknown to the
  adapter.
- Excluding or duplicating pages and producing multiple split parts uses
  LibPDF's native `extractPages()` operation. It creates independent documents,
  so document-level structures that LibPDF does not carry are recorded only in
  result diagnostics instead of being reimplemented or preemptively rejected.
- Signed documents are not rewritten because any rewrite invalidates the
  existing signature. Encrypted documents without usable credentials are
  rejected by LibPDF.

## Accessibility tags

Whole-document operations preserve accessibility structures natively. This
includes a one-file merge, a permutation containing every
page exactly once, and a one-part split containing every page exactly once.

When an operation genuinely extracts pages, LibPDF creates a new document with
`includeStructure: false`. The adapter continues automatically and does not
manually edit `StructTreeRoot`, `MarkInfo`, `StructParents` or related objects.
The omission remains an internal result diagnostic and is not shown in the
baseline UI.

When merging several files, LibPDF preserves the first document catalog but does
not merge document-level structure roots from later inputs. The operation still
continues without a blocking confirmation.

## Native preservation and known upstream boundaries

Page content streams, fonts, images, resources, annotations and page geometry
are handled by LibPDF. Its whole-document path also preserves catalog structures
such as bookmarks, forms, page labels, optional content, attachments, actions,
XFA and producer-specific extensions when LibPDF can serialize them.

Native page extraction and copying can omit document-level roots while retaining
page-level references. Current examples include outlines, AcroForm roots and
named-destination name trees. ZU Tools does not reconstruct these graphs. It
allows LibPDF to produce the document and returns
`DOCUMENT_STRUCTURES_OMITTED_BY_NATIVE_EXTRACTION` or
`DOCUMENT_STRUCTURES_FROM_ADDITIONAL_INPUTS_OMITTED` as internal diagnostics.

LibPDF recovery warnings are accepted and surfaced as
`SOURCE_RECOVERED`; an imperfect cross-reference table is not rejected
before the official parser gets a chance to recover it.

## API and deployment

```js
import { createPdfToolsClient, parsePdfRanges } from '@zutools/core/pdf';

const client = createPdfToolsClient();
try {
  const inspection = await client.inspect(firstBytes);
  const merged = await client.mergePdf([firstBytes, secondBytes]);
  const parts = await client.splitPdf(
    firstBytes,
    parsePdfRanges('1,3; 2', inspection.pageCount),
  );
} finally {
  client.dispose();
}
```

Core page indices are zero-based; UI ranges are one-based. Job options accept
`signal`, `onProgress`, `timeoutMs` and lower limits. One job runs per client.

Browsers must support module workers, Web Crypto and modern ES modules. Default
workers resolve relative to their package entry points; custom `workerUrl` and
`previewWorkerUrl` values are available for other deployments. Processing and
previewing use local worker assets only. There are no uploads, telemetry calls
or document-processing endpoints.

Default bounds are 16 MiB total input, 50 inputs, 200 output pages, 50 output
files, 32 MiB combined PDF output and a 30-second job timeout. They are product
resource limits, not PDF-format compatibility checks.

## Dependency adaptations

Production uses only `@libpdf/core@0.4.1` as its PDF editing engine. Three narrow,
version-pinned compatibility adaptations remain and are covered by regression
tests:

1. Before `copyPagesFrom()`, the adapter materializes the four inheritable page
   values (`Resources`, `MediaBox`, `CropBox`, `Rotate`) because 0.4.1 remaps an
   inherited value twice when copying between documents. It does not interpret
   or copy arbitrary structures.
2. The build replaces 0.4.1's five-decimal numeric serializer with a finite
   decimal formatter so page geometry is not rounded during output. The source
   hash is pinned and a mismatch fails the build.
3. Metadata dictionaries/streams are emptied in place instead of deleting their
   indirect objects. In 0.4.1, deleting object 1 can cause unrelated references
   to be remapped incorrectly during garbage collection.

Both adaptations must be removed when an upstream version fixes the corresponding
behavior and passes the real-document regression suite. `pdfjs-dist@6.3.289`
renders previews and `fflate@0.8.2` writes ZIP files. `pdf-lib` is used only for
test fixtures and independent test assertions, not in production processing.
Dependency and asset notices ship in `dist/licenses/PDF-NOTICES.txt`.

## Verification

Every result is saved by LibPDF, loaded again by LibPDF and checked for expected
page count, dimensions and rotations before delivery. This is an output sanity
check, not a second PDF validator or an accessibility audit.

Automated coverage includes metadata policy, native catalog preservation,
accessibility behavior, recovered inputs, unknown structures, inherited page
values, numeric precision, ranges, limits, worker lifecycle, thumbnails,
downloads, ZIP output and the no-network boundary. The maintained manual matrix
and remaining work are in the repository [roadmap](../../ROADMAP.md).

```sh
npm test
npm run test:tarballs
npm run examples:test
npm run test:pdf:browser
npm run licenses:check
npm run public-boundary:check
npm run measure:tree-shaking
```
