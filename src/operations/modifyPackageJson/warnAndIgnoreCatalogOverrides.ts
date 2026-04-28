import type { PackageJson } from '../../core/PackageJson.ts';
import type { ModifyContext } from './internals.ts';

export function warnAndIgnoreCatalogOverrides(
  packageJson: PackageJson,
  ctx: ModifyContext,
): void {
  const { manifest } = packageJson.pkg;
  if (manifest.pnpm?.catalog || manifest.pnpm?.catalogs) {
    ctx.logger.warn(
      `⚠ pnpm-export: ${packageJson.pkg.name} uses per-package pnpm.catalog overrides, which are ignored in v1.`,
    );
  }
}
