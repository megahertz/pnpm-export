import type { PackageJsonData } from './types.ts';
import type { WorkspacePackage } from './WorkspacePackage.ts';

export class PackageJson {
  readonly pkg: WorkspacePackage;
  data: PackageJsonData;

  constructor({
    pkg,
    data,
  }: {
    pkg: WorkspacePackage;
    data?: PackageJsonData;
  }) {
    this.pkg = pkg;
    this.data = data ?? structuredClone(pkg.manifest);
  }

  toJSON(): PackageJsonData {
    return structuredClone(this.data);
  }
}
