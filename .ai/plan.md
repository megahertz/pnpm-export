# pnpm-export — Implementation Plan

> See [`init.md`](./init.md) for the original specification.

A CLI tool (and library) that exports a single package from a pnpm monorepo into
a self-contained directory whose `package.json` uses only npm-compatible
specifiers (`file:` for local workspace deps, concrete versions for `catalog:`
deps). Output is suitable for `npm install` and deployment to App Engine,
Docker, Lambda, etc.

`package-lock.json` is generated from `pnpm-lock.yaml` by default; pass
`--no-lockfile` to skip it.

---

## Phase 1 — Project scaffolding

- [x] Initialize repo: `package.json` with `name: "pnpm-export"`,
      `type: "module"`, `bin: { "pnpm-export": "./dist/cli.js" }`
- [x] Add `engines.node` field (Node 20+)
- [x] Set up TypeScript (`tsconfig.json`, strict mode, ESM, target ES2022)
- [x] Set up bundler: `tsdown`
- [x] Runtime deps:
  - [x] `yaml` — parse `pnpm-workspace.yaml` and `pnpm-lock.yaml`
  - [x] `tinyglobby` — match workspace globs
  - [x] `commander` — CLI parsing
  - [x] `ignore` — parse `.pnpmexportignore`
- [x] Dev deps: `vitest`, `@types/node`, `tsgo`, `tsdown`, `oxlint`, `oxfmt`
- [x] Use `tsgo` for both `npm run typecheck` and any TS handling in build
- [x] Add `.gitignore`, `LICENSE` (MIT), placeholder `README.md`
- [x] Add npm scripts: `build`, `start`, `test`, `typecheck`, `lint`, `check`,
      `prepublishOnly` (build + test)
- [x] Wire up shebang `#!/usr/bin/env node` in CLI entry

## Phase 2 — CLI surface

- [x] Define flags:
  - [x] `-C, --cwd <dir>` — source package directory (default cwd; resolved to
        absolute against invocation cwd)
  - [x] `-o, --output <dir>` — output directory (required)
  - [x] `-D, --dev-dependencies` — include workspace dev deps in closure
        (default: false). Non-workspace dev deps are always kept.
  - [x] `-P, --peer-dependencies` — follow `peerDependencies` workspace edges
        (default: true)
  - [x] `-O, --optional-dependencies` — follow `optionalDependencies` workspace
        edges (default: true)
  - [x] `--patch-dependencies <mode>` — `ignore` | `warning` | `try-replace`
        (default `try-replace`); see Phase 7
  - [x] `--clean` — wipe output dir contents before writing (default: false;
        otherwise error if non-empty)
  - [x] `--no-lockfile` — skip generated `package-lock.json`
  - [x] `--dry-run` — print planned actions, write nothing; usable as a
        pre-commit lint
  - [x] `-v, --verbose` — debug logging
  - [x] `--help`, `--version`
- [x] `--clean` semantics:
  - [x] Wipes the **contents** of the output dir, not the dir itself
  - [x] Refuses to clean a dir that doesn't look like a prior export (presence
        of `.git/`, `node_modules/`, or any `package.json` we didn't write —
        alternatively, recognizable marker file). Concrete marker: drop a
        `.pnpm-export-cleaned` zero-byte file when we clean; on subsequent runs,
        `--clean` proceeds only if that marker is present OR the dir is empty.
- [x] `--dry-run` output:
  - [x] Tree-style listing of files that would be written, grouped by package
  - [x] Summary footer: _"Would copy N packages, rewrite N manifests, emit N
        warnings."_
  - [x] Exit 0 if export would succeed, 1 if it would fail (e.g., catalog miss,
        missing required field)
- [x] Error message for non-empty output: _"Output directory `<output>` is
      non-empty. Re-run with `--clean` to wipe it, or pick a different output
      dir."_
- [x] Output dir validation:
  - [x] **Hard error** if output dir is inside source dir, equals source dir, or
        equals workspace root (recursive copy / corrupting input)
  - [x] **Hard error** if output dir is itself an existing workspace package
        (would shadow it)
  - [x] **Warn** if output dir is not yet a package but its path matches a
        workspace glob (post-export, pnpm will treat it as one)
  - [x] **Allow** otherwise (including dirs inside the workspace root that don't
        match any glob)
- [x] Exit codes: `0` success, `1` user error, `2` internal error

## Phase 3 — Workspace discovery

- [x] `findWorkspaceRoot(startDir)` — walk up from **`config.cwd`** until
      `pnpm-workspace.yaml` is found
- [x] Source dir does **not** need to be inside any `packages` glob — it can be
      the workspace root, a tools dir, etc. The glob registry only governs which
      packages can be _targets_ of `workspace:` resolutions.
