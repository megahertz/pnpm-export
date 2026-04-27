import type { Config } from './core/Config.ts';

export type DependencyMap = Record<string, string>;

export type PackageJsonData = {
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
  pnpm?: {
    overrides?: Record<string, string>;
    patchedDependencies?: Record<string, string>;
    catalog?: unknown;
    catalogs?: unknown;
    [key: string]: unknown;
  };
  overrides?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
  [key: string]: unknown;
};

export type WorkspaceYaml = {
  packages: string[];
  catalog: Record<string, string>;
  catalogs: Record<string, Record<string, string>>;
  overrides: Record<string, string>;
  patchedDependencies: Record<string, string>;
};

export type RawWorkspaceYaml = {
  packages?: unknown;
  catalog?: unknown;
  catalogs?: unknown;
  overrides?: unknown;
  patchedDependencies?: unknown;
  [key: string]: unknown;
};

export type PatchDependenciesMode = 'ignore' | 'warning' | 'try-replace';

export type DepKind =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

export type ConfigOptions = {
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
};

export type Logger = {
  readonly warningCount?: number;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
};

export type Dependencies = {
  config: Config;
  logger: Logger;
};

export type PnpmLock = Record<string, unknown>;
