import { PackageJson } from '../../core/PackageJson.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { applyPatchPackage } from './applyPatchPackage.ts';
import type { ModifyContext } from './internals.ts';
import { rewriteDeps } from './rewriteDeps.ts';
import { stripPnpmFields } from './stripPnpmFields.ts';
import { stripPnpmScripts } from './stripPnpmScripts.ts';
import { translateOverrides } from './translateOverrides.ts';
import { warnAndIgnoreCatalogOverrides } from './warnAndIgnoreCatalogOverrides.ts';

export function modifyOnePackageJson(
  pkg: WorkspacePackage,
  ctx: ModifyContext,
): PackageJson {
  const packageJson = new PackageJson({ pkg });
  warnAndIgnoreCatalogOverrides(packageJson, ctx);
  stripPnpmScripts(packageJson);
  rewriteDeps(packageJson, ctx);
  translateOverrides(packageJson, ctx);
  if (pkg === ctx.exported.root) {
    applyPatchPackage(packageJson, ctx);
  }
  stripPnpmFields(packageJson);
  return packageJson;
}
