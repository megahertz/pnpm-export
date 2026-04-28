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
  readonly silent: boolean;
  readonly patchDependencies: PatchDependenciesMode;

  constructor(options: ConfigOptions = {}) {
    const invocationCwd = process.cwd();
    const cwd = typeof options.cwd === 'string' ? options.cwd : invocationCwd;
    const output =
      typeof options.output === 'string' ? options.output : undefined;

    if (!output) {
      throw new UserError('--output <dir> is required');
    }

    this.cwd = path.resolve(invocationCwd, cwd);
    this.output = path.resolve(invocationCwd, output);
    this.includeDevDependencies = options.devDependencies !== false;
    this.includePeerDependencies = options.peerDependencies !== false;
    this.includeOptionalDependencies = options.optionalDependencies !== false;
    this.clean = Boolean(options.clean);
    this.lockfile = options.lockfile === true;
    this.dryRun = Boolean(options.dryRun);
    this.silent = Boolean(options.silent);
    this.patchDependencies =
      typeof options.patchDependencies === 'string'
        ? options.patchDependencies
        : 'try-replace';

    if (!PATCH_MODES.has(this.patchDependencies)) {
      throw new UserError(
        `--patch-dependencies must be one of: ${[...PATCH_MODES].join(', ')}`,
      );
    }

    const cwdStat = safeStat(this.cwd);
    if (!cwdStat?.isDirectory()) {
      throw new UserError(`Source dir \`${this.cwd}\` does not exist`);
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
