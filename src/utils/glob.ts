import { glob } from 'tinyglobby';

export async function workspaceGlob(
  patterns: string[],
  cwd: string,
): Promise<string[]> {
  const includes = patterns.filter((pattern) => !pattern.startsWith('!'));
  const excludes = patterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => pattern.slice(1));

  return glob(includes.length > 0 ? includes : [], {
    cwd,
    onlyDirectories: true,
    absolute: false,
    ignore: ['**/node_modules/**', ...excludes],
  });
}
