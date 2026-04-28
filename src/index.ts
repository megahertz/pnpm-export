export { Config } from './core/Config.ts';
export { App } from './core/App.ts';
export { Workspace } from './core/Workspace.ts';
export { WorkspacePackage } from './core/WorkspacePackage.ts';
export { ExportedPackages } from './core/ExportedPackages.ts';
export { PackageJson } from './core/PackageJson.ts';

export {
  readWorkspace,
  findWorkspaceRoot,
} from './operations/readWorkspace.ts';
export { resolveDependencies } from './operations/resolveDependencies.ts';
export { copyProjectFiles } from './operations/copyProjectFiles.ts';
export { modifyPackageJson } from './operations/modifyPackageJson.ts';
export { makePackageLockFile } from './operations/makePackageLockFile.ts';

export { makeDependencies } from './core/makeDependencies.ts';
export { UserError, InternalError } from './core/errors.ts';
export { pnpmExport } from './pnpmExport.ts';
export { parseWorkspaceYaml } from './utils/workspaceYaml.ts';
export {
  isCatalogSpecifier,
  isWorkspaceSpecifier,
  resolveSpecifier,
  workspaceVersionSpecifier,
} from './utils/specifiers.ts';
export { mangleDirname, relFile } from './utils/paths.ts';

export type {
  ConfigOptions,
  Dependencies,
  DepKind,
  Logger,
  PackageLockData,
  PackageLockPackage,
  PackageJsonData,
  PnpmLock,
  WorkspaceYaml,
} from './core/types.ts';
