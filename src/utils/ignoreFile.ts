import ignore from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import { toPosixPath } from './paths.ts';

const DEFAULT_DENYLIST = [
  'node_modules/',
  '.git/',
  '.env',
  '.env.*',
  '.DS_Store',
  'Thumbs.db',
  '.turbo/',
  '.cache/',
  '.next/cache/',
  'coverage/',
  '.nyc_output/',
];

export async function makePackageFilter(
  srcDir: string,
): Promise<(src: string) => boolean> {
  const metaFile = path.join(srcDir, '.pnpmexportignore');
  const rules = await readOptional(metaFile);
  const matcher = ignore();

  if (rules === undefined) {
    matcher.add(DEFAULT_DENYLIST);
  } else if (rules.trim() !== '') {
    matcher.add(rules);
  }

  return (src: string): boolean => {
    const relative = toPosixPath(path.relative(srcDir, src));
    if (relative === '') {
      return true;
    }
    if (
      relative === '.pnpmexportignore' ||
      relative.endsWith('/.pnpmexportignore')
    ) {
      return false;
    }
    return !matcher.ignores(relative) && !matcher.ignores(`${relative}/`);
  };
}

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
