import { UserError } from '../../core/errors.ts';
import type {
  PackageLockData,
  PackageLockPackage,
} from '../../core/types.ts';
import { externalPackageEntry } from './externalEntries.ts';
import {
  type LockContext,
  nodeModulesPath,
  requireManifest,
  sortPackageEntries,
  workspacePackageEntryPath,
} from './internals.ts';
import { collectLinkEntries } from './linkEntries.ts';
import { manifestPackageEntry } from './manifestEntries.ts';

export function assembleLockData(context: LockContext): PackageLockData {
  const exported = context.app.requireExported();
  const rootManifest = requireManifest(context, exported.root);
  const packages: Record<string, PackageLockPackage> = {};
  packages[''] = manifestPackageEntry(rootManifest, {
    includeName: true,
    flags: { dev: false, optional: false },
  });

  for (const [key, entry] of collectLinkEntries(context)) {
    packages[key] = entry;
  }

  for (const pkg of exported.members) {
    const entryPath = workspacePackageEntryPath(pkg);
    const flags = context.workspaceStates.get(pkg) ?? {
      dev: false,
      optional: false,
    };
    packages[entryPath] = manifestPackageEntry(requireManifest(context, pkg), {
      includeName: false,
      flags,
    });
  }

  const externalNodePaths = new Map<string, string>();
  for (const external of [...context.externalStates.values()].toSorted((a, b) =>
    nodeModulesPath(a.name).localeCompare(nodeModulesPath(b.name)),
  )) {
    const entryPath = nodeModulesPath(external.name);
    const existing = externalNodePaths.get(entryPath);
    if (existing && existing !== external.snapshotKey) {
      throw new UserError(
        `Cannot generate package-lock.json because \`${external.name}\` is locked to multiple versions. Pass --no-lockfile to skip lockfile generation`,
      );
    }
    externalNodePaths.set(entryPath, external.snapshotKey);
    packages[entryPath] = externalPackageEntry(context, external);
  }

  return {
    ...(typeof rootManifest.name === 'string'
      ? { name: rootManifest.name }
      : {}),
    ...(typeof rootManifest.version === 'string'
      ? { version: rootManifest.version }
      : {}),
    lockfileVersion: 3,
    requires: true,
    packages: sortPackageEntries(packages),
  };
}
