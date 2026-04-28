import path from 'node:path';
import type { App } from '../../core/App.ts';
import { UserError } from '../../core/errors.ts';
import type { PackageJsonData } from '../../core/types.ts';
import { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { pathExists } from '../../utils/fs.ts';
import { readJson } from '../../utils/json.ts';

export async function loadSourcePackage(app: App): Promise<void> {
  const sourceManifest = await readSourceManifest(app);
  const workspace = app.requireWorkspace();
  app.sourcePackage =
    workspace.getByDir(app.config.cwd) ??
    new WorkspacePackage({ dir: app.config.cwd, manifest: sourceManifest });
}

async function readSourceManifest(app: App): Promise<PackageJsonData> {
  const sourceManifestPath = path.join(app.config.cwd, 'package.json');
  if (!(await pathExists(sourceManifestPath))) {
    throw new UserError(
      `\`${app.config.cwd}/package.json\` not found. --cwd must point to a directory containing a package.json`,
    );
  }

  const sourceManifest = await readJson<PackageJsonData>(sourceManifestPath);
  if (!sourceManifest.name) {
    throw new UserError(
      `Source package at \`${app.config.cwd}\` has no \`name\` field; pnpm-export requires a name`,
    );
  }

  return sourceManifest;
}
