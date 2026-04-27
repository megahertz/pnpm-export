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
  verbose?: boolean;
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

export interface PnpmLock {
  [key: string]: unknown;
}
