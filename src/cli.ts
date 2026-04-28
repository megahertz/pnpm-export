#!/usr/bin/env node

import { Command, InvalidArgumentError } from 'commander';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { App } from './core/App.ts';
import { Config } from './core/Config.ts';
import { UserError } from './core/errors.ts';
import { makeDependencies } from './core/makeDependencies.ts';
import type { PatchDependenciesMode } from './core/types.ts';
import { pnpmExport } from './pnpmExport.ts';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const program = new Command()
  .name('pnpm-export')
  .description('Export one package from a pnpm workspace for npm install.')
  .version(packageJson.version, '-v, --version', 'output the version number')
  .showHelpAfterError()
  .configureOutput({
    writeErr: (value: string) => {
      fs.writeSync(2, value);
    },
    writeOut: (value: string) => {
      fs.writeSync(1, value);
    },
  })
  .option('-C, --cwd <dir>', 'source package directory')
  .requiredOption('-o, --output <dir>', 'output directory')
  .option(
    '-D, --dev-dependencies',
    'include workspace dev deps in closure',
    false,
  )
  .option(
    '-P, --peer-dependencies',
    'follow peerDependencies workspace edges',
    true,
  )
  .option(
    '--no-peer-dependencies',
    'do not follow peerDependencies workspace edges',
  )
  .option(
    '-O, --optional-dependencies',
    'follow optionalDependencies workspace edges',
    true,
  )
  .option(
    '--no-optional-dependencies',
    'do not follow optionalDependencies workspace edges',
  )
  .option(
    '--patch-dependencies <mode>',
    'patch dependency handling: ignore | warning | try-replace',
    (value: string): PatchDependenciesMode => {
      if (
        value === 'ignore' ||
        value === 'warning' ||
        value === 'try-replace'
      ) {
        return value;
      }
      throw new InvalidArgumentError(
        'expected ignore, warning, or try-replace',
      );
    },
    'try-replace',
  )
  .option('--clean', 'wipe output directory contents before writing', false)
  .option('--lockfile', 'emit package-lock.json (experimental)', false)
  .option('--dry-run', 'print planned actions without writing', false)
  .option('--silent', 'suppress non-error output', false);

program.parse();

try {
  const config = new Config(program.opts());
  const deps = makeDependencies({ config });
  const app = new App({ deps });

  await pnpmExport(app);
} catch (error) {
  if (error instanceof UserError) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  } else {
    const err = error as Error;
    console.error(err.stack ?? String(error));
    console.error('pnpm-export hit an internal error; please file an issue.');
    process.exitCode = 2;
  }
}
