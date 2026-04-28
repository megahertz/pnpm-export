import type { Config } from './Config.ts';
import { InternalError } from './errors.ts';
import type { ExportedPackages } from './ExportedPackages.ts';
import type { PackageJson } from './PackageJson.ts';
import type { Dependencies, Logger } from './types.ts';
import type { Workspace } from './Workspace.ts';
import type { WorkspacePackage } from './WorkspacePackage.ts';

export class App {
  readonly config: Config;
  readonly logger: Logger;

  workspace?: Workspace;
  sourcePackage?: WorkspacePackage;
  exported?: ExportedPackages;
  packageJsons?: Map<WorkspacePackage, PackageJson>;
  plannedFileCount = 0;

  constructor({ deps }: { deps: Dependencies }) {
    this.config = deps.config;
    this.logger = deps.logger;
  }

  setWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
  }

  setSourcePackage(sourcePackage: WorkspacePackage): void {
    this.sourcePackage = sourcePackage;
  }

  setExportedPackages(exported: ExportedPackages): void {
    this.exported = exported;
  }

  setPackageJsons(packageJsons: Map<WorkspacePackage, PackageJson>): void {
    this.packageJsons = packageJsons;
  }

  setPlannedFileCount(plannedFileCount: number): void {
    this.plannedFileCount = plannedFileCount;
  }

  requireWorkspace(): Workspace {
    if (!this.workspace) {
      throw new InternalError('Workspace has not been read');
    }
    return this.workspace;
  }

  requireSourcePackage(): WorkspacePackage {
    if (!this.sourcePackage) {
      throw new InternalError('Source package has not been read');
    }
    return this.sourcePackage;
  }

  requireExported(): ExportedPackages {
    if (!this.exported) {
      throw new InternalError('Dependencies have not been resolved');
    }
    return this.exported;
  }

  requirePackageJsons(): Map<WorkspacePackage, PackageJson> {
    if (!this.packageJsons) {
      throw new InternalError('Package manifests have not been rewritten');
    }
    return this.packageJsons;
  }
}
