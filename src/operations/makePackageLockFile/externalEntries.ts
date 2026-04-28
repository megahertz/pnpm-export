import type { PackageLockPackage } from '../../core/types.ts';
import type { ExternalState, LockContext } from './internals.ts';
import {
  applyPackageFlags,
  copyDependencyMap,
  isStringRecord,
} from './manifestEntries.ts';
import {
  packageMetadataFor,
  parsePnpmPackageKey,
  snapshotFor,
} from './pnpmKeys.ts';

export function externalPackageEntry(
  context: LockContext,
  external: ExternalState,
): PackageLockPackage {
  const parsed = parsePnpmPackageKey(external.snapshotKey);
  const metadata = packageMetadataFor(context.pnpmLock, external.snapshotKey);
  const snapshot = snapshotFor(context.pnpmLock, external.snapshotKey);
  const entry: PackageLockPackage = {
    version: parsed.version,
    resolved:
      metadata?.resolution?.tarball ??
      registryTarball(parsed.name, parsed.version),
  };

  if (metadata?.resolution?.integrity) {
    entry.integrity = metadata.resolution.integrity;
  }

  copyDependencyMap(
    entry,
    'dependencies',
    snapshot?.dependencies ?? metadata?.dependencies,
  );
  copyDependencyMap(
    entry,
    'optionalDependencies',
    snapshot?.optionalDependencies ?? metadata?.optionalDependencies,
  );
  copyDependencyMap(entry, 'peerDependencies', metadata?.peerDependencies);
  if (metadata?.peerDependenciesMeta) {
    entry.peerDependenciesMeta = metadata.peerDependenciesMeta;
  }
  if (
    metadata?.bin &&
    (typeof metadata.bin === 'string' || isStringRecord(metadata.bin))
  ) {
    entry.bin = metadata.bin;
  }
  if (metadata?.engines) {
    entry.engines = metadata.engines;
  }
  if (metadata?.cpu) {
    entry.cpu = metadata.cpu;
  }
  if (metadata?.os) {
    entry.os = metadata.os;
  }
  if (metadata?.libc) {
    entry.libc = metadata.libc;
  }
  if (metadata?.requiresBuild) {
    entry.hasInstallScript = true;
  }

  applyPackageFlags(entry, external.flags);
  return entry;
}

function registryTarball(packageName: string, version: string): string {
  const tarballName = packageName.startsWith('@')
    ? packageName.slice(packageName.indexOf('/') + 1)
    : packageName;
  return `https://registry.npmjs.org/${packageName}/-/${tarballName}-${version}.tgz`;
}
