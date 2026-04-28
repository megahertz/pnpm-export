# pnpm-export

`pnpm-export` exports one package from a pnpm workspace into a self-contained
directory whose manifests use npm-compatible specifiers and whose
`package-lock.json` is generated from `pnpm-lock.yaml`.

```sh
pnpm-export --cwd packages/api --output /tmp/api
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
