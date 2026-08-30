# Roadmap

This roadmap is the ordered checklist for the PDF tools. Completed behavior stays
covered by automated tests; pending items are not implied to be supported.

## Standing architecture rule

- Always try the documented public high-level APIs of third-party libraries
  before adding lower-level integration code or implementing equivalent logic.
- Do not preemptively compensate for hypothetical library limitations.
- When a bug or missing capability is reproducible, evaluate the smallest viable
  response: upstream upgrade, a different compatible library with a stronger
  native API for that use case, upstream report, documented wrapper workaround
  or, only when justified, a narrowly scoped patch.
- Library choice is per capability, not permanent for the entire file format.
  Compare candidates with the same real fixtures and verify output quality,
  browser compatibility, bundle impact, maintenance and license compatibility.
- Every workaround needs a regression test, an explanation of the observed
  upstream behavior and an explicit removal condition.
- Library identities, versions, implementation choices and vendor-specific
  limitations belong only in internal engineering documentation. Public UI,
  help text, errors, warnings and API-visible status values must describe the
  user-visible outcome and any required decision without naming a library or
  exposing its internal capability boundary.
- Do not hide a material loss from the user: explain exactly which document
  behavior may change and request consent when needed, but keep the technical
  cause and library comparison internal.
- Dependency manifests and mandatory third-party license notices are exempt from
  this product-copy rule and must remain complete and legally accurate.

## 1. Native wrapper baseline - complete

- Merge, organize and split through `@libpdf/core` in a local worker.
- Preserve the whole source/first document catalog when the native operation can.
- Remove the former catalog allowlist and custom PDF graph copier.
- Leave merge document Info/XMP blank without a metadata warning, preserving
  their indirect object slots to avoid an upstream reference-remapping defect.
- Accept LibPDF recovery and producer-specific structures when it can process them.
- Preserve tagged whole-document operations; request confirmation only when a
  native extraction will omit accessibility structure.
- Verify the three maintained real-world regression PDFs.

## 2. Packaging and browser confidence - complete

- Separate editing and preview workers.
- Local thumbnails, downloads and ZIP output with no document upload.
- Installed-tarball consumer builds.
- Chromium, Firefox, WebKit and mobile-viewport browser runs.
- License notices, public-boundary scan and bundle-size baselines.

## 3. Upstream compatibility follow-up - next

- Re-test each `@libpdf/core` release against the real-document corpus.
- Re-evaluate workarounds only after exercising the new release's high-level API;
  do not carry them forward automatically.
- Remove the inherited-page shim when upstream copying no longer double-remaps
  inherited attributes.
- Remove the numeric serializer patch when upstream preserves geometry precision.
- Track native preservation of AcroForm roots, named destinations, outlines and
  tagged structures across copied/extracted pages.
- If the current LibPDF release still cannot preserve a required structure,
  evaluate maintained PDF libraries that expose that operation through a public
  high-level API and have licenses compatible with this repository and its npm
  distribution. Record the comparison before choosing or rejecting a candidate.
- Replace warnings with native preservation automatically as upstream adds it;
  do not build a parallel PDF engine.

## 4. Lite - structure-preserving PDF operations

This is internal planning. Lite must not be mentioned by the current public PDF
tools until the edition is launched. The baseline tools may continue with a
clear, outcome-based warning when a global document structure cannot be carried
into the result; public copy must not identify the underlying library or reason.

### Candidate Lite capabilities

- Preserve and remap usable bookmarks/outlines when pages are merged, extracted,
  duplicated, removed or reordered. Drop only bookmarks whose targets no longer
  exist, and report their exact count.
- Preserve named destinations, destination name trees, article threads and
  document indexes whose targets remain in the output.
- Preserve or rebuild page-label ranges so logical page numbers still match the
  resulting physical page order.
- Preserve document language and `ViewerPreferences.DisplayDocTitle` when there
  is one unambiguous source value. Define an explicit conflict policy for merges
  instead of silently selecting a value.
- Preserve AcroForm roots and field/widget relationships, attachments, optional
  content/layers and other document-level roots when their referenced objects
  survive the operation.
- Preserve tagged-PDF accessibility across extraction and duplication. For
  multi-document merge, combine each source under one valid `StructTreeRoot` and
  remap `ParentTree`, `StructParents`, MCIDs, annotation `StructParent` values,
  IDs, roles, classes, namespaces and page references.
- Offer a preflight report showing what the selected operation can preserve,
  omit or resolve before processing, plus an output audit afterward.
- Keep the existing policy that document Info/XMP metadata is blanked silently;
  language, page labels, bookmarks and accessibility structure are functional
  document data and must not be treated as disposable metadata.

### Proposed solution order

1. Test the latest maintained LibPDF release through its public high-level APIs
   (`PDF.merge`, `copyPagesFrom`, `extractPages` and their documented options)
   against the real-document corpus. `@libpdf/core@0.4.1` can retain the first
   document catalog and can copy page structure references, but its native merge
   and extraction paths do not currently combine or rebuild all global roots.
2. If a capability is still missing, document a minimal reproduction and check
   for an upstream fix or enhancement before adding local PDF graph logic.
3. Evaluate maintained alternative libraries for each missing operation using
   only their supported native APIs. Compare preservation results, browser-only
   execution, bundle size, performance, maintenance, security and license/npm
   distribution compatibility. A different engine may be chosen per operation.
4. Prefer a native operation-specific engine or an upstream contribution. Build
   a narrow local adapter only if no compatible library can satisfy the tested
   requirement, and keep it replaceable and covered by real-PDF regressions.

### Lite release gates

- The three current real PDFs plus tagged, bookmarked, labelled, form, layered
  and mixed-language fixtures pass semantic before/after comparisons.
- Pages, geometry, content, links and annotations remain correct in Chromium,
  Firefox and WebKit, and outputs open in at least two independent PDF viewers.
- Bookmark destinations, logical page labels, form fields and accessibility
  navigation are tested functionally, not merely by checking that catalog keys
  exist.
- Every unavoidable omission is specific, counted where possible and confirmed
  by the user before processing; no generic claim says that bookmarks or
  accessibility were preserved when they were not.
- The selected libraries and licenses pass the repository's notices, boundary
  and bundle checks. No Lite name or promise leaks into the baseline public UI.

## 5. Product hardening - planned

- Expand the producer corpus across office suites, scanners, design tools,
  browsers, mobile apps, forms, annotations and repaired PDFs.
- Add explicit encrypted-document credential support if LibPDF exposes a stable
  browser API for it.
- Add signature-aware workflows only if outputs can communicate signature status
  without implying the rewritten file remains signed.
- Run accessibility review with assistive-technology users for tagged-source
  messaging and extraction consent.

## Human acceptance checklist

Before a PDF release, a human should confirm:

1. Open each maintained real PDF in all three tools and check that thumbnails
   match the source page orientation and order.
2. Download a one-file merge and a full-page reorder; compare several pages at
   high zoom and confirm links/bookmarks/forms that exist in the source still work.
3. For a tagged PDF, confirm whole-document operations do not ask to remove tags.
4. Split a tagged multi-page PDF; confirm consent appears only after the ranges
   exclude pages or create multiple parts, and that the warning appears afterward.
5. Open every downloaded PDF in at least two independent viewers and confirm page
   count, order, rotation, searchable text and printing.
6. Confirm merge metadata fields are blank and no metadata warning is shown.
7. Confirm cancelling, clearing and replacing a failed file leaves no stale
   result or disabled controls.
