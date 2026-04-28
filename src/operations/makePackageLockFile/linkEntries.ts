import { UserError } from '../../core/errors.ts';
import type { PackageLockPackage } from '../../core/types.ts';
import {
  dependencyEntries,
  LOCK_DEP_FIELDS,
  type LockContext,
  nodeModulesPath,
  packageEntryPath,
  requireManifest,
  resolveLocalFileTarget,
} from './internals.ts';

export function collectLinkEntries(
  context: LockContext,
): Array<[string, PackageLockPackage]> {
  const exported = context.app.requireExported();
  const links = new Map<string, PackageLockPackage>();

  for (const pkg of exported.all()) {
    const manifest = requireManifest(context, pkg);
    for (const field of LOCK_DEP_FIELDS) {
      for (const [depName, specifier] of dependencyEntries(manifest[field])) {
        const target = resolveLocalFileTarget(context, pkg, depName, specifier);
        if (!target) {
          continue;
        }

        const key = nodeModulesPath(depName);
        const entry = {
          resolved: packageEntryPath(target, exported.root),
          link: true as const,
        };
        const existing = links.get(key);
        if (existing && existing.resolved !== entry.resolved) {
          throw new UserError(
            `Cannot generate package-lock.json because local dependency \`${depName}\` resolves to both \`${existing.resolved}\` and \`${entry.resolved}\`. Pass --no-lockfile to skip lockfile generation`,
          );
        }
        links.set(key, entry);
      }
    }
  }

  return [...links.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}