- [x] Edge cases (all hard errors, exit 1, with explicit messages):
  - [x] No `pnpm-workspace.yaml` found anywhere → _"No pnpm-workspace.yaml found
        in `<cwd>` or any parent. pnpm-export only supports pnpm workspaces. For
        a single-package project, use `npm pack` instead."_
  - [x] `<cwd>/package.json` missing → _"`<cwd>/package.json` not found. --cwd
        must point to a directory containing a package.json."_
  - [x] Source `package.json` has no `name` field → _"Source package at `<cwd>`
        has no `name` field; pnpm-export requires a name."_
  - [x] Resolved source dir is outside the discovered workspace root → _"Source
        dir `<source>` is not inside workspace `<root>`."_
  - [x] Two workspace packages with the same name → _"Duplicate workspace
        package name `<name>` at `<dir1>` and `<dir2>`."_
- [x] Parse `pnpm-workspace.yaml`:
  - [x] `packages: string[]` (glob patterns)
  - [x] `catalog: Record<string, string>` (default catalog)
  - [x] `catalogs: Record<string, Record<string, string>>` (named catalogs)
  - [x] `overrides`, `patchedDependencies` (handled per Phase 7)
- [x] Enumerate workspace packages via globs (skip `node_modules`)
- [x] For each match, read its `package.json` and build a registry:
  - `Map<packageName, { dir: absolutePath, manifest: PackageJsonData }>`

## Phase 4 — Dependency graph resolution

- [x] `resolveWorkspaceClosure(rootPkg, registry, flags)`:
  - [x] BFS/DFS over dep fields, uniformly recursive
  - [x] Edges followed:
    - [x] `dependencies` — always
    - [x] `peerDependencies` — when `flags.peerDependencies` (default true)
    - [x] `optionalDependencies` — when `flags.optionalDependencies` (default
          true)
    - [x] `devDependencies` — when `flags.devDependencies` (default false);
          applies to root and transitive workspace packages alike
  - [x] A dep is a workspace dep iff its specifier starts with `workspace:` AND
        its name exists in the registry
  - [x] Track visited set to handle cycles
  - [x] Return: ordered list of workspace packages to copy (root excluded from
        the "copied to output/packages/" set, but represented in
        `ExportedPackages.root`)
- [x] Edge cases:
  - [x] `workspace:^`, `workspace:~`, `workspace:1.2.3`, `workspace:*` — all
        treated as workspace refs
  - [x] Self-reference (a package lists itself as a workspace dep) → hard error
  - [x] Cycles between two packages in closure → both copied; their refs rewrite
        to relative `file:` paths normally

## Phase 5 — Catalog & specifier resolution

- [x] `resolveSpecifier(specifier, depName, ctx)` returns a concrete
      npm-compatible specifier:
  - [x] `workspace:*` / `workspace:^` / `workspace:~` / `workspace:^X.Y.Z` /
        `workspace:~X.Y.Z` / `workspace:X.Y.Z` →
    - [x] If dep is in workspace closure → rewrite to `file:` relative path
    - [x] If dep is a workspace package but excluded (e.g., `-P` off): use the
          `private:true` discriminator (Phase 7)
  - [x] `catalog:` → look up `depName` in default catalog
  - [x] `catalog:<name>` → look up `depName` in `catalogs[<name>]`
  - [x] Plain version range → pass through
  - [x] `npm:`, `git+`, `file:`, `link:`, `http(s):` — pass through unchanged
- [x] Catalog rules:
  - [x] Hard error on catalog miss (catalog name unknown OR dep not in catalog)
  - [x] Hard error if a catalog entry resolves to a `workspace:` value
        (degenerate)
  - [x] Hard error on catalog-of-catalog chains (`catalog:strict`'s entry is
        itself `catalog:`)
  - [x] Catalog resolution applies to **every** rewritten manifest (root + every
        copied workspace package)
  - [x] Warn-and-ignore per-package `pnpm.catalog` overrides (v1)
  - [x] Non-version catalog values (`git+`, `npm:`, etc.) pass through as-is
  - [x] Same dep with different catalog refs across closure → emit both
        literally; do not unify (v1)
- [x] Compute relative `file:` path using the **mangled directory name**:
  - [x] Root manifest → `file:./packages/<dirname>`
  - [x] Nested workspace pkg in `output/packages/foo` referencing `bar` →
        `file:../bar`
  - [x] Workspace pkg referencing the **root** → `file:../..`
  - [x] Scoped example: root referencing `@scope/foo` →
        `file:./packages/scope__foo`

