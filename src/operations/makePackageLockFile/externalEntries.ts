import type { PackageLockPackage } from '../../core/types.ts';
import {
  isWorkspaceSpecifier,
  workspaceVersionSpecifier,
} from '../../utils/specifiers.ts';
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
  tryParsePnpmPackageKey,
} from './pnpmKeys.ts';

export function externalPackageEntry(
  context: LockContext,
  external: ExternalState,
): PackageLockPackage {
  const parsed = parseExternalPackageKey(external);
  const metadata = packageMetadataFor(context.pnpmLock, external.snapshotKey);
  const snapshot = snapshotFor(context.pnpmLock, external.snapshotKey);
  const entry: PackageLockPackage = {
    version: parsed.version,
    resolved:
      metadata?.resolution?.tarball ??
      registryTarball(parsed.name, parsed.version),
  };

  if (parsed.name !== external.name) {
    entry.name = parsed.name;
  }
  if (metadata?.resolution?.integrity) {
    entry.integrity = metadata.resolution.integrity;
  }

  copyDependencyMap(
    entry,
    'dependencies',
    packageDependencyMap(
      context,
      snapshot?.dependencies,
      metadata?.dependencies,
      metadata?.peerDependencies,
    ),
  );
  copyDependencyMap(
    entry,
    'optionalDependencies',
    packageDependencyMap(
      context,
      snapshot?.optionalDependencies,
      metadata?.optionalDependencies,
      metadata?.peerDependencies,
    ),
  );
  copyDependencyMap(
    entry,
    'peerDependencies',
    normalizeDependencyMap(context, metadata?.peerDependencies),
  );
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

function parseExternalPackageKey(external: ExternalState): {
  name: string;
  version: string;
} {
  const aliasValue = external.snapshotKey.startsWith(`${external.name}@`)
    ? external.snapshotKey.slice(`${external.name}@`.length)
    : undefined;
  const aliasTarget = aliasValue
    ? tryParsePnpmPackageKey(aliasValue)
    : undefined;
  return aliasTarget ?? parsePnpmPackageKey(external.snapshotKey);
}

function packageDependencyMap(
  context: LockContext,
  snapshotDependencies: Record<string, string> | undefined,
  metadataDependencies: Record<string, string> | undefined,
  peerDependencies: Record<string, string> | undefined,
): Record<string, string> | undefined {
  const dependencies =
    metadataDependencies && Object.keys(metadataDependencies).length > 0
      ? metadataDependencies
      : snapshotDependencies;
  if (!dependencies) {
    return undefined;
  }

  const peerNames = new Set(Object.keys(peerDependencies ?? {}));
  const filtered = Object.fromEntries(
    Object.entries(dependencies).filter(
      ([name]) =>
        metadataDependencies?.[name] !== undefined || !peerNames.has(name),
    ),
  );
  return normalizeDependencyMap(context, filtered);
}

function normalizeDependencyMap(
  context: LockContext,
  dependencies: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!dependencies) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => [
      name,
      normalizeDependencyVersion(context, name, version),
    ]),
  );
}

function normalizeDependencyVersion(
  context: LockContext,
  name: string,
  version: string,
): string {
  if (isWorkspaceSpecifier(version)) {
    const target = context.app.requireWorkspace().getByName(name);
    return target ? workspaceVersionSpecifier(version, target) : '*';
  }

  const normalized = version.startsWith('/') ? version.slice(1) : version;
  const withoutPeerSuffix = stripPeerSuffix(normalized);
  const parsed = tryParsePnpmPackageKey(withoutPeerSuffix);
  if (parsed) {
    return parsed.name === name
      ? parsed.version
      : `npm:${parsed.name}@${parsed.version}`;
  }

  const namePrefix = `${name}@`;
  return withoutPeerSuffix.startsWith(namePrefix)
    ? withoutPeerSuffix.slice(namePrefix.length)
    : withoutPeerSuffix;
}

function stripPeerSuffix(version: string): string {
  const peerStart = version.indexOf('(');
  return peerStart === -1 ? version : version.slice(0, peerStart);
}
