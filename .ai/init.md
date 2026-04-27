I want to create a npm package pnpm-export

Let's imagine we have the pnpm monorepo:

```
|-- packages
| |-- api
| | |-- src
| | |-- package.json
| |-- dashboard
| |-- dev-config
| |-- lib
| |-- shared
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
```

package/api has the following package.json

```
{
  "name": "api",
  "private": true,
  "dependencies": {
    "zod": "catalog:",
    "shared": "workspace:*"
  },
  "devDependencies": {
    "dev-config": "workspace:*",
  }
}
```

I want pnpm-export to work like that:

`pnpm-export -C packages/api --output /tmp/api`

It creates the following structure:

```
|-- packages
| |-- lib
| |-- shared
|-- src
|-- package.json
```

(v1 does not emit `package-lock.json`; consumer runs `npm install` in the
output dir. Lockfile generation is a v2 goal — see Phase 8 of `plan.md`.)

and package.json becomes:

```
{
  "name": "api",
  "private": true,
  "dependencies": {
    "zod": "^4.0.0",
    "shared": "file:./packages/shared"
  },
  "devDependencies": {
  }
}
```

devDependencies is empty because we didn't passed -D or --dev-dependencies flag, so workspace packages were just removed
Also pay attention that lib packages is copied too since it's workspace dependencies of shared. package.json of shared should be updated to point to local packages as well
package-lock.json should be made by getting information of pnpm-lock.json. But v1 skips it (see Phase 8 of `plan.md`).

So, this module is something like `pnpm pack` or `pnpm deploy` but better. So, it allows to export any package and do any things, like deploying to google app engine and so on
