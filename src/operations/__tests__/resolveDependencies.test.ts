import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../../../tests/helpers.ts';
import { App } from '../../core/App.ts';
import { Config } from '../../core/Config.ts';
import type { Dependencies, Logger } from '../../core/types.ts';
import { Workspace } from '../../core/Workspace.ts';
import { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { findWorkspaceRoot } from '../readWorkspace/index.ts';
import { resolveDependencies } from '../resolveDependencies/index.ts';

describe('resolveDependencies', () => {
  it('walks transitive workspace deps and handles cycles', async () => {
    const root = pkg('a', '/repo/packages/a', {
      dependencies: { b: 'workspace:*' },
    });
    const b = pkg('b', '/repo/packages/b', {
      dependencies: { a: 'workspace:*', c: 'workspace:^' },
    });
    const c = pkg('c', '/repo/packages/c');
    const app = makeApp('/repo/packages/a', root, [b, c]);

    await resolveDependencies(app);

    expect(app.requireExported().members).toEqual(new Set([b, c]));
  });

  it('respects dev dependency flag recursively', async () => {
    const root = pkg('a', '/repo/packages/a', {
      devDependencies: { b: 'workspace:*' },
    });
    const b = pkg('b', '/repo/packages/b');
    const app = makeApp('/repo/packages/a', root, [b]);

    await resolveDependencies(app);
    expect(app.requireExported().members.size).toBe(0);
  });
});

describe('findWorkspaceRoot', () => {
  it('walks upward to pnpm-workspace.yaml', async () => {
    const repo = await tempDir('workspace-root-');
    await fs.mkdir(path.join(repo, 'packages/app'), { recursive: true });
    await fs.writeFile(
      path.join(repo, 'pnpm-workspace.yaml'),
      'packages: []\n',
    );

    await expect(
      findWorkspaceRoot(path.join(repo, 'packages/app')),
    ).resolves.toBe(repo);
  });
});

function makeApp(
  _cwd: string,
  source: WorkspacePackage,
  packages: WorkspacePackage[],
): App {
  const config = new Config({ cwd: process.cwd(), output: '/tmp/out' });
  const logger: Logger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
  const deps: Dependencies = { config, logger };
  const app = new App({ deps });
  const registry = new Map(packages.map((entry) => [entry.name, entry]));
  registry.set(source.name, source);
  app.workspace = new Workspace({
    root: '/repo',
    data: {
      packages: ['packages/*'],
      catalog: {},
      catalogs: {},
      overrides: {},
      patchedDependencies: {},
    },
    packages: registry,
  });
  app.sourcePackage = source;
  return app;
}

function pkg(
  name: string,
  dir: string,
  manifest: Record<string, unknown> = {},
): WorkspacePackage {
  return new WorkspacePackage({
    dir,
    manifest: { name, version: '1.0.0', ...manifest },
  });
}
