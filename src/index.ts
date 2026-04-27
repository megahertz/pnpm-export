export { Config } from './core/Config';
export { App } from './core/App';
export { Workspace } from './core/Workspace';
export { WorkspacePackage } from './core/WorkspacePackage';
export { ExportedPackages } from './core/ExportedPackages';
export { PackageJson } from './core/PackageJson';

export { readWorkspace, findWorkspaceRoot } from './operations/readWorkspace';
export { resolveDependencies } from './operations/resolveDependencies';
export { copyProjectFiles } from './operations/copyProjectFiles';
export { modifyPackageJson } from './operations/modifyPackageJson';
export { makePackageLockFile } from './operations/makePackageLockFile';

export { makeDependencies } from './core/makeDependencies';
export { UserError, InternalError } from './core/errors';
export { exportPackage } from './exportPackage';
export { parseWorkspaceYaml } from './utils/workspaceYaml';
export {
  isCatalogSpecifier,
  isWorkspaceSpecifier,
  resolveSpecifier,
  workspaceVersionSpecifier,
} from './utils/specifiers';
export { mangleDirname, relFile } from './utils/paths';

export type {
  ConfigOptions,
  Dependencies,
  DepKind,
  Logger,
  PackageJsonData,
  PnpmLock,
  WorkspaceYaml,
} from './types';
