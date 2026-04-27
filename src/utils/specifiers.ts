import type { Workspace } from '../core/Workspace';
import type { WorkspacePackage } from '../core/WorkspacePackage';
import type { DepKind } from '../types';

export const DEP_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
  'devDependencies',
] as const satisfies readonly DepKind[];

export function isWorkspaceSpecifier(specifier: string): boolean {
  return specifier.startsWith('workspace:');
}

export function isCatalogSpecifier(specifier: string): boolean {
  return specifier === 'catalog:' || specifier.startsWith('catalog:');
}

export function resolveSpecifier(
  specifier: string,
  depName: string,
  ctx: { workspace: Workspace },
): string {
  if (isCatalogSpecifier(specifier)) {
    return ctx.workspace.resolveCatalog(specifier, depName);
  }
  return specifier;
}

export function workspaceVersionSpecifier(
  specifier: string,
  target: WorkspacePackage,
): string {
  const value = specifier.slice('workspace:'.length);
  const version =
    typeof target.manifest.version === 'string' ? target.manifest.version : '';

  if (value === '*' || value === '') {
    return version;
  }

  if (value === '^' || value === '~') {
    return `${value}${version}`;
  }

  if (value.startsWith('^') || value.startsWith('~')) {
    return value;
  }

  return value;
}

export function shouldFollowField(
  field: DepKind,
  flags: {
    includeDevDependencies: boolean;
    includePeerDependencies: boolean;
    includeOptionalDependencies: boolean;
  },
): boolean {
  if (field === 'dependencies') {
    return true;
  }
  if (field === 'devDependencies') {
    return flags.includeDevDependencies;
  }
  if (field === 'peerDependencies') {
    return flags.includePeerDependencies;
  }
  return flags.includeOptionalDependencies;
}
