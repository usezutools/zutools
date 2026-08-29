# Releasing ZU Tools

Publishing is deliberately manual. The release workflow validates, publishes
Core before React, creates provenance and then creates the matching GitHub tag
and release.

> [!CAUTION]
> An npm package name and version cannot be reused after publication. Never run
> the release workflow as a test; use the dry run below.

## Release preparation

1. Confirm CI is green on `main`.
2. Set the same stable SemVer version in the root, Core and React
   `package.json` files.
3. Keep `@zutools/react` pinned to the matching `@zutools/core` version.
4. Move relevant notes from `Unreleased` into the version section.
5. Replace `Unreleased` after the version heading with the ISO release date.
6. Run:

   ```bash
   npm ci
   npm run publish:dry-run
   ```

7. Commit and push the release preparation. Wait for CI to pass again.

## Protect the GitHub workflow

Create a GitHub environment named `npm-production` under **Settings →
Environments** and add a required reviewer. The workflow will not publish until
that environment approval is granted.

The workflow must be run from `main` with:

- the exact package version;
- confirmation set to `publish`.

## Authentication and npm protection

Both packages use npm Trusted Publishing with the following GitHub Actions
identity:

| Field | Value |
|---|---|
| Organization | `usezutools` |
| Repository | `zutools` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

The `npm-production` environment has no npm token. Traditional token publishing
is disabled for Core and React. The workflow authenticates through a short-lived
OIDC credential created for the reviewed run, and `id-token: write` must remain
enabled.

npm generates provenance automatically for Trusted Publishing. The explicit
`--provenance` flag remains in the workflow so the intended supply-chain
contract is visible.

## Partial release recovery

The workflow publishes Core before React. If Core succeeds but React fails, a
reviewed rerun of the same version skips Core and retries React. It refuses to
run when both package versions already exist. Do not publish manually or change
the version while investigating a partial release.

## Dry run versus release

| Command | Changes npm or GitHub? | Purpose |
|---|---:|---|
| `npm run publish:dry-run` | No | Inspect both packages locally |
| `npm run release:check` | No | Validate metadata and version alignment |
| GitHub **Release packages** workflow | **Yes** | Publish packages, tag and release |
