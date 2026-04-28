# Agent Notes

- Use `pnpm`; the project is pinned to `pnpm@10.33.1`.
- Keep TypeScript imports explicit with `.ts` extensions. The build rewrites
  them for emitted JS.
- Unit tests live next to source in `src/**/__tests__`. Integration and contract
  tests live in top-level `tests/`; fixtures and shared helpers are there too.
- `tsconfig.json` intentionally excludes `src/**/__tests__/**` so colocated
  tests are not emitted to `dist`.
- Thrown exception messages should not end with a period.
- CLI behavior depends on a built `dist/cli.js`; the CLI tests run
  `pnpm run build` before assertions.
- If CLI flags or help text change, run `pnpm docs:flags` to refresh the README.
- Full validation is `pnpm check`.

## Architecture

- **Pipeline is the key architecture pattern.** `pnpmExport` is the gold
  example: its body is a flat sequence of named operation calls. Every operation
  in `src/operations/` should look the same way at the top level — a short list
  of step calls and nothing else. Push checks, loops, and detail work into named
  subfunctions.
- **Entities own their read-only logic; operations own data mutation.** Classes
  like `WorkspacePackage`, `Workspace`, `ExportedPackages`, `PackageJson` may
  keep pure read accessors. But anything that mutates state as part of the
  export pipeline belongs in `src/operations/`, not on the entity.
- **An operation that has more than one mutation step becomes a directory.** The
  directory is named after the operation (e.g. `modifyPackageJson/`); `index.ts`
  is the pipeline that calls each step; each step lives in its own file
  (`modifyPackageJson/stripPnpmFields.ts`, etc.). The pipeline body should read
  like `pnpmExport` does — step calls only.
- **No raw loops in the top-level pipeline body.** Wrap `for (const x of …)` in
  a named helper (e.g. `copyPackages(app)`) so the pipeline stays a flat list of
  calls.
- **Interfaces and types go after the code that uses them.** Put
  `export function`/main code at the top of the file; supporting
  `interface`/`type` declarations live below.
