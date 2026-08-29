# Third-party notices

ZU Tools original source code is licensed under MIT. The current published
package builds do not embed copies of React, React DOM, Lucide or
`@zutools/core`; these remain external dependencies or peer dependencies.

Direct dependencies used to build, test or consume the repository currently
declare the following permissive licenses:

| Project | Role | License |
|---|---|---|
| React and React DOM | React peer dependencies and test consumers | MIT |
| Lucide React | Icon peer dependency | ISC |
| esbuild | Library build and bundle measurement | MIT |
| TypeScript | Declaration generation and consumer validation | Apache-2.0 |
| Vite | Runnable example development and builds | MIT |
| React type declarations | Development and consumer validation | MIT |

Each dependency retains its own copyright and license terms. The authoritative
license text is distributed by its package and linked from its registry entry.

`npm run licenses:check` validates the locked repository dependency tree against
the currently approved permissive SPDX identifiers. Any new identifier requires
manual review before it can enter the release process.
