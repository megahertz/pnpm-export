# pnpm-export

`pnpm-export` exports one package from a pnpm workspace into a self-contained
directory whose manifests use npm-compatible specifiers and whose
`package-lock.json` is generated from `pnpm-lock.yaml` by default.

```sh
pnpm-export -C packages/api --output /tmp/api
cd /tmp/api
npm install
```

## vs `pnpm pack` / `pnpm deploy`

`pnpm pack` creates a tarball for one package. `pnpm deploy` can produce
deployable trees, but keeps pnpm-specific behavior. `pnpm-export` rewrites local
workspace dependencies to `file:` links and resolves `catalog:` references so
the output works with plain npm.

## Flags

<!-- pnpm-export-help:start -->

```text
Usage: pnpm-export [options]

Export one package from a pnpm workspace for npm install.

Options:
  -V, --version                output the version number
  -C, --cwd <dir>              source package directory
  -o, --output <dir>           output directory
  -D, --dev-dependencies       include workspace dev deps in closure (default:
                               false)
  -P, --peer-dependencies      follow peerDependencies workspace edges (default:
                               true)
  --no-peer-dependencies       do not follow peerDependencies workspace edges
  -O, --optional-dependencies  follow optionalDependencies workspace edges
                               (default: true)
  --no-optional-dependencies   do not follow optionalDependencies workspace
                               edges
  --patch-dependencies <mode>  patch dependency handling: ignore | warning |
                               try-replace (default: "try-replace")
  --clean                      wipe output directory contents before writing
                               (default: false)
  --no-lockfile                do not emit package-lock.json
  --dry-run                    print planned actions without writing (default:
                               false)
  -v, --verbose                debug logging (default: false)
  -h, --help                   display help for command
```

<!-- pnpm-export-help:end -->

## Recipes

Docker:

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install --omit=dev
CMD ["node", "dist/index.js"]
```

App Engine:

```yaml
runtime: nodejs22
entrypoint: npm start
```

GitHub Actions:

```yaml
- run: pnpm-export -C packages/api --output /tmp/api --clean
- run: npm install
  working-directory: /tmp/api
```

## Limitations

Lockfile generation requires enough data in `pnpm-lock.yaml` to resolve exported
external dependencies; pass `--no-lockfile` to skip it. v1 has no `--build` hook
([tracking: future build flag](./.ai/plan.md#phase-11--future--nice-to-have)),
no Windows support
([tracking: Windows support](./.ai/plan.md#phase-11--future--nice-to-have)), and
does not honor the package `files` field while copying
([tracking: files field support](./.ai/plan.md#phase-11--future--nice-to-have)).

`pnpm-export` stays on `0.x` while v1 is in flight. There are no semver
guarantees before 1.0; minor versions may include breaking changes.

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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
