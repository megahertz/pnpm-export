import path from 'node:path';
import { pathExists } from '../../utils/fs.ts';

export async function findWorkspaceRoot(
  startDir: string,
): Promise<string | undefined> {
  const dirs: string[] = [];
  let current = path.resolve(startDir);

  while (true) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  const roots = await Promise.all(
    dirs.map(async (dir) =>
      (await pathExists(path.join(dir, 'pnpm-workspace.yaml')))
        ? dir
        : undefined,
    ),
  );
  return roots.find((dir): dir is string => dir !== undefined);
}
