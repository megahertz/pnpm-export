import path from 'node:path';
import type { App } from '../../core/App.ts';
import { InternalError } from '../../core/errors.ts';
import type {
  DependencyMap,
  DepKind,
  PackageJsonData,
  PackageLockPackage,
  PnpmLock,
} from '../../core/types.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';

export const LOCK_DEP_FIELDS: DepKind[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

export function collectManifestMap(
  app: App,
): Map<WorkspacePackage, PackageJsonData> {
  const manifests = new Map<WorkspacePackage, PackageJsonData>();
  for (const [pkg, packageJson] of app.requirePackageJsons()) {
    manifests.set(pkg, packageJson.toJSON());
  }
  return manifests;
}

export function requireManifest(
  context: LockContext,
  pkg: WorkspacePackage,
): PackageJsonData {
  const manifest = context.manifests.get(pkg);
  if (!manifest) {
    throw new InternalError(`No rewritten manifest for package ${pkg.name}`);
  }
  return manifest;
}

export function dependencyEntries(value: unknown): Array<[string, string]> {
  return Object.entries(readDependencyMap(value));
}

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

export function isFileSpecifier(specifier: string): boolean {
  return specifier.startsWith('file:');
}

export function resolveLocalFileTarget(
  context: LockContext,
  from: WorkspacePackage,
  depName: string,
  specifier: string,
): undefined | WorkspacePackage {
  if (!isFileSpecifier(specifier)) {
    return undefined;
  }

  const exported = context.app.requireExported();
  const target =
    depName === exported.root.name
      ? exported.root
      : [...exported.members].find((pkg) => pkg.name === depName);
  if (!target) {
    return undefined;
  }

  const expected = path.resolve(exported.outputPathFor(target));
  const actual = path.resolve(
    exported.outputPathFor(from),
    specifier.slice('file:'.length),
  );
  return actual === expected ? target : undefined;
}

export function packageEntryPath(
  pkg: WorkspacePackage,
  root: WorkspacePackage,
): string {
  return pkg === root ? '' : workspacePackageEntryPath(pkg);
}

export function workspacePackageEntryPath(pkg: WorkspacePackage): string {
  return `packages/${pkg.dirname}`;
}

export function nodeModulesPath(packageName: string): string {
  return `node_modules/${packageName}`;
}

export function flagsForField(parent: LockFlags, field: DepKind): LockFlags {
  return {
    dev: parent.dev || field === 'devDependencies',
    optional: parent.optional || field === 'optionalDependencies',
  };
}

export function mergeLockFlags(a: LockFlags, b: LockFlags): LockFlags {
  return {
    dev: a.dev && b.dev,
    optional: a.optional && b.optional,
  };
}

export function sortPackageEntries(
  packages: Record<string, PackageLockPackage>,
): Record<string, PackageLockPackage> {
  return Object.fromEntries(
    Object.entries(packages).toSorted(([a], [b]) => {
      if (a === '') {
        return -1;
      }
      if (b === '') {
        return 1;
      }
      return a.localeCompare(b);
    }),
  );
}

export interface LockFlags {
  dev: boolean;
  optional: boolean;
}

export interface ExternalState {
  flags: LockFlags;
  name: string;
  snapshotKey: string;
}

export interface LockContext {
  app: App;
  externalQueue: ExternalState[];
  externalStates: Map<string, ExternalState>;
  manifests: Map<WorkspacePackage, PackageJsonData>;
  pnpmLock?: PnpmLock;
  workspaceQueue: WorkspacePackage[];
  workspaceStates: Map<WorkspacePackage, LockFlags>;
}
