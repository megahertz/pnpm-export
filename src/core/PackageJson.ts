import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DepKind,
  DependencyMap,
  Logger,
  PackageJsonData,
} from '../types.ts';
import {
  DEP_FIELDS,
  isWorkspaceSpecifier,
  resolveSpecifier,
  workspaceVersionSpecifier,
} from '../utils/specifiers.ts';
import type { Config } from './Config.ts';
import { UserError } from './errors.ts';
import type { ExportedPackages } from './ExportedPackages.ts';
import type { Workspace } from './Workspace.ts';
import type { WorkspacePackage } from './WorkspacePackage.ts';

export class PackageJson {
  readonly pkg: WorkspacePackage;
  readonly data: PackageJsonData;

  constructor({
    pkg,
    workspace,
    exported,
    config,
    logger,
  }: {
    pkg: WorkspacePackage;
    workspace: Workspace;
    exported: ExportedPackages;
    config: Config;
    logger: Logger;
  }) {
    this.pkg = pkg;
    this.data = structuredClone(pkg.manifest);

    this.warnAndIgnoreCatalogOverrides(logger);
    this.stripPnpmScripts();
    for (const field of DEP_FIELDS) {
      this.rewriteDeps(field, { workspace, exported });
    }
    this.translateOverrides({ workspace, exported, logger });
    if (pkg === exported.root) {
      this.applyPatchPackage({ workspace, logger, config });
    }
    this.stripPnpmFields();
  }

  rewriteDeps(
    field: DepKind,
    {
      workspace,
      exported,
    }: {
      workspace: Workspace;
      exported: ExportedPackages;
    },
  ): void {
    const original = readDependencyMap(this.data[field]);
    const rewritten: DependencyMap = {};

    for (const [depName, specifier] of Object.entries(original)) {
      const target = resolveWorkspaceTarget(depName, { workspace, exported });

      if (isWorkspaceSpecifier(specifier) && !target) {
        throw new UserError(
          `Workspace dependency \`${depName}\` in package \`${this.pkg.name}\` was not found in the workspace registry.`,
        );
      }

      if (isWorkspaceSpecifier(specifier) && target) {
        if (target === this.pkg) {
          throw new UserError(
            `Package \`${this.pkg.name}\` lists itself as a workspace dependency.`,
          );
        }

        const resolved = exported.has(target)
          ? exported.relativeFileSpecifier(this.pkg, target)
          : this.dropOrVersionResolve(depName, specifier, target);

        if (resolved) {
          rewritten[depName] = resolved;
        }
        continue;
      }

      rewritten[depName] = resolveSpecifier(specifier, depName, { workspace });
    }

    if (field === 'devDependencies') {
      this.data.devDependencies = rewritten;
      return;
    }

    if (Object.keys(rewritten).length === 0 && this.data[field] === undefined) {
      delete this.data[field];
      return;
    }

    if (
      Object.keys(rewritten).length === 0 &&
      Object.keys(original).length === 0
    ) {
      return;
    }

    this.data[field] = rewritten;
  }

  dropOrVersionResolve(
    _depName: string,
    specifier: string,
    target: WorkspacePackage,
  ): string | undefined {
    if (target.isPrivate) {
      return undefined;
    }

    const version = workspaceVersionSpecifier(specifier, target);
    if (!version) {
      throw new UserError(
        `Workspace package \`${target.name}\` needs a version to rewrite \`${specifier}\`, but its manifest has no version field.`,
      );
    }
    return version;
  }

  stripPnpmFields(): void {
    delete this.data.workspaces;
    delete this.data.pnpm;
    delete this.data.packageManager;

    if (
      this.data.publishConfig &&
      typeof this.data.publishConfig === 'object' &&
      !Array.isArray(this.data.publishConfig)
    ) {
      const publishConfig = { ...this.data.publishConfig };
      delete publishConfig.directory;
      if (Object.keys(publishConfig).length === 0) {
        delete this.data.publishConfig;
      } else {
        this.data.publishConfig = publishConfig;
      }
    }
  }

