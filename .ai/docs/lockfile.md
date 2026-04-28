# npm Lockfile Investigation

- npm package-lock v3 can represent nested installs. Its `packages` object is
  keyed by package locations relative to the project root, so entries such as
  `node_modules/foo/node_modules/baz` are valid.
- npm's installer logic is in Arborist. In the installed npm CLI here,
  `@npmcli/arborist@9.3.1` uses:
  - `lib/place-dep.js`: starts at the dependent, walks ancestors, and keeps the
    highest viable placement until a conflict blocks hoisting.
  - `lib/can-place-dep.js`: decides `OK`, `KEEP`, `REPLACE`, or `CONFLICT`,
    including peer dependency constraints.
  - `lib/deepest-nesting-target.js`: finds the lowest legal target when a
    dependency cannot be placed above a peer edge.
  - `lib/shrinkwrap.js`: serializes the tree back into
    `packages[relative node_modules path]`.
- I did not add Arborist as a runtime dependency. It builds npm ideal trees from
  npm metadata and reifies installs; this exporter already has exact pnpm
  snapshot keys and needs an offline conversion. The implementation mirrors the
  relevant placement rule instead.

## Primary References

- npm docs:
  https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/#packages
- Local npm source inspected:
  - `/usr/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/place-dep.js`
  - `/usr/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/can-place-dep.js`
  - `/usr/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/deepest-nesting-target.js`
  - `/usr/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/shrinkwrap.js`
