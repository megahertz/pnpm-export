import { UserError } from '../../core/errors.ts';
import type {
  PnpmLock,
  PnpmLockPackage,
  PnpmLockSnapshot,
} from '../../core/types.ts';

export function snapshotKeyFromVersion(
  depName: string,
  version: string,
): string | undefined {
  if (
    version.startsWith('link:') ||
    version.startsWith('file:') ||
    version.startsWith('workspace:')
  ) {
    return undefined;
  }

  const normalized = version.startsWith('/') ? version.slice(1) : version;
  if (normalized.startsWith(`${depName}@`)) {
    return normalized;
  }
  return `${depName}@${normalized}`;
}

export function findPackageKeyByName(
  pnpmLock: PnpmLock | undefined,
  depName: string,
): string | undefined {
  const matches = Object.keys(pnpmLock?.packages ?? {})
    .map((key) => (key.startsWith('/') ? key.slice(1) : key))
    .filter((key) => tryParsePnpmPackageKey(key)?.name === depName);

  return matches.length === 1 ? matches[0] : undefined;
}

export function snapshotFor(
  pnpmLock: PnpmLock | undefined,
  snapshotKey: string,
): PnpmLockSnapshot | undefined {
  const snapshots = pnpmLock?.snapshots;
  return snapshots?.[snapshotKey] ?? snapshots?.[`/${snapshotKey}`];
}

export function packageMetadataFor(
  pnpmLock: PnpmLock | undefined,
  snapshotKey: string,
): PnpmLockPackage | undefined {
  const packages = pnpmLock?.packages;
  if (!packages) {
    return undefined;
  }

  const exact = packages[snapshotKey] ?? packages[`/${snapshotKey}`];
  if (exact) {
    return exact;
  }

  const baseKey = stripPeerSuffix(snapshotKey);
  return packages[baseKey] ?? packages[`/${baseKey}`];
}

export function parsePnpmPackageKey(key: string): {
  name: string;
  version: string;
} {
  const parsed = tryParsePnpmPackageKey(key);
  if (parsed) {
    return parsed;
  }

  throw new UserError(
    `Cannot generate package-lock.json because pnpm-lock.yaml has unsupported package key \`${key}\`. Pass --no-lockfile to skip lockfile generation`,
  );
}

export function tryParsePnpmPackageKey(
  key: string,
): { name: string; version: string } | undefined {
  const normalized = stripPeerSuffix(key.startsWith('/') ? key.slice(1) : key);
  const separator = normalized.lastIndexOf('@');
  if (separator <= 0) {
    return undefined;
  }

  return {
    name: normalized.slice(0, separator),
    version: normalized.slice(separator + 1),
  };
}

function stripPeerSuffix(key: string): string {
  const peerStart = key.indexOf('(');
  return peerStart === -1 ? key : key.slice(0, peerStart);
}
