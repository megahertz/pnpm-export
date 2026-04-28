# Integration Tests Plan

After analyzing the current integration tests (`tests/pnpmExport.test.ts` and
`tests/cli.test.ts`), several important cases and CLI options have been
identified that lack integration test coverage.

## Missing Important Cases

1. **The `--dev-dependencies` (`-D`) flag behavior:**
   - **Current State:** The tests verify that `devDependencies` are omitted by
     default (the `dev-config` package in the `basic-monorepo` fixture is not
     copied).
   - **Missing Case:** A test that runs `pnpm-export` with
     `dev-dependencies: true` (or `-D` via CLI) on `basic-monorepo`, asserting
     that the `dev-config` package _is_ correctly resolved, rewritten as a file
     link, and copied to the output directory.

2. **The `--clean` flag and Output Directory Validation:**
   - **Current State:** Tests use `freshOutput()` helper which wipes directories
     manually before each run.
   - **Missing Cases:**
     - A test asserting that running without `--clean` against a non-empty
       directory (that lacks the internal clean marker) throws a `UserError`.
     - A test asserting that running with `--clean` against a non-empty,
       non-marked directory throws a `UserError` to prevent accidental deletion.
     - A test asserting that running with `--clean` against a previously
       exported directory (which contains the marker) correctly wipes the
       directory and succeeds.

3. **Invalid Output Directory Locations:**
   - **Current State:** Not tested.
   - **Missing Cases (based on `validateOutputLocation.ts`):**
     - Throw an error if the output directory is equal to the workspace root.
     - Throw an error if the output directory is inside the source package
       directory.
     - Throw an error if the output directory is an already existing workspace
       package directory.

4. **pnpm Manifest Fields Stripping (`stripPnpmFields`):**
   - **Current State:** The `with-catalogs` test asserts `pnpm` field is
     `undefined` (because of stripping), but it's a side-effect.
   - **Missing Case:** An explicit test verifying that properties like
     `pnpm.neverBuiltDependencies`, `packageManager`, and `workspaces` are
     unconditionally stripped from the resulting `package.json` across all
     exported packages.

5. **`workspace:` Specifier Variations:**
   - **Current State:** The fixtures mostly use `workspace:*`.
   - **Missing Case:** A fixture and test covering specific version resolutions
     (`workspace:^`, `workspace:~`, `workspace:1.0.0`) to verify they are all
     correctly resolved and rewritten to `file:` links in the final package.

## Next Steps

These test cases should be added to `tests/pnpmExport.test.ts` and
`tests/cli.test.ts` to ensure full coverage of `pnpm-export`'s documented
behaviors and error boundaries.
