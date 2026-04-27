import { describe, expect, it } from 'vitest';
import { Config } from '../../src/core/Config.ts';
import { ExportedPackages } from '../../src/core/ExportedPackages.ts';
import { PackageJson } from '../../src/core/PackageJson.ts';
import type { Logger } from '../../src/core/types.ts';
import { Workspace } from '../../src/core/Workspace.ts';
import { WorkspacePackage } from '../../src/core/WorkspacePackage.ts';

describe('PackageJson', () => {
  it('rewrites workspace and catalog deps without mutating the source manifest', () => {
    const root = new WorkspacePackage({
      dir: '/repo/packages/app',
      manifest: {
        name: 'app',
        private: true,
        dependencies: { shared: 'workspace:*', zod: 'catalog:' },
        devDependencies: { config: 'workspace:*' },
        scripts: { 'build': 'node build.js', 'pnpm:dev': 'pnpm dev' },
        packageManager: 'pnpm@10.0.0',
      },
    });
    const shared = new WorkspacePackage({
      dir: '/repo/packages/shared',
      manifest: { name: 'shared', version: '1.0.0' },
    });
    const config = new WorkspacePackage({
      dir: '/repo/packages/config',
      manifest: { name: 'config', private: true },
    });
    const workspace = makeWorkspace([shared, config], { zod: '^4.0.0' });
    const exported = new ExportedPackages({
      root,
      members: [shared],
      output: '/out',
    });

    const result = new PackageJson({
      pkg: root,
      workspace,
      exported,
      config: new Config({ options: { cwd: process.cwd(), output: '/out' } }),
      logger: quietLogger(),
    }).toJSON();

    expect(result.dependencies).toEqual({
      shared: 'file:./packages/shared',
      zod: '^4.0.0',
    });
    expect(result.devDependencies).toEqual({});
    expect(result.scripts).toEqual({ build: 'node build.js' });
    expect(result.packageManager).toBeUndefined();
    expect(root.manifest.packageManager).toBe('pnpm@10.0.0');
  });
});

function makeWorkspace(
  packages: WorkspacePackage[],
  catalog: Record<string, string>,
): Workspace {
  return new Workspace({
    root: '/repo',
    data: {
      packages: ['packages/*'],
      catalog,
      catalogs: {},
      overrides: {},
      patchedDependencies: {},
    },
    packages: new Map(packages.map((entry) => [entry.name, entry])),
  });
}

function quietLogger(): Logger {
  return {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
}
