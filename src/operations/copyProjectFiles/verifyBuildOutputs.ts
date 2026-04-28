import fs from 'node:fs/promises';
import path from 'node:path';
import type { App } from '../../core/App.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';
import { pathExists } from '../../utils/fs.ts';

export async function verifyBuildOutputs(app: App): Promise<void> {
  const exported = app.requireExported();
  await Promise.all(exported.all().map((pkg) => verifyBuildOutput(app, pkg)));
}

async function verifyBuildOutput(
  app: App,
  pkg: WorkspacePackage,
): Promise<void> {
  const exported = app.requireExported();
  const destDir = exported.outputPathFor(pkg);
  const { manifest } = pkg;

  const checks: Array<{ field: string; target: string }> = [];
  if (typeof manifest.main === 'string') {
    checks.push({ field: 'main', target: manifest.main });
  }
  if (typeof manifest.module === 'string') {
    checks.push({ field: 'module', target: manifest.module });
  }
  if (typeof manifest.bin === 'string') {
    checks.push({ field: 'bin', target: manifest.bin });
  } else if (manifest.bin && typeof manifest.bin === 'object') {
    for (const [name, target] of Object.entries(manifest.bin)) {
      if (typeof target === 'string') {
        checks.push({ field: `bin.${name}`, target });
      }
    }
  }

  for (const target of collectExportTargets(manifest.exports)) {
    checks.push({ field: 'exports', target });
  }

  const checkedTargets = await Promise.all(
    checks.map(async (check) => {
      const target = check.target.startsWith('./')
        ? check.target.slice(2)
        : check.target;
      const exists = await pathExists(path.join(destDir, target));
      return { check, exists };
    }),
  );

  for (const { check, exists } of checkedTargets) {
    if (!exists) {
      app.logger.warn(
        `⚠ pnpm-export: ${pkg.name} declares \`${check.field}\` -> \`${check.target}\` but it does not exist in the output. Did you forget to build?`,
      );
    }
  }

  await fs.stat(destDir);
}

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.startsWith('./') ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectExportTargets(entry));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((entry) => collectExportTargets(entry));
  }

  return [];
}
