import type { Config } from './Config.ts';

export interface DependencyMap {
  [dependencyName: string]: string;
}

export interface PackageJsonPnpmData {
  [key: string]: unknown;
  catalog?: unknown;
  catalogs?: unknown;
  overrides?: DependencyMap;
  patchedDependencies?: DependencyMap;
}

export interface PackageJsonData {
  [key: string]: unknown;
  bin?: Record<string, string> | string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  engines?: Record<string, string>;
  exports?: unknown;
  files?: string[];
  main?: string;
  module?: string;
  name?: string;
  optionalDependencies?: DependencyMap;
  optionalDependenciesMeta?: Record<string, unknown>;
  overrides?: Record<string, string>;
  packageManager?: string;
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  pnpm?: PackageJsonPnpmData;
  private?: boolean;
  publishConfig?: Record<string, unknown>;
  scripts?: Record<string, string>;
  type?: string;
  version?: string;
  workspaces?: unknown;
}

export interface PackageLockData {
  lockfileVersion: 3;
  name?: string;
  packages: Record<string, PackageLockPackage>;
  requires: true;
  version?: string;
}

export interface PackageLockPackage {
  bin?: Record<string, string> | string;
  cpu?: string[];
  dependencies?: DependencyMap;
  dev?: true;
  devDependencies?: DependencyMap;
  devOptional?: true;
  engines?: Record<string, string>;
  hasInstallScript?: boolean;
  integrity?: string;
  libc?: string[];
  link?: true;
  name?: string;
  optional?: true;
  optionalDependencies?: DependencyMap;
  optionalDependenciesMeta?: Record<string, unknown>;
  os?: string[];
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  resolved?: string;
  version?: string;
}

export interface WorkspaceYaml {
  catalog: Record<string, string>;
  catalogs: Record<string, Record<string, string>>;
  overrides: Record<string, string>;
  packages: string[];
  patchedDependencies: Record<string, string>;
}

export interface RawWorkspaceYaml {
  [key: string]: unknown;
  catalog?: unknown;
  catalogs?: unknown;
  overrides?: unknown;
  packages?: unknown;
  patchedDependencies?: unknown;
}

export type PatchDependenciesMode = 'ignore' | 'try-replace' | 'warning';

export type DepKind =
  | 'dependencies'
  | 'devDependencies'
  | 'optionalDependencies'
  | 'peerDependencies';

export interface ConfigOptions {
  clean?: boolean;
  cwd?: string;
  devDependencies?: boolean;
  dryRun?: boolean;
  lockfile?: boolean;
  optionalDependencies?: boolean;
  output?: string;
  patchDependencies?: PatchDependenciesMode;
  peerDependencies?: boolean;
  silent?: boolean;
}

export interface Logger {
  debug(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  readonly warningCount?: number;
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
  [key: string]: unknown;
  dependencies?: Record<string, PnpmLockDependency | string>;
  devDependencies?: Record<string, PnpmLockDependency | string>;
  optionalDependencies?: Record<string, PnpmLockDependency | string>;
  peerDependencies?: Record<string, PnpmLockDependency | string>;
}

export interface PnpmLockPackage {
  [key: string]: unknown;
  bin?: Record<string, string> | string;
  cpu?: string[];
  dependencies?: DependencyMap;
  engines?: Record<string, string>;
  hasBin?: boolean;
  libc?: string[];
  optionalDependencies?: DependencyMap;
  os?: string[];
  peerDependencies?: DependencyMap;
  peerDependenciesMeta?: Record<string, unknown>;
  requiresBuild?: boolean;
  resolution?: {
    [key: string]: unknown;
    integrity?: string;
    tarball?: string;
  };
}

export interface PnpmLockSnapshot {
  [key: string]: unknown;
  dependencies?: DependencyMap;
  optional?: boolean;
  optionalDependencies?: DependencyMap;
  transitivePeerDependencies?: string[];
}

export interface PnpmLock {
  [key: string]: unknown;
  importers?: Record<string, PnpmLockImporter>;
  lockfileVersion?: number | string;
  packages?: Record<string, PnpmLockPackage>;
  snapshots?: Record<string, PnpmLockSnapshot>;
}
