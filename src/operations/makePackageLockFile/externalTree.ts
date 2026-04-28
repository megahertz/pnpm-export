import {
  dependencyEntries,
  type ExternalState,
  flagsForField,
  isFileSpecifier,
  LOCK_DEP_FIELDS,
  type LockContext,
  type LockFlags,
  mergeLockFlags,
  nodeModulesPath,
  packageEntryPath,
  requireManifest,
  resolveLocalFileTarget,
} from './internals.ts';
import {
  packageMetadataFor,
  snapshotFor,
  snapshotKeyFromVersion,
} from './pnpmKeys.ts';
import { resolveDirectSnapshotKey } from './walkLockClosure.ts';

export function collectExternalTreeEntries(
  context: LockContext,
): Array<[string, ExternalState]> {
  const tree = createExternalTree(context);
  placeWorkspaceExternalDependencies(tree);
  processExternalQueue(tree);
  return sortedExternalEntries(tree);
}

function createExternalTree(context: LockContext): ExternalTree {
  return {
    context,
    placements: new Map(),
    queue: [],
  };
}

function placeWorkspaceExternalDependencies(tree: ExternalTree): void {
  const exported = tree.context.app.requireExported();
  for (const pkg of exported.all()) {
    const flags = tree.context.workspaceStates.get(pkg) ?? {
      dev: false,
      optional: false,
    };
    const parentPath = packageEntryPath(pkg, exported.root);
    const manifest = requireManifest(tree.context, pkg);

    for (const field of LOCK_DEP_FIELDS) {
      for (const [depName, specifier] of sortedDependencyEntries(
        manifest[field],
      )) {
        const localTarget = resolveLocalFileTarget(
          tree.context,
          pkg,
          depName,
          specifier,
        );
        if (localTarget || isFileSpecifier(specifier)) {
          continue;
        }

        const snapshotKey = resolveDirectSnapshotKey(
          tree.context,
          pkg,
          field,
          depName,
          specifier,
        );
        if (snapshotKey) {
          placeExternal(
            tree,
            parentPath,
            depName,
            snapshotKey,
            flagsForField(flags, field),
          );
        }
      }
    }
  }
}

function processExternalQueue(tree: ExternalTree): void {
  while (tree.queue.length > 0) {
    const placement = tree.queue.shift();
    if (placement) {
      placeExternalDependencies(tree, placement);
    }
  }
}

function placeExternalDependencies(
  tree: ExternalTree,
  placement: ExternalPlacement,
): void {
  const snapshot = snapshotFor(tree.context.pnpmLock, placement.snapshotKey);
  const metadata = packageMetadataFor(
    tree.context.pnpmLock,
    placement.snapshotKey,
  );

  for (const [depName, version] of sortedDependencyEntries(
    snapshot?.dependencies ?? metadata?.dependencies,
  )) {
    const snapshotKey = snapshotKeyFromVersion(depName, version);
    if (snapshotKey) {
      placeExternal(
        tree,
        placement.path,
        depName,
        snapshotKey,
        placement.flags,
      );
    }
  }

  for (const [depName, version] of sortedDependencyEntries(
    snapshot?.optionalDependencies ?? metadata?.optionalDependencies,
  )) {
    const snapshotKey = snapshotKeyFromVersion(depName, version);
    if (snapshotKey) {
      placeExternal(tree, placement.path, depName, snapshotKey, {
        dev: placement.flags.dev,
        optional: true,
      });
    }
  }
}

function placeExternal(
  tree: ExternalTree,
  parentPath: string,
  name: string,
  snapshotKey: string,
  flags: LockFlags,
): void {
  const path = placementPath(tree, parentPath, name, snapshotKey);
  const existing = tree.placements.get(path);
  if (existing) {
    mergePlacementFlags(tree, existing, flags);
    return;
  }

  const placement = { flags, name, path, snapshotKey };
  tree.placements.set(path, placement);
  tree.queue.push(placement);
}

function placementPath(
  tree: ExternalTree,
  parentPath: string,
  name: string,
  snapshotKey: string,
): string {
  let selected: string | undefined;
  for (const targetPath of ancestry(parentPath)) {
    const path = dependencyPath(targetPath, name);
    const existing = tree.placements.get(path);
    if (!existing || existing.snapshotKey === snapshotKey) {
      selected = path;
      continue;
    }
    break;
  }

  return selected ?? dependencyPath(parentPath, name);
}

function mergePlacementFlags(
  tree: ExternalTree,
  placement: ExternalPlacement,
  flags: LockFlags,
): void {
  const next = mergeLockFlags(placement.flags, flags);
  if (
    next.dev === placement.flags.dev &&
    next.optional === placement.flags.optional
  ) {
    return;
  }

  const updated = { ...placement, flags: next };
  tree.placements.set(updated.path, updated);
  tree.queue.push(updated);
}

function sortedExternalEntries(
  tree: ExternalTree,
): Array<[string, ExternalState]> {
  return [...tree.placements.entries()].toSorted(([a], [b]) =>
    a.localeCompare(b),
  );
}

function sortedDependencyEntries(value: unknown): Array<[string, string]> {
  return dependencyEntries(value).toSorted(([a], [b]) => a.localeCompare(b));
}

function dependencyPath(parentPath: string, name: string): string {
  return parentPath
    ? `${parentPath}/${nodeModulesPath(name)}`
    : nodeModulesPath(name);
}

function* ancestry(path: string): Generator<string> {
  let current = path;
  while (true) {
    yield current;
    if (!current) {
      return;
    }
    current = parentPackagePath(current);
  }
}

function parentPackagePath(path: string): string {
  const marker = '/node_modules/';
  const markerIndex = path.lastIndexOf(marker);
  if (markerIndex !== -1) {
    return path.slice(0, markerIndex);
  }
  if (path.startsWith('node_modules/')) {
    return '';
  }
  return '';
}

interface ExternalTree {
  context: LockContext;
  placements: Map<string, ExternalPlacement>;
  queue: ExternalPlacement[];
}

interface ExternalPlacement extends ExternalState {
  path: string;
}
