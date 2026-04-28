import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { App, Config, pnpmExport } from '../src/index.ts';
import type { ConfigOptions, Logger, PackageJsonData } from '../src/index.ts';
import {
  listFiles,
  makeTempFixtureCopy,
  makeTempOutputDir,
  readJson,
} from './helpers.ts';

describe('pnpmExport integration', () => {
  it('exports the basic monorepo closure and rewrites manifests', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/api'),
      output,
      lockfile: true,
    });

    expect(await listFiles(output)).toEqual([
      'package-lock.json',
      'package.json',
      'packages/lib/index.js',
      'packages/lib/package.json',
      'packages/shared/package.json',
      'src/index.js',
    ]);

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toEqual({
      zod: '^4.0.0',
      shared: 'file:./packages/shared',
    });
    expect(root.devDependencies).toEqual({ eslint: '^9.0.0' });
    const lockfile = await readJson<Record<string, unknown>>(
      path.join(output, 'package-lock.json'),
    );
    expect(lockfile).toMatchObject({
      name: 'api',
      lockfileVersion: 3,
      packages: {
        '': {
          name: 'api',
          dependencies: {
            zod: '^4.0.0',
            shared: 'file:./packages/shared',
          },
          devDependencies: {
            eslint: '^9.0.0',
          },
        },
        'node_modules/shared': {
          resolved: 'packages/shared',
          link: true,
        },
        'node_modules/zod': {
          version: '4.0.0',
          integrity: 'sha512-zod-fixture',
        },
      },
    });

    const shared = await readJson<PackageJsonData>(
      path.join(output, 'packages/shared/package.json'),
    );
    expect(shared.dependencies).toEqual({ lib: 'file:../lib' });
  });

  it('handles scoped package output directory names', async () => {
    const repo = await makeTempFixtureCopy('scoped');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    expect(await listFiles(output)).toContain(
      'packages/scope__foo/package.json',
    );
    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toEqual({
      '@scope/foo': 'file:./packages/scope__foo',
    });
  });

  it('resolves default and named catalogs while warning on per-package catalog overrides', async () => {
    const repo = await makeTempFixtureCopy('with-catalogs');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toEqual({
      lodash: '^4.17.21',
      react: '^19.0.0',
    });
    expect(root.pnpm).toBeUndefined();
    expect(logger.warnings.join('\n')).toContain('per-package pnpm.catalog');
  });

  it('follows peer and optional workspace dependency edges by default', async () => {
    const peerRepo = await makeTempFixtureCopy('with-peer-deps');
    const peerOutput = await makeTempOutputDir();
    await runPnpmExport({
      cwd: path.join(peerRepo, 'packages/app'),
      output: peerOutput,
      lockfile: false,
    });
    expect(await listFiles(peerOutput)).toContain(
      'packages/plugin/package.json',
    );

    const optionalRepo = await makeTempFixtureCopy('with-optional-deps');
    const optionalOutput = await makeTempOutputDir();
    await runPnpmExport({
      cwd: path.join(optionalRepo, 'packages/app'),
      output: optionalOutput,
      lockfile: false,
    });
    expect(await listFiles(optionalOutput)).toContain(
      'packages/optional-plugin/package.json',
    );
    const root = await readJson<PackageJsonData>(
      path.join(optionalOutput, 'package.json'),
    );
    expect(root.peerDependenciesMeta).toEqual({
      'optional-plugin': { optional: true },
    });
  });

  it('drops private excluded workspace edges and version-resolves public ones', async () => {
    const repo = await makeTempFixtureCopy('private-vs-public');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      peerDependencies: false,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.peerDependencies).toEqual({
      'public-target': '^3.2.1',
    });
    expect(await listFiles(output)).toEqual(['package.json']);
  });

  it('copies package files with .pnpmexportignore reset behavior', async () => {
    const repo = await makeTempFixtureCopy('with-pnpmexportignore');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const files = await listFiles(output);
    expect(files).toContain('.env');
    expect(files).toContain('keep.txt');
    expect(files).not.toContain('secret.txt');
    expect(files).not.toContain('.pnpmexportignore');
    expect(files).toContain('packages/keep-all/node_modules/kept.txt');
  });

  it('translates overrides and warns about pnpm nested overrides', async () => {
    const repo = await makeTempFixtureCopy('with-overrides');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.overrides).toEqual({
      'foo': '2.0.0',
      'from-workspace-yaml': '1.0.0',
    });
    expect(logger.warnings.join('\n')).toContain('foo>bar');
  });

  it('copies patches in try-replace mode and mutates the root install script', async () => {
    const repo = await makeTempFixtureCopy('with-patches');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toEqual({
      'left-pad': '1.3.0',
      'patch-package': '^8.0.0',
    });
    expect(root.scripts).toEqual({ postinstall: 'patch-package' });
    expect(
      await fileExists(path.join(output, 'patches/left-pad+1.3.0.patch')),
    ).toBe(true);
    expect(logger.warnings.join('\n')).toContain(
      'Applied 1 patches via patch-package postinstall.',
    );
  });

  it('supports patch warning and ignore modes without copying patch files', async () => {
    const warningRepo = await makeTempFixtureCopy('with-patches');
    const warningOutput = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(warningRepo, 'packages/app'),
      output: warningOutput,
      patchDependencies: 'warning',
      lockfile: false,
    });

    expect(logger.warnings.join('\n')).toContain(
      'stripped pnpm.patchedDependencies',
    );
    expect(
      await fileExists(
        path.join(warningOutput, 'patches/left-pad+1.3.0.patch'),
      ),
    ).toBe(false);

    const ignoreRepo = await makeTempFixtureCopy('with-patches');
    const ignoreOutput = await makeTempOutputDir();
    await runPnpmExport({
      cwd: path.join(ignoreRepo, 'packages/app'),
      output: ignoreOutput,
      patchDependencies: 'ignore',
      lockfile: false,
    });
    expect(
      await fileExists(path.join(ignoreOutput, 'patches/left-pad+1.3.0.patch')),
    ).toBe(false);
  });

  it('warns when declared build output is missing', async () => {
    const repo = await makeTempFixtureCopy('missing-build-output');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
    });

    expect(logger.warnings.join('\n')).toContain('Did you forget to build?');
  });

  it('exports when the source package is the workspace root', async () => {
    const repo = await makeTempFixtureCopy('source-is-workspace-root');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: repo,
      output,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toEqual({
      'root-dep': 'file:./packages/root-dep',
    });
  });

  it('includes workspace dev dependencies when requested', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/api'),
      output,
      devDependencies: true,
      lockfile: false,
    });

    expect(await listFiles(output)).toContain(
      'packages/dev-config/package.json',
    );
    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.devDependencies).toEqual({
      'eslint': '^9.0.0',
      'dev-config': 'file:./packages/dev-config',
    });
  });

  it('validates output directory locations', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const cwd = path.join(repo, 'packages/api');

    await expect(runPnpmExport({ cwd, output: repo })).rejects.toThrow(
      'cannot equal workspace root',
    );

    await expect(
      runPnpmExport({ cwd, output: path.join(cwd, 'dist') }),
    ).rejects.toThrow('cannot be inside source dir');

    await expect(
      runPnpmExport({ cwd, output: path.join(repo, 'packages/shared') }),
    ).rejects.toThrow('is an existing workspace package');
  });

  it('handles --clean flag properly with existing directories', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'dummy.txt'), 'hello');

    await expect(
      runPnpmExport({
        cwd: path.join(repo, 'packages/api'),
        output,
        lockfile: false,
      }),
    ).rejects.toThrow('is non-empty');

    await expect(
      runPnpmExport({
        cwd: path.join(repo, 'packages/api'),
        output,
        clean: true,
        lockfile: false,
      }),
    ).rejects.toThrow('does not look like a prior pnpm-export output');

    await fs.writeFile(path.join(output, '.pnpm-export-cleaned'), '');
    await runPnpmExport({
      cwd: path.join(repo, 'packages/api'),
      output,
      clean: true,
      lockfile: false,
    });

    expect(await fileExists(path.join(output, 'package.json'))).toBe(true);
    expect(await fileExists(path.join(output, 'dummy.txt'))).toBe(false);
  });

  it('strips pnpm specific fields and packageManager from manifests', async () => {
    const repo = await makeTempFixtureCopy('with-catalogs');
    const output = await makeTempOutputDir();

    const appPkgPath = path.join(repo, 'packages/app/package.json');
    const appPkg = await readJson<PackageJsonData>(appPkgPath);
    appPkg.packageManager = 'pnpm@8.0.0';
    appPkg.workspaces = ['packages/*'];
    appPkg.pnpm = { neverBuiltDependencies: ['foo'] };
    appPkg.publishConfig = { directory: 'dist', access: 'public' };
    await fs.writeFile(appPkgPath, JSON.stringify(appPkg, undefined, 2));

    await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.packageManager).toBeUndefined();
    expect(root.workspaces).toBeUndefined();
    expect(root.pnpm).toBeUndefined();
    expect(root.publishConfig).toEqual({ access: 'public' });
  });

  it('rewrites different workspace specifier variations', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await fs.mkdir(path.join(repo, 'packages/shared-tilde'));
    await fs.writeFile(
      path.join(repo, 'packages/shared-tilde/package.json'),
      JSON.stringify({ name: 'shared-tilde', version: '1.0.0' }),
    );
    await fs.mkdir(path.join(repo, 'packages/shared-caret'));
    await fs.writeFile(
      path.join(repo, 'packages/shared-caret/package.json'),
      JSON.stringify({ name: 'shared-caret', version: '1.0.0' }),
    );
    await fs.mkdir(path.join(repo, 'packages/shared-exact'));
    await fs.writeFile(
      path.join(repo, 'packages/shared-exact/package.json'),
      JSON.stringify({ name: 'shared-exact', version: '1.0.0' }),
    );

    const appPkgPath = path.join(repo, 'packages/api/package.json');
    const appPkg = await readJson<PackageJsonData>(appPkgPath);
    appPkg.dependencies = {
      ...appPkg.dependencies,
      'shared-tilde': 'workspace:~',
      'shared-caret': 'workspace:^',
      'shared-exact': 'workspace:1.0.0',
    };
    await fs.writeFile(appPkgPath, JSON.stringify(appPkg, undefined, 2));

    await runPnpmExport({
      cwd: path.join(repo, 'packages/api'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.dependencies).toMatchObject({
      'shared-tilde': 'file:./packages/shared-tilde',
      'shared-caret': 'file:./packages/shared-caret',
      'shared-exact': 'file:./packages/shared-exact',
    });
  });

  it('handles BOM in package.json files gracefully', async () => {
    const repo = await makeTempFixtureCopy('bom-json');
    const output = await makeTempOutputDir();

    await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: false,
    });

    const root = await readJson<PackageJsonData>(
      path.join(output, 'package.json'),
    );
    expect(root.name).toBe('bom-app');
  });

  it('warns and proceeds when encountering duplicate workspace packages', async () => {
    const repo = await makeTempFixtureCopy('duplicate-workspace');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app1'),
      output,
      lockfile: false,
    });

    expect(logger.warnings).toContainEqual(
      expect.stringContaining('Duplicate workspace package name `dup-app`'),
    );
  });

  it('warns and only locks one version when a dependency is locked to multiple versions', async () => {
    const repo = await makeTempFixtureCopy('multiple-versions');
    const output = await makeTempOutputDir();

    const logger = await runPnpmExport({
      cwd: path.join(repo, 'packages/app'),
      output,
      lockfile: true,
    });

    expect(logger.warnings).toContainEqual(
      expect.stringContaining(
        'is locked to multiple versions. package-lock.json will only lock one version',
      ),
    );

    const lockfile = await readJson<Record<string, unknown>>(
      path.join(output, 'package-lock.json'),
    );
    expect((lockfile as Record<string, unknown>).packages).toHaveProperty(
      'node_modules/baz',
    );
  });

  it('skips missing patch-package in lockfile without crashing', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    // Inject a fake patch-package dependency that's not in pnpm-lock.yaml
    const appPkgPath = path.join(repo, 'packages/api/package.json');
    const appPkg = await readJson<PackageJsonData>(appPkgPath);
    appPkg.dependencies = { ...appPkg.dependencies, 'patch-package': '^8.0.0' };
    await fs.writeFile(appPkgPath, JSON.stringify(appPkg, undefined, 2));

    await runPnpmExport({
      cwd: path.join(repo, 'packages/api'),
      output,
      lockfile: true,
    });

    const lockfile = await readJson<Record<string, unknown>>(
      path.join(output, 'package-lock.json'),
    );
    expect((lockfile as Record<string, unknown>).packages).not.toHaveProperty(
      'node_modules/patch-package',
    );
  });

  it('errors for self-references', async () => {
    const repo = await makeTempFixtureCopy('cyclic');
    const output = await makeTempOutputDir();

    await expect(
      runPnpmExport({
        cwd: path.join(repo, 'packages/self'),
        output,
      }),
    ).rejects.toThrow('lists itself as a workspace dependency');
  });
});

async function runPnpmExport(options: ConfigOptions): Promise<TestLogger> {
  const config = new Config(options);
  const logger = new TestLogger();
  const deps = { config, logger };
  const app = new App({ deps });

  await pnpmExport(app);
  return logger;
}

class TestLogger implements Logger {
  readonly warnings: string[] = [];

  get warningCount(): number {
    return this.warnings.length;
  }

  debug(): void {}

  error(): void {}

  info(): void {}

  warn(message: string): void {
    this.warnings.push(message);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
