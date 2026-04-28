import fs from 'node:fs';
import path from 'node:path';
import { UserError } from './errors.ts';
import type { ConfigOptions, PatchDependenciesMode } from './types.ts';

const PATCH_MODES = new Set<PatchDependenciesMode>([
  'ignore',
  'warning',
  'try-replace',
]);

export class Config {
  readonly cwd: string;
  readonly output: string;
  readonly includeDevDependencies: boolean;
  readonly includePeerDependencies: boolean;
  readonly includeOptionalDependencies: boolean;
  readonly clean: boolean;
  readonly lockfile: boolean;
  readonly dryRun: boolean;
  readonly verbose: boolean;
  readonly patchDependencies: PatchDependenciesMode;

  constructor({
    options,
  }: {
    options?: ConfigOptions & Record<string, unknown>;
    args?: string[];
  }) {
    const opts = options ?? {};
    const invocationCwd = process.cwd();
    const cwd = typeof opts.cwd === 'string' ? opts.cwd : invocationCwd;
    const output = typeof opts.output === 'string' ? opts.output : undefined;

    if (!output) {
      throw new UserError('--output <dir> is required.');
    }

    this.cwd = path.resolve(invocationCwd, cwd);
    this.output = path.resolve(invocationCwd, output);
    this.includeDevDependencies = Boolean(opts.devDependencies);
    this.includePeerDependencies = opts.peerDependencies !== false;
    this.includeOptionalDependencies = opts.optionalDependencies !== false;
    this.clean = Boolean(opts.clean);
    this.lockfile = opts.lockfile !== false;
    this.dryRun = Boolean(opts.dryRun);
    this.verbose = Boolean(opts.verbose);
    this.patchDependencies =
      typeof opts.patchDependencies === 'string'
        ? opts.patchDependencies
        : 'try-replace';

    if (!PATCH_MODES.has(this.patchDependencies)) {
      throw new UserError(
        `--patch-dependencies must be one of: ${[...PATCH_MODES].join(', ')}.`,
      );
    }

    const cwdStat = safeStat(this.cwd);
    if (!cwdStat?.isDirectory()) {
      throw new UserError(`Source dir \`${this.cwd}\` does not exist.`);
    }

    Object.freeze(this);
  }
}

function safeStat(filePath: string): fs.Stats | undefined {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
