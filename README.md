# pnpm-export

[![Tests](https://github.com/megahertz/pnpm-export/actions/workflows/check.yml/badge.svg)](https://github.com/megahertz/pnpm-export/actions/workflows/check.yml)
[![NPM version](https://badge.fury.io/js/pnpm-export.svg)](https://badge.fury.io/js/pnpm-export)

Export one package from a pnpm workspace into a self-contained directory that
installs with plain `npm`. Local `workspace:` dependencies come along, all
specifiers are rewritten to npm-compatible ones, and `package-lock.json` is
built from `pnpm-lock.yaml`.

```sh
npx pnpm-export --cwd packages/api --output /tmp/api
cd /tmp/api
npm install
```

## vs `pnpm pack` / `pnpm deploy`

- `pnpm pack` tarballs a single package and drops its workspace dependencies.
- `pnpm deploy` ships a tree but keeps pnpm-specific behavior.
- `pnpm-export` rewrites `workspace:` deps to `file:` links and resolves
  `catalog:` references, so the output runs on plain npm.

## Use cases

- **Deploy a single service from a pnpm monorepo** to AWS Lambda, Google App
  Engine, Cloud Run, Cloudflare Workers, Azure Functions, Heroku, Vercel,
  Netlify, Render, Fly.io, or Railway — anywhere the build step runs
  `npm install` and chokes on `workspace:*` or `catalog:` specifiers.
- **Slim Docker images** — copy one self-contained directory into the container
  instead of the whole monorepo, with no pnpm needed at build or runtime.
- **CI artifact handoff** — produce the export in one job, then install it in
  another job, machine, or downstream pipeline that doesn't have pnpm.
- **Vendor or publish a package without exposing pnpm-only specifiers** —
  `workspace:` deps become real `file:` links, `catalog:` refs resolve to
  concrete versions, and `package-lock.json` is generated from `pnpm-lock.yaml`
  for reproducible installs.
- **Air-gapped or offline builds** — the output is one self-contained directory
  plus a lockfile, easy to review, ship, or mirror.

## Flags

<!-- pnpm-export-help:start -->

```text
Usage: pnpm-export [options]

Export one package from a pnpm workspace for npm install.

Options:
  -v, --version                output the version number
  -C, --cwd <dir>              source package directory
  -o, --output <dir>           output directory
  -D, --dev-dependencies       Follow "workspace:" devDependencies (default:
                               true)
  --no-dev-dependencies        Skip "workspace:" devDependencies
  -P, --peer-dependencies      Follow "workspace:" peerDependencies (default:
                               true)
  --no-peer-dependencies       Skip "workspace:" peerDependencies
  -O, --optional-dependencies  Follow "workspace:" optionalDependencies
                               (default: true)
  --no-optional-dependencies   Skip "workspace:" optionalDependencies
  --patch-dependencies <mode>  patch dependency handling: ignore | warning |
                               try-replace (default: "try-replace")
  --clean                      wipe output directory contents before writing
                               (default: false)
  --lockfile                   emit package-lock.json (experimental) (default:
                               false)
  --dry-run                    print planned actions without writing (default:
                               false)
  --silent                     suppress non-error output (default: false)
  -h, --help                   display help for command
```

<!-- pnpm-export-help:end -->

## Programmatic API

```ts
import { App, Config, makeDependencies, pnpmExport } from 'pnpm-export';

const config = new Config({
  options: {
    cwd: 'packages/api',
    output: '/tmp/api',
    clean: true,
  },
});
const deps = makeDependencies({ config });
const app = new App({ deps });

await pnpmExport(app);
```

## License

Licensed under MIT.