  translateOverrides({
    workspace,
    exported,
    logger,
  }: {
    workspace: Workspace;
    exported: ExportedPackages;
    logger: Logger;
  }): void {
    const existing = readDependencyMap(this.data.overrides);
    const translated: DependencyMap = { ...existing };
    const sources: DependencyMap[] = [];

    if (this.pkg === exported.root) {
      sources.push(workspace.overrides);
    }

    if (this.pkg.manifest.pnpm?.overrides) {
      sources.push(this.pkg.manifest.pnpm.overrides);
    }

    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        if (key.includes('>')) {
          logger.warn(
            `⚠ pnpm-export: pnpm.overrides has nested form \`${key}\` which has no direct npm equivalent - output may resolve different versions than your workspace. Pin manually or wait for v2.`,
          );
          continue;
        }

        if (translated[key] !== undefined && translated[key] !== value) {
          logger.warn(
            `⚠ pnpm-export: pnpm.overrides value for \`${key}\` overrides existing npm overrides value.`,
          );
        }
        translated[key] = value;
      }
    }

    if (Object.keys(translated).length > 0) {
      this.data.overrides = translated;
    } else {
      delete this.data.overrides;
    }
  }

  applyPatchPackage({
    workspace,
    logger,
    config,
  }: {
    workspace: Workspace;
    logger: Logger;
    config: Config;
  }): void {
    const patches = collectPatches(this.pkg.manifest, workspace);
    const patchNames = Object.keys(patches);
    if (patchNames.length === 0) {
      return;
    }

    if (config.patchDependencies === 'warning') {
      logger.warn(
        `⚠ pnpm-export: stripped pnpm.patchedDependencies for ${patchNames.join(', ')}.`,
      );
      return;
    }

    if (config.patchDependencies === 'ignore') {
      return;
    }

    const dependencies = readDependencyMap(this.data.dependencies);
    dependencies['patch-package'] = dependencies['patch-package'] ?? '^8.0.0';
    this.data.dependencies = dependencies;

    const scripts = { ...this.data.scripts };
    const { postinstall } = scripts;
    scripts.postinstall = postinstall
      ? `patch-package && ${postinstall}`
      : 'patch-package';
    this.data.scripts = scripts;
  }

  toJSON(): PackageJsonData {
    return structuredClone(this.data);
  }

  private stripPnpmScripts(): void {
    if (!this.data.scripts) {
      return;
    }
    const scripts: Record<string, string> = {};
    for (const [name, command] of Object.entries(this.data.scripts)) {
      if (!name.startsWith('pnpm:')) {
        scripts[name] = command;
      }
    }
    this.data.scripts = scripts;
  }

  private warnAndIgnoreCatalogOverrides(logger: Logger): void {
    if (this.pkg.manifest.pnpm?.catalog || this.pkg.manifest.pnpm?.catalogs) {
      logger.warn(
        `⚠ pnpm-export: ${this.pkg.name} uses per-package pnpm.catalog overrides, which are ignored in v1.`,
      );
    }
  }
}

export async function copyPatchFiles({
  workspace,
  rootManifest,
  output,
}: {
  workspace: Workspace;
  rootManifest: PackageJsonData;
  output: string;
}): Promise<number> {
  const patches = collectPatches(rootManifest, workspace);
  const entries = Object.entries(patches);
  if (entries.length === 0) {
    return 0;
  }

  const outputPatchDir = path.join(output, 'patches');
  await fs.mkdir(outputPatchDir, { recursive: true });

  await Promise.all(
    entries.map(async ([name, patchPath]) => {
      const source = path.isAbsolute(patchPath)
        ? patchPath
        : path.join(workspace.root, patchPath);
      const basename = renamePatchFile(path.basename(patchPath), name);
      await fs.copyFile(source, path.join(outputPatchDir, basename));
    }),
  );

  return entries.length;
}

export function collectPatches(
  rootManifest: PackageJsonData,
  workspace: Workspace,
): Record<string, string> {
  return {
    ...workspace.patchedDependencies,
    ...rootManifest.pnpm?.patchedDependencies,
  };
}

function resolveWorkspaceTarget(
  depName: string,
  {
    workspace,
    exported,
  }: {
    workspace: Workspace;
    exported: ExportedPackages;
  },
): WorkspacePackage | undefined {
  if (depName === exported.root.name) {
    return exported.root;
  }
  return workspace.getByName(depName);
}

function readDependencyMap(value: unknown): DependencyMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: DependencyMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    }
  }
  return output;
}

function renamePatchFile(basename: string, patchName: string): string {
  const withoutPatch = basename.endsWith('.patch')
    ? basename.slice(0, -6)
    : basename;
  if (withoutPatch.includes('@')) {
    return `${withoutPatch.replace('@', '+')}.patch`;
  }
  return `${patchName.replace('@', '+')}.patch`;
}
