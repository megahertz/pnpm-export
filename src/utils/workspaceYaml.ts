import { UserError } from '../core/errors.ts';
import type { RawWorkspaceYaml, WorkspaceYaml } from '../core/types.ts';

export function parseWorkspaceYaml(
  raw: RawWorkspaceYaml | undefined,
): WorkspaceYaml {
  const data = raw ?? {};
  return {
    packages: readStringArray(data.packages, 'packages'),
    catalog: readStringRecord(data.catalog, 'catalog'),
    catalogs: readCatalogs(data.catalogs),
    overrides: readStringRecord(data.overrides, 'overrides'),
    patchedDependencies: readStringRecord(
      data.patchedDependencies,
      'patchedDependencies',
    ),
  };
}

function readStringArray(value: unknown, field: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === 'string')
  ) {
    throw new UserError(
      `pnpm-workspace.yaml field \`${field}\` must be a string array.`,
    );
  }
  return value;
}

function readStringRecord(
  value: unknown,
  field: string,
): Record<string, string> {
  const data = value ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new UserError(
      `pnpm-workspace.yaml field \`${field}\` must be an object.`,
    );
  }

  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(data)) {
    if (typeof entry !== 'string') {
      throw new UserError(
        `pnpm-workspace.yaml field \`${field}.${key}\` must be a string.`,
      );
    }
    output[key] = entry;
  }
  return output;
}

function readCatalogs(value: unknown): Record<string, Record<string, string>> {
  const data = value ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new UserError(
      'pnpm-workspace.yaml field `catalogs` must be an object.',
    );
  }

  const output: Record<string, Record<string, string>> = {};
  for (const [name, catalog] of Object.entries(data)) {
    output[name] = readStringRecord(catalog, `catalogs.${name}`);
  }
  return output;
}
