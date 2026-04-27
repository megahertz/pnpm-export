import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFixture, tempDir } from '../helpers.ts';

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
  });

  it('prints a dry-run tree and writes nothing', async () => {
    const repo = await copyFixture('basic-monorepo');
    const output = await freshOutput();

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
      'Would copy 3 packages, rewrite 3 manifests, emit 0 warnings.',
    );
    await expect(fs.access(output)).rejects.toThrow();
  });

  it('errors on --lockfile in v1', async () => {
    const repo = await copyFixture('basic-monorepo');
    const output = await freshOutput();

    await expect(
      execFileAsync('node', [
        'dist/cli.js',
        '-C',
        path.join(repo, 'packages/api'),
        '-o',
        output,
        '--lockfile',
      ]),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('--lockfile is not implemented in v1'),
    });
  });
});

async function freshOutput(): Promise<string> {
  const output = await tempDir('pnpm-export-cli-');
  await fs.rm(output, { recursive: true, force: true });
  return output;
}
