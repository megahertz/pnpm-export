import type { PackageLockData, PackageLockPackage } from '../../core/types.ts';
import { externalPackageEntry } from './externalEntries.ts';
import { collectExternalTreeEntries } from './externalTree.ts';
import {
  type LockContext,
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

  for (const [entryPath, external] of collectExternalTreeEntries(context)) {
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
