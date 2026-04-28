import type { Config } from './Config.ts';

export interface DependencyMap {
  [dependencyName: string]: string;
}

export interface PackageJsonPnpmData {
  overrides?: DependencyMap;
  patchedDependencies?: DependencyMap;
  catalog?: unknown;
  catalogs?: unknown;
  [key: string]: unknown;
}

export interface PackageJsonData {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  exports?: unknown;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  optionalDependenciesMeta?: Record<string, unknown>;
  engines?: Record<string, string>;
  workspaces?: unknown;
  packageManager?: string;
  pnpm?: PackageJsonPnpmData;
  overrides?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PackageLockData {
  name?: string;
  version?: string;
  lockfileVersion: 3;
  requires: true;
  packages: Record<string, PackageLockPackage>;
}

export interface PackageLockPackage {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: true;
  dev?: true;
  optional?: true;
  devOptional?: true;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  optionalDependenciesMeta?: Record<string, unknown>;
  bin?: string | Record<string, string>;
  engines?: Record<string, string>;
  cpu?: string[];
  os?: string[];
  libc?: string[];
  hasInstallScript?: boolean;
}

export interface WorkspaceYaml {
  packages: string[];
  catalog: Record<string, string>;
  catalogs: Record<string, Record<string, string>>;
  overrides: Record<string, string>;
  patchedDependencies: Record<string, string>;
}

export interface RawWorkspaceYaml {
  packages?: unknown;
  catalog?: unknown;
  catalogs?: unknown;
  overrides?: unknown;
  patchedDependencies?: unknown;
  [key: string]: unknown;
}

export type PatchDependenciesMode = 'ignore' | 'warning' | 'try-replace';

export type DepKind =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

export interface ConfigOptions {
  cwd?: string;
  output?: string;
  devDependencies?: boolean;
  peerDependencies?: boolean;
  optionalDependencies?: boolean;
  clean?: boolean;
  lockfile?: boolean;
  dryRun?: boolean;
  silent?: boolean;
  patchDependencies?: PatchDependenciesMode;
}

export interface Logger {
  readonly warningCount?: number;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface Dependencies {
  config: Config;
  logger: Logger;
}

export interface PnpmLockDependency {
  specifier?: string;
  version?: string;
}

export interface PnpmLockImporter {
  dependencies?: Record<string, PnpmLockDependency | string>;
  devDependencies?: Record<string, PnpmLockDependency | string>;
  optionalDependencies?: Record<string, PnpmLockDependency | string>;
  peerDependencies?: Record<string, PnpmLockDependency | string>;
  [key: string]: unknown;
}

export interface PnpmLockPackage {
  resolution?: {
    integrity?: string;
    tarball?: string;
    [key: string]: unknown;
  };
  dependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  engines?: Record<string, string>;
  bin?: string | Record<string, string>;
  cpu?: string[];
  os?: string[];
  libc?: string[];
  hasBin?: boolean;
  requiresBuild?: boolean;
  [key: string]: unknown;
}

export interface PnpmLockSnapshot {
  dependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  transitivePeerDependencies?: string[];
  optional?: boolean;
  [key: string]: unknown;
}

export interface PnpmLock {
  lockfileVersion?: string | number;
  importers?: Record<string, PnpmLockImporter>;
  packages?: Record<string, PnpmLockPackage>;
  snapshots?: Record<string, PnpmLockSnapshot>;
  [key: string]: unknown;
}
