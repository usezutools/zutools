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

## Bootstrap release `0.1.0`

npm only allows Trusted Publishing to be configured after a package exists.
The first release therefore needs a one-time granular npm token:

1. Create a short-lived granular token that can create and publish public
   packages in the `@zutools` organization and can bypass 2FA for automation.
2. Store it as the `NPM_TOKEN` secret on the `npm-production` GitHub environment.
3. Run **Release packages** manually for `0.1.0` and approve the environment.
4. Verify both npm packages and the GitHub release before continuing.

The workflow can resume a partial first release: if Core exists but React does
not, a reviewed rerun skips Core and publishes React. It refuses to run if both
versions already exist.

## Move to Trusted Publishing immediately afterwards

Configure a trusted GitHub Actions publisher in the settings of both npm
packages using exactly:

| Field | Value |
|---|---|
| Organization | `usezutools` |
| Repository | `zutools` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

Then:

1. Remove the `NPM_TOKEN` environment secret.
2. Restrict traditional token publishing in each npm package's settings.
3. Keep `id-token: write` on the release workflow.

Future releases will authenticate through short-lived OIDC credentials and npm
will generate provenance automatically. The explicit `--provenance` flag is
retained so the intended supply-chain contract remains visible in the workflow.

## Dry run versus release

| Command | Changes npm or GitHub? | Purpose |
|---|---:|---|
| `npm run publish:dry-run` | No | Inspect both packages locally |
| `npm run release:check` | No | Validate metadata and version alignment |
| GitHub **Release packages** workflow | **Yes** | Publish packages, tag and release |
