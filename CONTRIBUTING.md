# Contributing to ZU Tools

Thank you for helping build private, local-first browser utilities.

## Before opening an issue

- Search existing issues and discussions.
- Use a minimal reproduction for bugs.
- Never attach private, personal or confidential files to a public issue.
- Report security vulnerabilities through the private process in
  [`SECURITY.md`](SECURITY.md).

## Local setup

Requirements: Node.js 22 or 24 and npm.

```bash
git clone https://github.com/usezutools/zutools.git
cd zutools
npm ci
npm test
```

Run the permanent consumers with:

```bash
npm run example:vanilla
npm run example:react
```

## Adding a tool

Implement tools vertically:

1. Review maintained alternatives and all direct and transitive licenses.
2. Prefer a browser standard or a maintained permissive dependency over copying
   third-party source.
3. Add a framework-independent engine and declarations to `@zutools/core`.
4. Add unit tests, including malformed and Unicode input where relevant.
5. Add the optional React interface and catalogue registration.
6. Export the tool through its own Core and React entries.
7. Test the generated tarballs and measure bundle impact.
8. Document privacy boundaries, limits and possible fidelity loss.

Code under AGPL, GPL or another copyleft license must not be introduced without
an explicit project-level license review.

## Required checks

```bash
npm test
npm run validate
npm run licenses:check
npm run test:tarballs
npm run examples:test
npm run measure:tree-shaking
```

If a bundle increase is intentional, explain it in the pull request before
running `npm run measure:tree-shaking:update`.

## Pull requests

- Keep each change focused.
- Add tests for behaviour changes.
- Update public documentation when the API changes.
- Do not commit `dist/`, tarballs, `node_modules` or private product strategy.
- Confirm that local transformations do not make network requests.

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE).
