import type { PackageJson } from '../../core/PackageJson.ts';
import type { DependencyMap } from '../../core/types.ts';
import {
  isCatalogSpecifier,
  isWorkspaceSpecifier,
  workspaceVersionSpecifier,
} from '../../utils/specifiers.ts';
import { type ModifyContext, readDependencyMap } from './internals.ts';

export function translateOverrides(
  packageJson: PackageJson,
  ctx: ModifyContext,
): void {
  const { data, pkg } = packageJson;
  const existing = readDependencyMap(data.overrides);
  const translated: DependencyMap = {};
  const sources: DependencyMap[] = [];

  for (const [key, value] of Object.entries(existing)) {
    translated[key] = translateOverrideValue(key, value, ctx);
  }

  if (pkg === ctx.exported.root) {
    sources.push(ctx.workspace.overrides);
  }

  if (pkg.manifest.pnpm?.overrides) {
    sources.push(pkg.manifest.pnpm.overrides);
  }

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (key.includes('>')) {
        ctx.logger.warn(
          `⚠ pnpm-export: pnpm.overrides has nested form \`${key}\` which has no direct npm equivalent - output may resolve different versions than your workspace. Pin manually or wait for v2.`,
        );
        continue;
      }

      const translatedValue = translateOverrideValue(key, value, ctx);
      if (
        translated[key] !== undefined &&
        translated[key] !== translatedValue
      ) {
        ctx.logger.warn(
          `⚠ pnpm-export: pnpm.overrides value for \`${key}\` overrides existing npm overrides value.`,
        );
      }
      translated[key] = translatedValue;
    }
  }

  if (Object.keys(translated).length > 0) {
    data.overrides = translated;
  } else {
    delete data.overrides;
  }
}

function translateOverrideValue(
  key: string,
  value: string,
  ctx: ModifyContext,
): string {
  if (isWorkspaceSpecifier(value)) {
    const target = ctx.workspace.getByName(key);
    return target ? workspaceVersionSpecifier(value, target) : value;
  }

  if (isCatalogSpecifier(value)) {
    return ctx.workspace.resolveCatalog(value, key);
  }

  return value;
}
