import type { App } from '../../core/App.ts';
import type { PackageJson } from '../../core/PackageJson.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { makeModifyContext } from './makeModifyContext.ts';
import { modifyOnePackageJson } from './modifyOnePackageJson.ts';

export function buildPackageJsons(app: App): void {
  const exported = app.requireExported();
  const ctx = makeModifyContext(app);
  const packageJsons = new Map<WorkspacePackage, PackageJson>();
  for (const pkg of exported.all()) {
    packageJsons.set(pkg, modifyOnePackageJson(pkg, ctx));
  }
  app.setPackageJsons(packageJsons);
}