## Phase 6 — Copy operations

- [x] `copyPackage(srcDir, destDir, ignoreRules)`:
  - [x] If `<srcDir>/.pnpmexportignore` exists, parse with `ignore` and use as
        the **only** exclusion list (replaces default — does not extend)
  - [x] Empty `.pnpmexportignore` ⇒ exclude nothing (everything copied)
  - [x] Otherwise apply default denylist:

    | Pattern                              | Excluded? | Reason                                 |
    | ------------------------------------ | --------- | -------------------------------------- |
    | `node_modules/`                      | yes       | regenerated by `npm install` in output |
    | `.git/`                              | yes       | huge, can leak history                 |
    | `.env`, `.env.*`                     | yes       | secrets                                |
    | `.DS_Store`, `Thumbs.db`             | yes       | OS noise                               |
    | `.turbo/`, `.cache/`, `.next/cache/` | yes       | tool caches                            |
    | `coverage/`, `.nyc_output/`          | yes       | test artifacts                         |
    | `dist/`, `build/`, `lib/`, `out/`    | **no**    | runtime targets                        |
    | `.npmrc`                             | no        | may carry registry config              |
    | `.gitignore`, `.gitattributes`       | no        | small, harmless                        |
    | `.vscode/`, `.idea/`                 | no        | small, harmless                        |

  - [x] `.pnpmexportignore` itself is always excluded (meta file)
  - [x] Use `fs.cp(..., { recursive: true })` so file modes (executable bits on
        `bin/`) are preserved
  - [x] Resolve symlinks (do not preserve symlink entries)

- [x] Source package honors its own `.pnpmexportignore` too (it's an exportable
      package).
- [x] Layout:
  - [x] Root pkg → `output/` (its files at top level)
  - [x] Each workspace dep → `output/packages/<dirname>/`
  - [x] Unscoped: `dirname` = package name unchanged
  - [x] Scoped `@scope/foo` → `scope__foo` (strip `@`, replace `/` with `__`);
        the package's `name` field stays `@scope/foo`
