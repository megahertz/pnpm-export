import path from 'node:path';
import { InternalError, UserError } from '../../core/errors.ts';
import type {
  DepKind,
  PnpmLockDependency,
  PnpmLockImporter,
} from '../../core/types.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { toPosixPath } from '../../utils/paths.ts';
import {
  dependencyEntries,
  type ExternalState,
  flagsForField,
  isFileSpecifier,
  LOCK_DEP_FIELDS,
  type LockContext,
  type LockFlags,
  mergeLockFlags,
  requireManifest,
  resolveLocalFileTarget,
} from './internals.ts';
import {
  findPackageKeyByName,
  packageMetadataFor,
  snapshotFor,
  snapshotKeyFromVersion,
} from './pnpmKeys.ts';

export function walkLockClosure(context: LockContext): void {
  const exported = context.app.requireExported();
  markWorkspace(context, exported.root, { dev: false, optional: false });
  processQueues(context);
}

export function markWorkspace(
  context: LockContext,
  pkg: WorkspacePackage,
  flags: LockFlags,
): void {
  if (mergeFlags(context.workspaceStates, pkg, flags)) {
    context.workspaceQueue.push(pkg);
  }
}

export function markExternal(
  context: LockContext,
  name: string,
  snapshotKey: string,
  flags: LockFlags,
): void {
  const existing = context.externalStates.get(snapshotKey);
  if (!existing) {
    const external = { name, snapshotKey, flags };
    context.externalStates.set(snapshotKey, external);
    context.externalQueue.push(external);
    return;
  }

  if (existing.name !== name) {
    throw new UserError(
      `Cannot generate package-lock.json because pnpm-lock.yaml maps \`${name}\` and \`${existing.name}\` to the same package key \`${snapshotKey}\`. Pass --no-lockfile to skip lockfile generation`,
    );
  }

  const next = mergeLockFlags(existing.flags, flags);
  if (
    next.dev !== existing.flags.dev ||
    next.optional !== existing.flags.optional
  ) {
    existing.flags = next;
    context.externalQueue.push(existing);
  }
}

function processQueues(context: LockContext): void {
  while (
    context.workspaceQueue.length > 0 ||
    context.externalQueue.length > 0
  ) {
    const workspacePkg = context.workspaceQueue.shift();
    if (workspacePkg) {
      processWorkspacePackage(context, workspacePkg);
      continue;
    }

    const external = context.externalQueue.shift();
    if (external) {
      processExternalPackage(context, external);
    }
  }
}

function processWorkspacePackage(
  context: LockContext,
  pkg: WorkspacePackage,
): void {
  const exported = context.app.requireExported();
  const manifest = requireManifest(context, pkg);
  const flags = context.workspaceStates.get(pkg);
  if (!flags) {
    throw new InternalError(`No lockfile state for package ${pkg.name}`);
  }

  for (const field of LOCK_DEP_FIELDS) {
    for (const [depName, specifier] of dependencyEntries(manifest[field])) {
      const childFlags = flagsForField(flags, field);
      const localTarget = resolveLocalFileTarget(
        context,
        pkg,
        depName,
        specifier,
      );

      if (localTarget) {
        markWorkspace(context, localTarget, childFlags);
        continue;
      }

      if (isFileSpecifier(specifier)) {
        continue;
      }

      const snapshotKey = resolveDirectSnapshotKey(
        context,
        pkg,
        field,
        depName,
        specifier,
      );
      if (snapshotKey) {
        markExternal(context, depName, snapshotKey, childFlags);
      }
    }
  }

  if (!exported.has(pkg)) {
    throw new InternalError(`Package ${pkg.name} is not in the export set`);
  }
}

function processExternalPackage(
  context: LockContext,
  external: ExternalState,
): void {
  const snapshot = snapshotFor(context.pnpmLock, external.snapshotKey);
  const metadata = packageMetadataFor(context.pnpmLock, external.snapshotKey);
  const dependencies = dependencyEntries(
    snapshot?.dependencies ?? metadata?.dependencies,
  );
  const optionalDependencies = dependencyEntries(
    snapshot?.optionalDependencies ?? metadata?.optionalDependencies,
  );

  for (const [depName, version] of dependencies) {
    const snapshotKey = snapshotKeyFromVersion(depName, version);
    if (snapshotKey) {
      markExternal(context, depName, snapshotKey, external.flags);
    }
  }

  for (const [depName, version] of optionalDependencies) {
    const snapshotKey = snapshotKeyFromVersion(depName, version);
    if (snapshotKey) {
      markExternal(context, depName, snapshotKey, {
        dev: external.flags.dev,
        optional: true,
      });
    }
  }
}

function mergeFlags<T>(
  map: Map<T, LockFlags>,
  key: T,
  incoming: LockFlags,
): boolean {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, incoming);
    return true;
  }

  const next = mergeLockFlags(existing, incoming);
  if (next.dev === existing.dev && next.optional === existing.optional) {
    return false;
  }

  map.set(key, next);
  return true;
}

export function resolveDirectSnapshotKey(
  context: LockContext,
  pkg: WorkspacePackage,
  field: DepKind,
  depName: string,
  specifier: string,
): string | undefined {
  const importer = importerFor(context, pkg);
  const version = findImporterDependencyVersion(importer, field, depName);
  const fromImporter = version
    ? snapshotKeyFromVersion(depName, version)
    : undefined;
  if (fromImporter) {
    return fromImporter;
  }

  const fromPackages = findPackageKeyByName(context.pnpmLock, depName);
  if (fromPackages) {
    return fromPackages;
  }

  if (depName === 'patch-package') {
    return undefined;
  }

  const lockfileHint = context.pnpmLock
    ? 'does not contain'
    : 'was not found, so it cannot lock';
  throw new UserError(
    `Cannot generate package-lock.json because pnpm-lock.yaml ${lockfileHint} dependency \`${depName}\` (${specifier}) for package \`${pkg.name}\`. Run \`pnpm install\` or pass \`--no-lockfile\``,
  );
}

function importerFor(
  context: LockContext,
  pkg: WorkspacePackage,
): PnpmLockImporter | undefined {
  const importers = context.pnpmLock?.importers;
  if (!importers) {
    return undefined;
  }

  const workspace = context.app.requireWorkspace();
  const key = toPosixPath(path.relative(workspace.root, pkg.dir)) || '.';
  return importers[key];
}

function findImporterDependencyVersion(
  importer: PnpmLockImporter | undefined,
  preferredField: DepKind,
  depName: string,
): string | undefined {
  const fields = [
    preferredField,
    ...LOCK_DEP_FIELDS.filter((field) => field !== preferredField),
  ];

  for (const field of fields) {
    const entry = importer?.[field]?.[depName];
    const version = importerDependencyVersion(entry);
    if (version) {
      return version;
    }
  }
  return undefined;
}

function importerDependencyVersion(
  entry: PnpmLockDependency | string | undefined,
): string | undefined {
  if (typeof entry === 'string') {
    return entry;
  }
  return typeof entry?.version === 'string' ? entry.version : undefined;
}
