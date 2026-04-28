# Agent Notes

- Use `pnpm`; the project is pinned to `pnpm@10.33.1`.
- Keep TypeScript imports explicit with `.ts` extensions. The build rewrites them for emitted JS.
- Unit tests live next to source in `src/**/__tests__`. Integration and contract tests live in top-level `tests/`; fixtures and shared helpers are there too.
- `tsconfig.json` intentionally excludes `src/**/__tests__/**` so colocated tests are not emitted to `dist`.
- Thrown exception messages should not end with a period.
- CLI behavior depends on a built `dist/cli.js`; the CLI tests run `pnpm run build` before assertions.
- If CLI flags or help text change, run `pnpm docs:flags` to refresh the README.
- Full validation is `pnpm check`.
