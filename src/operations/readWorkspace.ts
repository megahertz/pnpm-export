import fs from 'node:fs/promises';
import path from 'node:path';
import type { App } from '../core/App.ts';
import { UserError } from '../core/errors.ts';
import { Workspace } from '../core/Workspace.ts';
import { WorkspacePackage } from '../core/WorkspacePackage.ts';
import type { PackageJsonData, RawWorkspaceYaml } from '../types.ts';
import { pathExists } from '../utils/fs.ts';
import { workspaceGlob } from '../utils/glob.ts';
import { readJson } from '../utils/json.ts';
import { isSameOrInside } from '../utils/paths.ts';
import { parseWorkspaceYaml } from '../utils/workspaceYaml.ts';
import { readYaml } from '../utils/yaml.ts';

export async function readWorkspace(app: App): Promise<void> {
  const workspaceRoot = await findWorkspaceRoot(app.config.cwd);
  if (!workspaceRoot) {
    throw new UserError(
      `No pnpm-workspace.yaml found in \`${app.config.cwd}\` or any parent. pnpm-export only supports pnpm workspaces. For a single-package project, use \`npm pack\` instead.`,
    );
  }

  if (!isSameOrInside(app.config.cwd, workspaceRoot)) {
    throw new UserError(
      `Source dir \`${app.config.cwd}\` is not inside workspace \`${workspaceRoot}\`.`,
    );
  }

  const sourceManifestPath = path.join(app.config.cwd, 'package.json');
  if (!(await pathExists(sourceManifestPath))) {
    throw new UserError(
      `\`${app.config.cwd}/package.json\` not found. --cwd must point to a directory containing a package.json.`,
    );
  }

  const sourceManifest = await readJson<PackageJsonData>(sourceManifestPath);
  if (!sourceManifest.name) {
    throw new UserError(
      `Source package at \`${app.config.cwd}\` has no \`name\` field; pnpm-export requires a name.`,
    );
  }

  const workspaceYaml = parseWorkspaceYaml(
    await readYaml<RawWorkspaceYaml>(
      path.join(workspaceRoot, 'pnpm-workspace.yaml'),
    ),
  );
  const packages = await enumerateWorkspacePackages(
    workspaceRoot,
    workspaceYaml.packages,
  );
  const workspace = new Workspace({
    root: workspaceRoot,
    data: workspaceYaml,
    packages,
  });

  const sourcePackage =
    workspace.getByDir(app.config.cwd) ??
    new WorkspacePackage({ dir: app.config.cwd, manifest: sourceManifest });

  app.workspace = workspace;
  app.sourcePackage = sourcePackage;
}

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

async function enumerateWorkspacePackages(
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
        `Duplicate workspace package name \`${pkg.name}\` at \`${existing.dir}\` and \`${pkg.dir}\`.`,
      );
    }
    packages.set(pkg.name, pkg);
  }

  await fs.stat(workspaceRoot);
  return packages;
}
