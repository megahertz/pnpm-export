import path from 'node:path';

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function mangleDirname(packageName: string): string {
  if (packageName.startsWith('@')) {
    return packageName.slice(1).replaceAll('/', '__');
  }
  return packageName;
}

export function isSameOrInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

export function relFile(fromDir: string, toDir: string): string {
  const relative = toPosixPath(path.relative(fromDir, toDir));
  if (relative === '') {
    return 'file:.';
  }
  if (relative.startsWith('..')) {
    return `file:${relative}`;
  }
  return `file:./${relative}`;
}

export function dirnameMatchesPattern(
  relativePath: string,
  pattern: string,
): boolean {
  if (pattern.startsWith('!')) {
    return false;
  }

  const normalized = toPosixPath(relativePath).replace(/\/$/, '');
  const normalizedPattern = pattern.replace(/\/$/, '');
  const regex = globPatternToRegex(normalizedPattern);
  return regex.test(normalized);
}

function globPatternToRegex(pattern: string): RegExp {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegex(char ?? '');
  }
  source += '$';
  return new RegExp(source);
}

function escapeRegex(value: string): string {
  return value.replaceAll(/[|\\{}()[\]^$+*?.]/g, String.raw`\$&`);
}
