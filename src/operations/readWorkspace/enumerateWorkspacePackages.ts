import fs from 'node:fs/promises';
import path from 'node:path';
import { UserError } from '../../core/errors.ts';
import type { PackageJsonData } from '../../core/types.ts';
import { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { pathExists } from '../../utils/fs.ts';
import { workspaceGlob } from '../../utils/glob.ts';
import { readJson } from '../../utils/json.ts';

export async function enumerateWorkspacePackages(
  workspaceRoot: string,
  patterns: string[],
): Promise<Map<string, WorkspacePackage>> {
  const packageDirs = await workspaceGlob(patterns, workspaceRoot);
  const packages = new Map<string, WorkspacePackage>();

  const workspacePackages = await Promise.all(
    packageDirs.toSorted().map(async (relativeDir) => {
      const dir = path.resolve(workspaceRoot, relativeDir);
      const manifestPath = path.join(dir, 'package.json');
      if (!(await pathExists(manifestPath))) {
        return undefined;
      }

      const manifest = await readJson<PackageJsonData>(manifestPath);
      if (!manifest.name) {
        return undefined;
      }

      return new WorkspacePackage({ dir, manifest });
    }),
  );

  for (const pkg of workspacePackages) {
    if (!pkg) {
      continue;
    }
    const existing = packages.get(pkg.name);
    if (existing) {
      throw new UserError(
        `Duplicate workspace package name \`${pkg.name}\` at \`${existing.dir}\` and \`${pkg.dir}\``,
      );
    }
    packages.set(pkg.name, pkg);
  }

  await fs.stat(workspaceRoot);
  return packages;
}
