import type { PackageJson } from '../../core/PackageJson.ts';
import {
  type ModifyContext,
  collectPatches,
  readDependencyMap,
} from './internals.ts';

export function applyPatchPackage(
  packageJson: PackageJson,
  ctx: ModifyContext,
): void {
  const { data, pkg } = packageJson;
  const patches = collectPatches(pkg.manifest, ctx.workspace);
  const patchNames = Object.keys(patches);
  if (patchNames.length === 0) {
    return;
  }

  if (ctx.config.patchDependencies === 'warning') {
    ctx.logger.warn(
      `⚠ pnpm-export: stripped pnpm.patchedDependencies for ${patchNames.join(', ')}.`,
    );
    return;
  }

  if (ctx.config.patchDependencies === 'ignore') {
    return;
  }

  const dependencies = readDependencyMap(data.dependencies);
  dependencies['patch-package'] = dependencies['patch-package'] ?? '^8.0.0';
  data.dependencies = dependencies;

  const scripts = { ...data.scripts };
  const { postinstall } = scripts;
  scripts.postinstall = postinstall
    ? `patch-package && ${postinstall}`
    : 'patch-package';
  data.scripts = scripts;
}
