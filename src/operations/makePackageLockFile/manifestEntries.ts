import type {
  DependencyMap,
  DepKind,
  PackageJsonData,
  PackageLockPackage,
} from '../../core/types.ts';
import { type LockFlags, readDependencyMap } from './internals.ts';

export function manifestPackageEntry(
  manifest: PackageJsonData,
  {
    includeName,
    flags,
  }: {
    flags: LockFlags;
    includeName: boolean;
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
    // eslint-disable-next-line no-param-reassign -- Lock entry builders intentionally fill a caller-owned entry.
    entry[field] = value;
  } else if (value && field === 'devDependencies') {
    // eslint-disable-next-line no-param-reassign -- Lock entry builders intentionally fill a caller-owned entry.
    entry.devDependencies = {};
  }
}

export function applyPackageFlags(
  entry: PackageLockPackage,
  flags: LockFlags,
): void {
  if (flags.dev) {
    // eslint-disable-next-line no-param-reassign -- Lock entry builders intentionally fill a caller-owned entry.
    entry.dev = true;
  }
  if (flags.optional) {
    // eslint-disable-next-line no-param-reassign -- Lock entry builders intentionally fill a caller-owned entry.
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
  field: 'optionalDependenciesMeta' | 'peerDependenciesMeta',
): void {
  const value = manifest[field];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // eslint-disable-next-line no-param-reassign -- Lock entry builders intentionally fill a caller-owned entry.
    entry[field] = value as Record<string, unknown>;
  }
}
