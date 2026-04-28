import { UserError } from '../../core/errors.ts';
import type { PackageJson } from '../../core/PackageJson.ts';
import type { DependencyMap, DepKind } from '../../core/types.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import {
  DEP_FIELDS,
  isWorkspaceSpecifier,
  resolveSpecifier,
  workspaceVersionSpecifier,
} from '../../utils/specifiers.ts';
import {
  type RewriteContext,
  readDependencyMap,
  resolveWorkspaceTarget,
} from './internals.ts';

export function rewriteDeps(
  packageJson: PackageJson,
  ctx: RewriteContext,
): void {
  for (const field of DEP_FIELDS) {
    rewriteDepField(packageJson, field, ctx);
  }
}

function rewriteDepField(
  packageJson: PackageJson,
  field: DepKind,
  ctx: RewriteContext,
): void {
  const { data, pkg } = packageJson;
  const original = readDependencyMap(data[field]);
  const rewritten: DependencyMap = {};

  for (const [depName, specifier] of Object.entries(original)) {
    const target = resolveWorkspaceTarget(depName, ctx);

    if (isWorkspaceSpecifier(specifier) && !target) {
      throw new UserError(
        `Workspace dependency \`${depName}\` in package \`${pkg.name}\` was not found in the workspace registry`,
      );
    }

    if (isWorkspaceSpecifier(specifier) && target) {
      if (target === pkg) {
        throw new UserError(
          `Package \`${pkg.name}\` lists itself as a workspace dependency`,
        );
      }

      const resolved = ctx.exported.has(target)
        ? ctx.exported.relativeFileSpecifier(pkg, target)
        : dropOrVersionResolve(specifier, target);

      if (resolved) {
        rewritten[depName] = resolved;
      }
      continue;
    }

    rewritten[depName] = resolveSpecifier(specifier, depName, ctx);
  }

  if (field === 'devDependencies') {
    data.devDependencies = rewritten;
    return;
  }

  if (Object.keys(rewritten).length === 0 && data[field] === undefined) {
    delete data[field];
    return;
  }

  if (
    Object.keys(rewritten).length === 0 &&
    Object.keys(original).length === 0
  ) {
    return;
  }

  data[field] = rewritten;
}

function dropOrVersionResolve(
  specifier: string,
  target: WorkspacePackage,
): string | undefined {
  if (target.isPrivate) {
    return undefined;
  }

  const version = workspaceVersionSpecifier(specifier, target);
  if (!version) {
    throw new UserError(
      `Workspace package \`${target.name}\` needs a version to rewrite \`${specifier}\`, but its manifest has no version field`,
    );
  }
  return version;
}
