import type {
  DepKind,
  PackageJsonData,
  PackageLockPackage,
  DependencyMap,
} from '../../core/types.ts';
import { readDependencyMap, type LockFlags } from './internals.ts';

export function manifestPackageEntry(
  manifest: PackageJsonData,
  {
    includeName,
    flags,
  }: {
    includeName: boolean;
    flags: LockFlags;
  },
): PackageLockPackage {
  const entry: PackageLockPackage = {};
  if (includeName && typeof manifest.name === 'string') {
    entry.name = manifest.name;
  }
  if (typeof manifest.version === 'string') {
    entry.version = manifest.version;
  }

  copyDependencyField(entry, manifest, 'dependencies');
  copyDependencyField(entry, manifest, 'devDependencies');
  copyDependencyField(entry, manifest, 'peerDependencies');
  copyDependencyField(entry, manifest, 'optionalDependencies');
  copyObjectField(entry, manifest, 'peerDependenciesMeta');
  copyObjectField(entry, manifest, 'optionalDependenciesMeta');

  if (typeof manifest.bin === 'string' || isStringRecord(manifest.bin)) {
    entry.bin = manifest.bin;
  }
  if (isStringRecord(manifest.engines)) {
    entry.engines = manifest.engines;
  }

  applyPackageFlags(entry, flags);
  return entry;
}

export function copyDependencyMap(
  entry: PackageLockPackage,
  field: DepKind,
  value: DependencyMap | undefined,
): void {
  if (value && Object.keys(value).length > 0) {
    entry[field] = value;
  } else if (value && field === 'devDependencies') {
    entry.devDependencies = {};
  }
}

export function applyPackageFlags(
  entry: PackageLockPackage,
  flags: LockFlags,
): void {
  if (flags.dev && flags.optional) {
    entry.devOptional = true;
  } else if (flags.dev) {
    entry.dev = true;
  } else if (flags.optional) {
    entry.optional = true;
  }
}

export function isStringRecord(
  value: unknown,
): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function copyDependencyField(
  entry: PackageLockPackage,
  manifest: PackageJsonData,
  field: DepKind,
): void {
  if (manifest[field] !== undefined) {
    copyDependencyMap(entry, field, readDependencyMap(manifest[field]));
  }
}

function copyObjectField(
  entry: PackageLockPackage,
  manifest: PackageJsonData,
  field: 'peerDependenciesMeta' | 'optionalDependenciesMeta',
): void {
  const value = manifest[field];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    entry[field] = value;
  }
}
