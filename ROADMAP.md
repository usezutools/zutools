# Roadmap

This public roadmap records completed engineering milestones and the quality
rules applied to work that has been approved for implementation. Product
research, candidate tools, commercial planning and internal dependency decisions
are maintained outside the public repository.

## Engineering principles

- Process supported files and data on the user's device.
- Keep transformation engines independent from React and presentation code.
- Provide individual package exports so consumers load only the tool they use.
- Prefer maintained, documented high-level APIs over reimplementing third-party
  behavior.
- Add narrowly scoped adaptations only for reproduced defects, cover them with a
  regression test and document when they can be removed.
- Evaluate dependencies for maintenance, browser support, bundle impact,
  security and license compatibility before distribution.
- Preserve originals: tools create new downloadable results and do not rewrite
  source files in place.
- Describe user-visible outcomes without exposing private implementation details
  in product copy, errors or status messages.

## Package foundation - complete

- Framework-independent transformation APIs in `@zutools/core`.
- Optional React interfaces in `@zutools/react`.
- ESM builds, source maps, CSS, TypeScript declarations and per-tool exports.
- Installed-tarball tests against clean JavaScript and React consumers.
- Automated package-content, license, audit, public-boundary and bundle checks.
- Browser coverage across Chromium, Firefox, WebKit and a mobile viewport.

## Initial tool catalogue - complete

- Text, data, image conversion and metadata tools available through the shared
  catalogue and individual imports.
- Public catalogue limited to executable implementations.
- Local processing verified without transformation-time network requests.

## PDF tools - complete

- Independent Merge PDF, Organize PDF and Split PDF workflows.
- Local worker processing, previews, page selection and downloadable results.
- Reordering, rotation, duplication, removal and reusable output ranges.
- Recovery of supported real-world documents without blocking technical
  confirmations.
- Regression coverage for output naming, page membership, shared selections,
  range lifecycle and interaction state.
- Automated package and cross-browser tests plus human acceptance with the
  maintained real-document set.

## Ongoing maintenance

- Keep supported tools compatible with maintained browser versions.
- Re-run real-document and interaction regressions when dependencies change.
- Remove local adaptations when supported high-level APIs make them unnecessary.
- Keep standalone imports within reviewed bundle budgets.
- Expand keyboard, screen-reader and responsive-layout coverage alongside UI
  changes.
- Treat new tool implementation as a complete vertical: engine, individual
  export, interface, limits, tests, licenses, offline behavior and consumer
  validation.

## Release gates

A tool is public only when:

1. its engine and UI are implemented and documented;
2. unit, browser and installed-consumer tests pass;
3. transformations perform no unexpected network requests;
4. package contents, licenses and bundle budgets pass automated checks;
5. file-based workflows release temporary resources and recover cleanly from
   cancellation, replacement and errors;
6. material visual or document workflows receive human acceptance.
