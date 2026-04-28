import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeTempFixtureCopy, makeTempOutputDir } from './helpers.ts';

const execFileAsync = promisify(execFile);

describe('cli', () => {
  beforeAll(async () => {
    await execFileAsync('pnpm', ['run', 'build']);
  });

  it('prints full help and exits with an error when required args are missing', async () => {
    const commandError = await execFileAsync('node', ['dist/cli.js']).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(commandError).toMatchObject({
      code: 1,
      stdout: '',
      stderr: expect.stringContaining(
        "error: required option '-o, --output <dir>' not specified",
      ),
    });
    expect(commandError).toMatchObject({
      stderr: expect.stringContaining('Usage: pnpm-export [options]'),
    });
    expect(commandError).toMatchObject({
      stderr: expect.stringContaining('-o, --output <dir>'),
    });
    expect(commandError).toMatchObject({
      stderr: expect.stringContaining('output directory'),
    });
    expect(commandError).toMatchObject({
      stderr: expect.stringContaining('--lockfile'),
    });
  });

  it('prints a dry-run tree and writes nothing', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    const result = await execFileAsync('node', [
      'dist/cli.js',
      '-C',
      path.join(repo, 'packages/api'),
      '-o',
      output,
      '--dry-run',
    ]);

    expect(result.stdout).toContain('api -> ./');
    expect(result.stdout).toContain(
      'Would copy 4 packages, rewrite 4 manifests, emit 0 warnings.',
    );
    await expect(fs.access(output)).rejects.toThrow();
  });

  it('does not emit package-lock.json by default', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await execFileAsync('node', [
      'dist/cli.js',
      '-C',
      path.join(repo, 'packages/api'),
      '-o',
      output,
    ]);

    await expect(
      fs.access(path.join(output, 'package-lock.json')),
    ).rejects.toThrow();
  });

  it('emits package-lock.json with --lockfile', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await execFileAsync('node', [
      'dist/cli.js',
      '-C',
      path.join(repo, 'packages/api'),
      '-o',
      output,
      '--lockfile',
    ]);

    await expect(
      fs.access(path.join(output, 'package-lock.json')),
    ).resolves.toBeUndefined();
  });

  it('includes dev dependencies by default', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await execFileAsync('node', [
      'dist/cli.js',
      '-C',
      path.join(repo, 'packages/api'),
      '-o',
      output,
    ]);

    await expect(
      fs.access(path.join(output, 'packages/dev-config/package.json')),
    ).resolves.toBeUndefined();
  });

  it('skips dev dependencies when --no-dev-dependencies is passed', async () => {
    const repo = await makeTempFixtureCopy('basic-monorepo');
    const output = await makeTempOutputDir();

    await execFileAsync('node', [
      'dist/cli.js',
      '-C',
      path.join(repo, 'packages/api'),
      '-o',
      output,
      '--no-dev-dependencies',
    ]);

    await expect(
      fs.access(path.join(output, 'packages/dev-config/package.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
