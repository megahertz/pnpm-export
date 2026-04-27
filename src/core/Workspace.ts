import path from 'node:path';
import type { WorkspaceYaml } from '../types';
import { UserError } from './errors';
import type { WorkspacePackage } from './WorkspacePackage';

export class Workspace {
  readonly root: string;
  readonly packagePatterns: string[];
  readonly catalog: Record<string, string>;
  readonly catalogs: Record<string, Record<string, string>>;
  readonly overrides: Record<string, string>;
  readonly patchedDependencies: Record<string, string>;
  readonly packages: Map<string, WorkspacePackage>;

  constructor({
    root,
    data,
    packages,
  }: {
    root: string;
    data: WorkspaceYaml;
    packages: Map<string, WorkspacePackage>;
  }) {
    this.root = root;
    this.packagePatterns = data.packages;
    this.catalog = data.catalog;
    this.catalogs = data.catalogs;
    this.overrides = data.overrides;
    this.patchedDependencies = data.patchedDependencies;
    this.packages = packages;
  }

  getByName(name: string): WorkspacePackage | undefined {
    return this.packages.get(name);
  }

  getByDir(dir: string): WorkspacePackage | undefined {
    const normalized = path.resolve(dir);
    for (const pkg of this.packages.values()) {
      if (pkg.dir === normalized) {
        return pkg;
      }
    }
    return undefined;
  }

  resolveCatalog(specifier: string, depName: string): string {
    const catalogName =
      specifier === 'catalog:' ? undefined : specifier.slice('catalog:'.length);
    const catalog =
      catalogName === undefined ? this.catalog : this.catalogs[catalogName];

    if (!catalog) {
      throw new UserError(
        `Catalog \`${catalogName ?? 'default'}\` was not found for dependency \`${depName}\`.`,
      );
    }

    const resolved = catalog[depName];
    if (!resolved) {
      throw new UserError(
        `Catalog \`${catalogName ?? 'default'}\` has no entry for dependency \`${depName}\`.`,
      );
    }

    if (resolved.startsWith('workspace:')) {
      throw new UserError(
        `Catalog entry for \`${depName}\` resolves to workspace specifier \`${resolved}\`, which is not supported.`,
      );
    }

    if (resolved.startsWith('catalog:')) {
      throw new UserError(
        `Catalog entry for \`${depName}\` resolves to another catalog specifier \`${resolved}\`, which is not supported.`,
      );
    }

    return resolved;
  }
}
