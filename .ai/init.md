I want to create an npm package named `pnpm-export`.

Imagine we have the following pnpm monorepo:

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

`packages/api` has the following `package.json`:

```
{
  "name": "api",
  "private": true,
  "dependencies": {
    "zod": "catalog:",
    "shared": "workspace:*"
  },
  "devDependencies": {
    "dev-config": "workspace:*"
  }
}
```

I want `pnpm-export` to work like this:

`pnpm-export -C packages/api --output /tmp/api`

It should create the following structure:

```
|-- packages
| |-- lib
| |-- shared
|-- src
|-- package.json
```

(v1 does not emit `package-lock.json`; the consumer runs `npm install` in the
output directory. Lockfile generation is a v2 goal; see Phase 8 of `plan.md`.)

The exported `package.json` should become:

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

The `devDependencies` object is empty because we did not pass the `-D` or
`--dev-dependencies` flag, so workspace dev dependencies were removed. Also note
that `lib` is copied because it is a workspace dependency of `shared`. The
`package.json` for `shared` should also be updated to point to local packages.
`package-lock.json` should be generated from information in `pnpm-lock.yaml`,
but v1 skips this (see Phase 8 of `plan.md`).

This module is similar to `pnpm pack` or `pnpm deploy`, but more flexible. It
allows any package to be exported for tasks such as deployment to Google App
Engine.
