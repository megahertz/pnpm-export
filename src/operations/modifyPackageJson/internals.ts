import type { Config } from '../../core/Config.ts';
import type { ExportedPackages } from '../../core/ExportedPackages.ts';
import type {
  DependencyMap,
  Logger,
  PackageJsonData,
} from '../../core/types.ts';
import type { Workspace } from '../../core/Workspace.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';

export function readDependencyMap(value: unknown): DependencyMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: DependencyMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    }
  }
  return output;
}

export function collectPatches(
  rootManifest: PackageJsonData,
  workspace: Workspace,
): Record<string, string> {
  return {
    ...workspace.patchedDependencies,
    ...rootManifest.pnpm?.patchedDependencies,
  };
}

export interface ModifyContext {
  workspace: Workspace;
  exported: ExportedPackages;
  config: Config;
  logger: Logger;
}

export interface RewriteContext {
  workspace: Workspace;
  exported: ExportedPackages;
}

export function resolveWorkspaceTarget(
  depName: string,
  ctx: RewriteContext,
): WorkspacePackage | undefined {
  if (depName === ctx.exported.root.name) {
    return ctx.exported.root;
  }
  return ctx.workspace.getByName(depName);
}
