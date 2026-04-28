export { App } from './core/App.ts';
export { Config } from './core/Config.ts';
export { InternalError, UserError } from './core/errors.ts';
export { ExportedPackages } from './core/ExportedPackages.ts';
export { makeDependencies } from './core/makeDependencies.ts';
export { PackageJson } from './core/PackageJson.ts';

export type {
  ConfigOptions,
  Dependencies,
  DepKind,
  Logger,
  PackageJsonData,
  PackageLockData,
  PackageLockPackage,
  PnpmLock,
  WorkspaceYaml,
} from './core/types.ts';
export { Workspace } from './core/Workspace.ts';
export { WorkspacePackage } from './core/WorkspacePackage.ts';
export { copyProjectFiles } from './operations/copyProjectFiles/index.ts';
export { makePackageLockFile } from './operations/makePackageLockFile/index.ts';

export { modifyPackageJson } from './operations/modifyPackageJson/index.ts';
export {
  findWorkspaceRoot,
  readWorkspace,
} from './operations/readWorkspace/index.ts';
export { resolveDependencies } from './operations/resolveDependencies/index.ts';
export { pnpmExport } from './pnpmExport.ts';
export { mangleDirname, relativePathWithFileProtocol } from './utils/paths.ts';
export {
  isCatalogSpecifier,
  isWorkspaceSpecifier,
  resolveSpecifier,
  workspaceVersionSpecifier,
} from './utils/specifiers.ts';

export { parseWorkspaceYaml } from './utils/workspaceYaml.ts';