- [x] Post-copy build-output check:
  - [x] For each copied package, verify that paths from `main`, `module`, `bin`
        (string or object), and every target in `exports` exist in the output
  - [x] Warn (don't fail) per missing path: _"⚠ pnpm-export: <pkg> declares
        `<field>` → `<path>` but it does not exist in the output. Did you forget
        to build?"_
  - [x] For object-valued `bin`, warn per missing entry separately
  - [x] For `exports` with conditional fallthrough, warn on **any** missing path
        even if a sibling resolves
- [x] Idempotency: if `--clean`, wipe contents first (subject to safeguards in
      Phase 2); else assert empty (or marker-only)

## Phase 7 — package.json rewriting

- [x] `rewriteManifest(manifest, ctx)` applied uniformly to root + every copied
      workspace package.
- [x] Field-by-field policy (top-level):

  | Field                                                                                               | v1 behavior                                                                        |
  | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
  | `name`, `version`, `description`, `keywords`, `author`, `license`, `homepage`, `repository`, `bugs` | preserve                                                                           |
  | `type`, `main`, `module`, `exports`, `bin`, `files`                                                 | preserve                                                                           |
  | `scripts`                                                                                           | preserve, but strip any keys starting with `pnpm:`                                 |
  | `engines`                                                                                           | preserve                                                                           |
  | `private`                                                                                           | preserve                                                                           |
  | `volta`                                                                                             | preserve                                                                           |
  | `dependencies`, `peerDependencies`, `optionalDependencies`                                          | rewrite per closure rules                                                          |
  | `optionalDependenciesMeta`, `peerDependenciesMeta`                                                  | preserve unchanged                                                                 |
  | `devDependencies`                                                                                   | rewrite per closure rules; field always present (possibly empty)                   |
  | `workspaces`                                                                                        | strip                                                                              |
  | `pnpm`                                                                                              | strip after extracting `overrides` and `patchedDependencies`                       |
  | `packageManager`                                                                                    | strip                                                                              |
  | `publishConfig.directory`                                                                           | strip                                                                              |
  | `publishConfig.*` (other sub-keys)                                                                  | preserve                                                                           |
  | `overrides` (npm-style, if user has it)                                                             | preserve and merge with translated `pnpm.overrides`; on conflict, pnpm wins + warn |

- [x] Dep-rewrite rules per dep field (root + transitive):
  - [x] Workspace dep, in closure → `file:./packages/<dirname>` (or relative
        equivalent for nested manifests)
  - [x] Workspace dep, **not** in closure (because the dep field's flag is off):
    - [x] If target package is `private: true` → drop the entry
    - [x] Otherwise → rewrite `workspace:*` to the workspace package's manifest
          version, `workspace:^X.Y.Z` to `^X.Y.Z`, etc. (Hard error if
          version-resolve is needed but the target manifest has no `version`
          field.)
  - [x] `catalog:` → replace with concrete version per Phase 5
  - [x] Otherwise leave as-is
- [x] `pnpm.overrides` translation:
  - [x] Simple form `"foo": "version"` → npm `overrides.foo = "version"`
  - [x] pnpm-specific form `"foo>bar": "version"` → warn loudly, drop: _"⚠
        pnpm-export: pnpm.overrides has nested form `foo>bar` which has no
        direct npm equivalent — output may resolve different versions than your
        workspace. Pin manually or wait for v2."_
  - [x] On collision with existing top-level `overrides` key, pnpm value wins;
        emit one warning per conflicting key
- [x] `pnpm.patchedDependencies` per `--patch-dependencies` mode:
  - [x] `ignore` → strip silently
  - [x] `warning` → strip, emit one warning naming affected packages
  - [x] `try-replace` (default) →
    - [x] Copy referenced patch files from workspace-root `patches/` to
          `output/patches/`, renaming from pnpm format
          (`<name>@<version>.patch`) to patch-package format
          (`<name>+<version>.patch`)
    - [x] Add `patch-package` to `dependencies` of the output root (not
          `devDependencies` — production installs should still apply patches)
    - [x] Add `postinstall` script: if none exists,
          `"postinstall": "patch-package"`; if one exists, prepend:
          `"postinstall": "patch-package && <original>"`
    - [x] Emit one informational stderr line: _"Applied N patches via
          patch-package postinstall."_
- [x] JSON output formatting: 2-space indent, LF line endings, trailing newline
      (always — do not preserve source style)
- [x] Write rewritten manifests to:
  - [x] `output/package.json`
  - [x] `output/packages/<dirname>/package.json` for each copied workspace pkg

## Phase 8 — `package-lock.json` generation

- [x] Parse `pnpm-lock.yaml` (`lockfileVersion`, `packages`, `snapshots`,
      `importers`)
- [x] Build npm v3 lockfile (`lockfileVersion: 3`):
  - [x] `name`, `version` from root manifest
  - [x] `packages[""]` is the root
  - [x] `packages["node_modules/<name>"]` for local links and locked external
        deps with `version`, `resolved`, `integrity`, `dev`, `optional`
  - [x] `packages["packages/<name>"]` entries for workspace pkgs as `file:`
        resolved entries
- [x] `--no-lockfile` disables lockfile emission.
- [ ] Validate by running `npm install --package-lock-only --dry-run` in
      fixtures

## Phase 9 — Tests

- [x] **Fixtures (`test/fixtures/`)** — 12 minimal monorepos:

  | Fixture                    | Covers                                                                                     |
  | -------------------------- | ------------------------------------------------------------------------------------------ |
  | `basic-monorepo`           | the init.md example: `api → shared → lib`, default catalog `zod`                           |
  | `with-catalogs`            | named catalogs, per-package override (warned), catalog miss (negative)                     |
  | `cyclic`                   | `a ↔ b` cycle and self-reference (negative)                                                |
  | `scoped`                   | `@scope/foo` directory mangling                                                            |
  | `with-peer-deps`           | workspace dep referenced only via `peerDependencies`; non-workspace peers preserved        |
  | `with-optional-deps`       | workspace dep referenced only via `optionalDependencies` + `peerDependenciesMeta.optional` |
  | `with-overrides`           | `pnpm.overrides` simple form (translated) and `foo>bar` form (warned)                      |
  | `with-patches`             | `pnpm.patchedDependencies` × all three `--patch-dependencies` modes                        |
  | `with-pnpmexportignore`    | per-package `.pnpmexportignore` reset behavior                                             |
  | `private-vs-public`        | excluded workspace edge with `private: true` (drop) and unset (version-resolve)            |
  | `missing-build-output`     | `main` points at `dist/index.js` that doesn't exist → warning                              |
  | `source-is-workspace-root` | source dir = workspace root; closure resolves correctly                                    |

- [x] **Unit tests (`test/unit/`)** — pure-function modules:
  - [x] `findWorkspaceRoot`
  - [x] `parseWorkspaceYaml` (catalog + catalogs + overrides)
  - [x] `resolveWorkspaceClosure` (cycles, all flag combinations, transitive)
  - [x] `resolveSpecifier` (every branch)
  - [x] `rewriteManifest` (workspace + catalog + drop dev + private
        discriminator)
  - [x] Dirname mangler (`@scope/foo` → `scope__foo`)
  - [x] Relative-path computer (root, nested, root-back-reference)
- [x] **Integration tests (`test/integration/`)** — one file per fixture; run
      `exportPackage` into `os.tmpdir()`; snapshot output tree and manifest
      **content** (not bytes — assert on parsed JSON, so format tweaks don't
      break tests unrelated to content).
- [x] **Contract tests (`test/contract/`)** — verify that every documented
      public export from `index.ts` exists with the expected type/signature.
      Catches accidental API breakage.
- [ ] **`npm install` smoke test:**
  - [ ] Default: gated behind `RUN_NPM_INSTALL=1`
  - [ ] CI: forced on for `basic-monorepo` and `with-patches` only
  - [ ] Use `--ignore-scripts` except for `with-patches` (where postinstall must
        run)
  - [ ] After install, run `node -e "require('<pkg-name>')"` to catch broken
        `main`/`exports`
- [x] **CI matrix:** GitHub Actions, Linux + macOS

## Phase 10 — Documentation & release

- [x] `README.md` ordering:
  1. One-paragraph elevator pitch + copy-paste runnable example (init.md's
     example)
  2. _"vs `pnpm pack` / `pnpm deploy`"_ — most readers find us by searching for
     these
  3. Flag reference (autogenerated from `commander`'s help output in
     `prepublishOnly`)
  4. Recipes: Dockerfile, App Engine `app.yaml`, GitHub Actions
  5. Limitations — explicitly call out v1 gaps (`--build`, no Windows, no
     `files` field honored); each item links to its tracking issue
  6. Programmatic API — code example of the manual pipeline (see Architecture
     below)
  7. Contributing — link to `CONTRIBUTING.md`
- [x] `CHANGELOG.md` — hand-maintained, Keep a Changelog format
- [x] `LICENSE` — MIT
- [ ] Publish prep:
  - [x] `files` field in `package.json` ships only `dist/`, `README.md`,
        `LICENSE`
  - [x] `prepublishOnly` runs build + test
  - [ ] Manual `npm publish` (no changesets)
  - [x] Test global install via `npm pack` + install tarball locally before each
        publish
- [ ] Versioning:
  - [x] **0.x while v1 is in flight** — explicitly no semver guarantees; bump
        minor for any change. Document this in README.
  - [ ] **1.0.0 graduation criteria:** lockfile generation (Phase 8) done,
        Windows tested, smoke tests green for two consecutive weeks of nightly
        runs.
  - [x] After 1.0: classic semver. Public API = everything `index.ts` exports +
        the CLI flag set.

## Phase 11 — Future / nice-to-have

- [ ] Honor `files` field when copying (skip files not listed)
- [ ] Honor `.npmignore` / `.gitignore` in source package
- [ ] Translate the pnpm-specific `foo>bar` overrides form via npm's nested
      `overrides` syntax
- [ ] Apply `publishConfig` overrides (rewrite `name`/`version`)
- [ ] Per-package `pnpm.catalog` overrides (currently warned + ignored)
- [ ] Warn on cross-closure version-spec divergence (same dep, different catalog
      refs)
- [ ] Windows support

---

## Architecture

OOP for stateful objects (`Config`, `App`, and the entities `App` owns); plain
functions for stateless work (the operations, low-level utils). Operations are
the spine: each one is a function that accepts the single `app` instance, reads
what it needs, and writes its results back onto `app`. New features = new
operations + new fields on `App`.

### Module layout

```
src/
  index.ts                # public API surface — re-exports everything
  cli.ts                  # commander setup; builds Config + deps + App; runs ops
  exportPackage.ts        # convenience: exportPackage(opts): Promise<void>
  core/
    Config.ts             # Config class — built from cli opts/args, frozen
    App.ts                # App class — state container, owns everything
    Workspace.ts          # parsed pnpm-workspace.yaml + package registry
    WorkspacePackage.ts   # one workspace package (manifest + dir + dirname)
    ExportedPackages.ts   # set of workspace packages selected for export
    PackageJson.ts        # one rewritten package.json (in-memory before write)
    makeDependencies.ts   # factory: ({ config }) → { config, logger, ... }
    errors.ts             # UserError, InternalError
  operations/
    readWorkspace.ts      # populates app.workspace + app.sourcePackage
    resolveDependencies.ts# populates app.exported
    copyProjectFiles.ts   # copies files into app.config.output
    modifyPackageJson.ts  # rewrites + writes manifests; populates app.packageJsons
    makePackageLockFile.ts# Phase 8 — emits package-lock.json
  utils/
    fs.ts                 # copyDir, ensureDir, isEmptyDir, dir-marker helpers
    yaml.ts               # readYaml
    json.ts               # readJson, writeJson (2-space LF + trailing \n)
    paths.ts              # mangleDirname, relFile (relative file: specifier)
    glob.ts               # workspace glob matcher (tinyglobby wrapper)
    log.ts                # 4-method Logger (info/warn/error/debug)
    ignoreFile.ts         # parse `.pnpmexportignore` (`ignore` wrapper)
  types.ts                # PackageJsonData, WorkspaceYaml, PnpmLock, DepKind, ConfigOptions
test/
  fixtures/{...12 fixtures...}/
  unit/*.test.ts
  integration/*.test.ts
  contract/*.test.ts
```

### `Config` (src/core/Config.ts)

Frozen, immutable view of CLI inputs. Constructed in `cli.ts` (or by
`exportPackage`'s wrapper). All resolution (relative→absolute paths,
default→env-derived) happens in the constructor, then the instance is
`Object.freeze`d.

```ts
new Config({ options: cli.opts(), args: cli.args });
```

- [x] `readonly` fields (resolved to absolute paths where applicable):
  - [x] `cwd: string` — absolute path to source package dir
  - [x] `output: string` — absolute path to output dir
  - [x] `includeDevDependencies: boolean`
  - [x] `includePeerDependencies: boolean`
  - [x] `includeOptionalDependencies: boolean`
  - [x] `clean: boolean`
  - [x] `lockfile: boolean` — default true; false when `--no-lockfile` is passed
  - [x] `dryRun: boolean`
  - [x] `verbose: boolean`
  - [x] `patchDependencies: 'ignore' | 'warning' | 'try-replace'`
- [x] Validates inputs in the constructor (fail fast with clear errors)
- [x] No I/O in the constructor beyond `fs.statSync` for path checks
- [x] `Object.freeze(this)` at the end of the constructor

### Dependencies factory (src/core/makeDependencies.ts)

Builds the helper objects used by `App` and operations. Separated from `App`'s
constructor so callers can plug in custom helpers without subclassing.

```ts
function makeDependencies({ config }: { config: Config }): Dependencies {
  return { config, logger: new Logger(config.verbose) /*, fs, ... */ };
}
```

`cli.ts` calls `makeDependencies({ config })` directly; `exportPackage` is a
thin wrapper that does the same.

### `App` (src/core/App.ts)

The single state object passed through every operation. Owns everything
operations read and write.

- [x] Constructor: `new App({ deps })`
- [x] Fields hydrated from deps (read-only on App):
  - [x] `config: Config`
  - [x] `logger: Logger`
  - [x] (future helpers added by extending `makeDependencies`)
- [x] State fields (populated by operations):
  - [x] `workspace: Workspace | null` — set by `readWorkspace`
  - [x] `sourcePackage: WorkspacePackage | null` — set by `readWorkspace`
  - [x] `exported: ExportedPackages | null` — set by `resolveDependencies`
  - [x] `packageJsons: Map<WorkspacePackage, PackageJson> | null` — set by
        `modifyPackageJson` before they hit disk
- [x] Methods are minimal: prefer plain field access. Add a method only when the
      invariant is non-trivial (e.g., `app.requireWorkspace()` that throws if
      `readWorkspace` hasn't run).
- [x] Operations call `app.logger.info/warn/error/debug(...)`,
      `app.config.<field>`, etc.

### `Workspace` (src/core/Workspace.ts)

Wraps the parsed `pnpm-workspace.yaml` + the package registry.

- [x] Fields: `root`, `catalog`, `catalogs`,
      `packages: Map<name,     WorkspacePackage>`, `overrides`,
      `patchedDependencies`
- [x] Methods: `getByName(name)`, `getByDir(dir)`,
      `resolveCatalog(spec,     depName)` (single source of truth for catalog
      lookups)

### `WorkspacePackage` (src/core/WorkspacePackage.ts)

One package on disk. Created by `readWorkspace`, referenced everywhere.

- [x] Fields: `name`, `dir` (absolute), `manifest: PackageJsonData` (raw parsed
      `package.json`)
- [x] Derived: `dirname` (mangled output basename), `isScoped`, `isPrivate`
      (drives the discriminator in Phase 7)

### `ExportedPackages` (src/core/ExportedPackages.ts)

Result of `resolveDependencies`: which workspace packages must be copied, and
which is the root.

- [x] Fields: `root: WorkspacePackage`, `members: Set<WorkspacePackage>`
- [x] Methods: `has(pkg)`, `outputPathFor(pkg)` (relative to `config.output`),
      `relativeFileSpecifier(from: WorkspacePackage, to:     WorkspacePackage): string`
      — emits `file:./packages/foo`, `file:../bar`, `file:../..`, etc.

### `PackageJson` (src/core/PackageJson.ts)

In-memory rewrite of one `package.json` before serialization.

- [x] Constructed from a `WorkspacePackage` + the `ExportedPackages` + the
      `Config`
- [x] Methods: `rewriteDeps(field)`, `dropOrVersionResolve(...)`,
      `stripPnpmFields()`, `translateOverrides()`, `applyPatchPackage()`,
      `toJSON(): PackageJsonData`
- [x] Pure transformations on cloned data; never mutates the source
      `WorkspacePackage.manifest`

### Operations (src/operations/\*.ts)

Each operation is `(app: App) => Promise<void>`. The main pipeline reads
linearly:

```ts
await readWorkspace(app);
await resolveDependencies(app);
await copyProjectFiles(app);
await modifyPackageJson(app);
await makePackageLockFile(app);
```

**Nesting.** Each operation may be implemented internally as a chain of smaller
subfunctions also taking `app`. A subfunction may read/write `app` directly, or
take additional locals as further arguments — e.g., `doSmallJob(app, workspace)`
if a partial result is more convenient to pass explicitly than to roundtrip
through `app`. The exact shape of these subfunctions is decided when the real
code is written; the only firm contract is that **the top-level operations
exported from `src/operations/*.ts` take `(app: App)` and only `(app: App)`**.

- [x] `readWorkspace(app)` — finds `pnpm-workspace.yaml`, parses it, enumerates
      packages, sets `app.workspace` and `app.sourcePackage`
- [x] `resolveDependencies(app)` — BFS from `app.sourcePackage`, builds
      `app.exported`
- [x] `copyProjectFiles(app)` — handles `--clean`, copies source pkg to
      `output/`, copies each exported package to `output/packages/<dirname>/`,
      post-copy build-output checks
- [x] `modifyPackageJson(app)` — builds a `PackageJson` for each copied pkg,
      rewrites it, writes to disk, populates `app.packageJsons`
- [x] `makePackageLockFile(app)` — emits npm package-lock v3 unless disabled

**Operations import from sibling modules** (`../core/...`, `../utils/...`),
**not** from `index.ts` — avoids circular re-exports.

### Errors and exit codes

- `UserError extends Error` (exit 1) — anything the user can fix (missing
  workspace, output dir non-empty, catalog miss, etc.)
- `InternalError extends Error` (exit 2) — assertion failures, "this shouldn't
  happen"
- `cli.ts` wraps the operation pipeline in a single `try/catch`:
  - `UserError` → print `error: <message>` on stderr, exit 1
  - anything else → print full stack, exit 2, suggest filing an issue
- `exportPackage` does **not** wrap — exceptions propagate to the caller.

### Logger

Plain 4-method object: `info`, `warn`, `error`, `debug`. ~20 lines.

- `info` → stdout (always)
- `warn`, `error` → stderr (always)
- `debug` → stderr only when `config.verbose`
- No log levels, transports, or filters

CLI uses a console-backed logger; library callers can construct their own and
pass it via a custom `makeDependencies`.

### Public API (src/index.ts)

The library is not a black box — every piece used by `cli.ts` is exported and
reusable.

```ts
// Core classes
export { Config } from './core/Config';
export { App } from './core/App';
export { Workspace } from './core/Workspace';
export { WorkspacePackage } from './core/WorkspacePackage';
export { ExportedPackages } from './core/ExportedPackages';
export { PackageJson } from './core/PackageJson';

// Operations
export { readWorkspace } from './operations/readWorkspace';
export { resolveDependencies } from './operations/resolveDependencies';
export { copyProjectFiles } from './operations/copyProjectFiles';
export { modifyPackageJson } from './operations/modifyPackageJson';
export { makePackageLockFile } from './operations/makePackageLockFile';

// Wiring
export { makeDependencies } from './core/makeDependencies';
export type {
  Dependencies,
  Logger,
  ConfigOptions,
  PackageJsonData /*, ... */,
} from './types';

// Errors
export { UserError, InternalError } from './core/errors';

// Convenience
export { exportPackage } from './exportPackage';
```

`exportPackage(opts): Promise<void>` is the simple top-level entry point for v1.
It builds a `Config` from `opts`, calls `makeDependencies`, constructs an `App`,
and runs the standard pipeline. Library callers who need introspection use the
manual pipeline:

```ts
import {
  Config,
  makeDependencies,
  App,
  readWorkspace,
  resolveDependencies,
  copyProjectFiles,
  modifyPackageJson,
} from 'pnpm-export';

const config = new Config({ options: { cwd, output /* ... */ } });
const deps = makeDependencies({ config });
const app = new App({ deps });

await readWorkspace(app);
await resolveDependencies(app);
await myCustomOperation(app); // user's extension
await copyProjectFiles(app);
await modifyPackageJson(app);
```

`cli.ts` uses this exact same pipeline — no privileged path.

### Why this shape

- **`App` as the bus.** New features (e.g., `applyPnpmOverrides`,
  `bundleNodeModules`) become a new field on `App` + a new operation inserted at
  the right position. No need to thread arguments through every function.
- **Immutable `Config`.** Operations never have to wonder whether some earlier
  op rewrote a config field. Every input is fixed at construction.
- **Dependency injection via `makeDependencies`.** Library callers can swap
  helpers (logger, fs adapter) without subclassing `App` or monkey-patching.
- **OOP where state has invariants** (`Config`, `Workspace`, `WorkspacePackage`,
  `ExportedPackages`, `PackageJson`); **plain functions** where the work is a
  transformation (operations, `utils/`).
- **Library-first.** `index.ts` exports everything `cli.ts` uses;
  `exportPackage` is just one possible composition.

## Resolved decisions

- **Lockfile.** Generated by default from `pnpm-lock.yaml`; `--no-lockfile`
  skips emission.
- **Source dir flag.** `-C, --cwd <dir>` (matches git, avoids npm's `--prefix`
  collision).
- **Closure edges.** `dependencies` always; `peerDependencies` when `-P`
  (default true); `optionalDependencies` when `-O` (default true);
  `devDependencies` when `-D` (default false). Recursion is uniform.
- **Excluded workspace edge.** If target is `private: true`, drop the entry.
  Otherwise version-resolve against the target's manifest. Hard error if version
  is required but absent.
- **Cycles.** Tracked via visited set; cyclic refs rewrite to relative `file:`
  paths normally. Workspace pkg → root rewrites to `file:../..`.
- **Self-reference.** Hard error.
- **Catalog circularity.** Hard error (catalog→workspace, catalog→catalog).
- **Catalog miss.** Hard error.
- **Catalog scope.** Resolved in every rewritten manifest, not just root.
- **Per-package `pnpm.catalog` overrides.** Warn and ignore in v1.
- **File copy denylist.** Default list as in Phase 6; per-package
  `.pnpmexportignore` (gitignore syntax) replaces the default when present.
- **Build-output verification.** Warn (don't fail) on missing
  `main`/`module`/`bin`/`exports` paths; per-entry for object `bin`; warn on any
  missing path in `exports` even when siblings resolve.
- **Symlinks.** Resolved (real files copied; never preserved as links).
- **Scoped dirname.** `@scope/foo` → `scope__foo`; `name` field stays
  `@scope/foo`.
- **Manifest fields.** Per Phase 7 table; strip `workspaces`, `pnpm`,
  `packageManager`, `publishConfig.directory`.
- **`pnpm.overrides`.** Translate simple form to npm `overrides`; warn on
  `foo>bar` form.
- **`pnpm.patchedDependencies`.** `--patch-dependencies` flag with `ignore` /
  `warning` / `try-replace` (default `try-replace`); copy patches, add
  `patch-package` to dependencies, compose with existing `postinstall`.
- **JSON output formatting.** Always 2-space, LF, trailing newline.
- **Output dir validation.** Hard-error overlap cases; warn-but-allow
  matches-glob; allow-otherwise.
- **`--clean` semantics.** Wipes contents only; refuses dirs without a
  prior-export marker (or empty); marker is `.pnpm-export-cleaned`.
- **Architecture.** Immutable Config; `makeDependencies({ config })`;
  `new App({ deps })`; `app.config` / `app.logger` flat; 4-method logger;
  `UserError`/`InternalError`; CLI wraps, library doesn't.
- **Operations.** Top-level signature is `(app: App) => Promise<void>`; internal
  subfunctions may take additional args. Operations import siblings, not
  `index.ts`.
- **Programmatic API.** `exportPackage(opts): Promise<void>` for v1. All core
  classes, operations, factory, and errors exported from `index.ts`.
- **Tooling.** `tsdown`, `tinyglobby`, `commander`, `yaml`, `ignore`, `vitest`,
  `oxlint`/`oxfmt`, `tsgo` for everything.
- **Tests.** 12 fixtures; unit + integration + contract tiers; smoke test gated
  by env (forced on for `basic-monorepo` + `with-patches` in CI); Node 20/22/24
  × Linux + macOS; snapshot manifest content not bytes.
- **Release.** 0.x (no semver guarantees) until 1.0; manual `npm publish`;
  hand-written CHANGELOG (Keep a Changelog format).
