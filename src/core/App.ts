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
}
