import path from 'node:path';
import type { App } from '../../core/App.ts';
import { UserError } from '../../core/errors.ts';
import type { RawWorkspaceYaml } from '../../core/types.ts';
import { Workspace } from '../../core/Workspace.ts';
import { isSameOrInside } from '../../utils/paths.ts';
import { parseWorkspaceYaml } from '../../utils/workspaceYaml.ts';
import { readYaml } from '../../utils/yaml.ts';
import { enumerateWorkspacePackages } from './enumerateWorkspacePackages.ts';
import { findWorkspaceRoot } from './findWorkspaceRoot.ts';

export async function loadWorkspace(app: App): Promise<void> {
  const workspaceRoot = await locateWorkspaceRoot(app);
  const workspaceYaml = parseWorkspaceYaml(
    await readYaml<RawWorkspaceYaml>(
      path.join(workspaceRoot, 'pnpm-workspace.yaml'),
    ),
  );
  const packages = await enumerateWorkspacePackages(
    workspaceRoot,
    workspaceYaml.packages,
  );
  app.workspace = new Workspace({
    root: workspaceRoot,
    data: workspaceYaml,
    packages,
  });
}

async function locateWorkspaceRoot(app: App): Promise<string> {
  const workspaceRoot = await findWorkspaceRoot(app.config.cwd);
  if (!workspaceRoot) {
    throw new UserError(
      `No pnpm-workspace.yaml found in \`${app.config.cwd}\` or any parent. pnpm-export only supports pnpm workspaces. For a single-package project, use \`npm pack\` instead`,
    );
  }

  if (!isSameOrInside(app.config.cwd, workspaceRoot)) {
    throw new UserError(
      `Source dir \`${app.config.cwd}\` is not inside workspace \`${workspaceRoot}\``,
    );
  }

  return workspaceRoot;
}
