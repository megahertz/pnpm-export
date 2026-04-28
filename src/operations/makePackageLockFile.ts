import path from 'node:path';
import type { App } from '../core/App.ts';
import { InternalError, UserError } from '../core/errors.ts';
import type {
  DependencyMap,
  DepKind,
  PackageJsonData,
  PackageLockData,
  PackageLockPackage,
  PnpmLock,
  PnpmLockDependency,
  PnpmLockImporter,
  PnpmLockPackage,
  PnpmLockSnapshot,
} from '../core/types.ts';
import type { WorkspacePackage } from '../core/WorkspacePackage.ts';
import { pathExists } from '../utils/fs.ts';
import { writeJson } from '../utils/json.ts';
import { toPosixPath } from '../utils/paths.ts';
import { readYaml } from '../utils/yaml.ts';

const LOCK_DEP_FIELDS: DepKind[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

interface LockFlags {
  dev: boolean;
  optional: boolean;
}

interface LockContext {
  app: App;
  pnpmLock?: PnpmLock;
  manifests: Map<WorkspacePackage, PackageJsonData>;
  workspaceStates: Map<WorkspacePackage, LockFlags>;
  externalStates: Map<string, ExternalState>;
  workspaceQueue: WorkspacePackage[];
  externalQueue: ExternalState[];
}

interface ExternalState {
  name: string;
  snapshotKey: string;
  flags: LockFlags;
}

export async function makePackageLockFile(app: App): Promise<void> {
  if (!app.config.lockfile || app.config.dryRun) {
    return;
  }

  const lockfile = await readPnpmLock(app);
  const packageLock = buildPackageLock(app, lockfile);
  await writeJson(
    path.join(app.config.output, 'package-lock.json'),
    packageLock,
  );
}

async function readPnpmLock(app: App): Promise<PnpmLock | undefined> {
  const workspace = app.requireWorkspace();
  const lockfilePath = path.join(workspace.root, 'pnpm-lock.yaml');
  if (!(await pathExists(lockfilePath))) {
    return undefined;
  }
  return readYaml<PnpmLock>(lockfilePath);
}

function buildPackageLock(
  app: App,
  pnpmLock: PnpmLock | undefined,
): PackageLockData {
  const exported = app.requireExported();
  const manifests = collectManifestMap(app);
  const context: LockContext = {
    app,
    pnpmLock,
    manifests,
    workspaceStates: new Map(),
    externalStates: new Map(),
    workspaceQueue: [],
    externalQueue: [],
  };

  markWorkspace(context, exported.root, { dev: false, optional: false });
  processQueues(context);

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
        `Cannot generate package-lock.json because \`${external.name}\` is locked to multiple versions. Pass --no-lockfile to skip lockfile generation.`,
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

function collectManifestMap(app: App): Map<WorkspacePackage, PackageJsonData> {
  const { packageJsons } = app;
  if (!packageJsons) {
    throw new InternalError('Package manifests have not been rewritten.');
  }

  const manifests = new Map<WorkspacePackage, PackageJsonData>();
  for (const [pkg, packageJson] of packageJsons) {
    manifests.set(pkg, packageJson.toJSON());
  }
  return manifests;
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
    throw new InternalError(`No lockfile state for package ${pkg.name}.`);
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
      markExternal(context, depName, snapshotKey, childFlags);
    }
  }

  if (!exported.has(pkg)) {
    throw new InternalError(`Package ${pkg.name} is not in the export set.`);
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

function markWorkspace(
  context: LockContext,
  pkg: WorkspacePackage,
  flags: LockFlags,
): void {
  if (mergeFlags(context.workspaceStates, pkg, flags)) {
    context.workspaceQueue.push(pkg);
  }
}

function markExternal(
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
      `Cannot generate package-lock.json because pnpm-lock.yaml maps \`${name}\` and \`${existing.name}\` to the same package key \`${snapshotKey}\`. Pass --no-lockfile to skip lockfile generation.`,
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

function mergeLockFlags(a: LockFlags, b: LockFlags): LockFlags {
  return {
    dev: a.dev && b.dev,
    optional: a.optional && b.optional,
  };
}

function flagsForField(parent: LockFlags, field: DepKind): LockFlags {
  return {
    dev: parent.dev || field === 'devDependencies',
    optional: parent.optional || field === 'optionalDependencies',
  };
}

function resolveDirectSnapshotKey(
  context: LockContext,
  pkg: WorkspacePackage,
  field: DepKind,
  depName: string,
  specifier: string,
): string {
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

  const lockfileHint = context.pnpmLock
    ? 'does not contain'
    : 'was not found, so it cannot lock';
  throw new UserError(
    `Cannot generate package-lock.json because pnpm-lock.yaml ${lockfileHint} dependency \`${depName}\` (${specifier}) for package \`${pkg.name}\`. Run \`pnpm install\` or pass \`--no-lockfile\`.`,
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

function resolveLocalFileTarget(
  context: LockContext,
  from: WorkspacePackage,
  depName: string,
  specifier: string,
): WorkspacePackage | undefined {
  if (!isFileSpecifier(specifier)) {
    return undefined;
  }

  const exported = context.app.requireExported();
  const target =
    depName === exported.root.name
      ? exported.root
      : [...exported.members].find((pkg) => pkg.name === depName);
  if (!target) {
    return undefined;
  }

  const expected = path.resolve(exported.outputPathFor(target));
  const actual = path.resolve(
    exported.outputPathFor(from),
    specifier.slice('file:'.length),
  );
  return actual === expected ? target : undefined;
}

function collectLinkEntries(
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
            `Cannot generate package-lock.json because local dependency \`${depName}\` resolves to both \`${existing.resolved}\` and \`${entry.resolved}\`. Pass --no-lockfile to skip lockfile generation.`,
          );
        }
        links.set(key, entry);
      }
    }
  }

  return [...links.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

function manifestPackageEntry(
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

function externalPackageEntry(
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

function copyDependencyField(
  entry: PackageLockPackage,
  manifest: PackageJsonData,
  field: DepKind,
): void {
  if (manifest[field] !== undefined) {
    copyDependencyMap(entry, field, readDependencyMap(manifest[field]));
  }
}

function copyDependencyMap(
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

function applyPackageFlags(entry: PackageLockPackage, flags: LockFlags): void {
  if (flags.dev && flags.optional) {
    entry.devOptional = true;
  } else if (flags.dev) {
    entry.dev = true;
  } else if (flags.optional) {
    entry.optional = true;
  }
}

function requireManifest(
  context: LockContext,
  pkg: WorkspacePackage,
): PackageJsonData {
  const manifest = context.manifests.get(pkg);
  if (!manifest) {
    throw new InternalError(`No rewritten manifest for package ${pkg.name}.`);
  }
  return manifest;
}

function packageEntryPath(
  pkg: WorkspacePackage,
  root: WorkspacePackage,
): string {
  return pkg === root ? '' : workspacePackageEntryPath(pkg);
}

function workspacePackageEntryPath(pkg: WorkspacePackage): string {
  return `packages/${pkg.dirname}`;
}

function nodeModulesPath(packageName: string): string {
  return `node_modules/${packageName}`;
}

function dependencyEntries(value: unknown): Array<[string, string]> {
  return Object.entries(readDependencyMap(value));
}

function readDependencyMap(value: unknown): DependencyMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: DependencyMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    }
  }
  return output;
}

function isFileSpecifier(specifier: string): boolean {
  return specifier.startsWith('file:');
}

function snapshotKeyFromVersion(
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

function findPackageKeyByName(
  pnpmLock: PnpmLock | undefined,
  depName: string,
): string | undefined {
  const matches = Object.keys(pnpmLock?.packages ?? {})
    .map((key) => (key.startsWith('/') ? key.slice(1) : key))
    .filter((key) => tryParsePnpmPackageKey(key)?.name === depName);

  return matches.length === 1 ? matches[0] : undefined;
}

function snapshotFor(
  pnpmLock: PnpmLock | undefined,
  snapshotKey: string,
): PnpmLockSnapshot | undefined {
  const snapshots = pnpmLock?.snapshots;
  return snapshots?.[snapshotKey] ?? snapshots?.[`/${snapshotKey}`];
}

function packageMetadataFor(
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

function parsePnpmPackageKey(key: string): { name: string; version: string } {
  const parsed = tryParsePnpmPackageKey(key);
  if (parsed) {
    return parsed;
  }

  throw new UserError(
    `Cannot generate package-lock.json because pnpm-lock.yaml has unsupported package key \`${key}\`. Pass --no-lockfile to skip lockfile generation.`,
  );
}

function tryParsePnpmPackageKey(
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

function registryTarball(packageName: string, version: string): string {
  const tarballName = packageName.startsWith('@')
    ? packageName.slice(packageName.indexOf('/') + 1)
    : packageName;
  return `https://registry.npmjs.org/${packageName}/-/${tarballName}-${version}.tgz`;
}

function sortPackageEntries(
  packages: Record<string, PackageLockPackage>,
): Record<string, PackageLockPackage> {
  return Object.fromEntries(
    Object.entries(packages).toSorted(([a], [b]) => {
      if (a === '') {
        return -1;
      }
      if (b === '') {
        return 1;
      }
      return a.localeCompare(b);
    }),
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}
