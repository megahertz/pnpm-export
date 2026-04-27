import fs from 'node:fs/promises';
import path from 'node:path';
import type { App } from '../core/App';
import { UserError } from '../core/errors';
import type { WorkspacePackage } from '../core/WorkspacePackage';
import {
  CLEAN_MARKER,
  cleanDirContents,
  collectPackageFiles,
  copyPackage,
  ensureDir,
  isEmptyDir,
  isMarkerOnlyDir,
  listDir,
  pathExists,
} from '../utils/fs';
import {
  dirnameMatchesPattern,
  isSameOrInside,
  toPosixPath,
} from '../utils/paths';

export async function copyProjectFiles(app: App): Promise<void> {
  const workspace = app.requireWorkspace();
  const exported = app.requireExported();

  validateOutputLocation(app);

  if (app.config.dryRun) {
    await printDryRunTree(app);
    return;
  }

  await prepareOutputDir(app);

  for (const pkg of exported.all()) {
    // eslint-disable-next-line no-await-in-loop -- Root package copies can overlap member output paths, so copy order matters.
    await copyPackage(pkg.dir, exported.outputPathFor(pkg));
  }

  await Promise.all(exported.all().map((pkg) => verifyBuildOutput(app, pkg)));

  if (workspace.root) {
    app.logger.debug(`Copied packages into ${app.config.output}`);
  }
}

function validateOutputLocation(app: App): void {
  const workspace = app.requireWorkspace();
  const source = app.requireSourcePackage();
  const { output } = app.config;

  if (output === workspace.root) {
    throw new UserError(
      `Output directory \`${output}\` cannot equal workspace root \`${workspace.root}\`.`,
    );
  }

  if (isSameOrInside(output, source.dir)) {
    throw new UserError(
      `Output directory \`${output}\` cannot be inside source dir \`${source.dir}\`.`,
    );
  }

  const existingPackage = workspace.getByDir(output);
  if (existingPackage) {
    throw new UserError(
      `Output directory \`${output}\` is an existing workspace package \`${existingPackage.name}\`.`,
    );
  }

  const relativeOutput = toPosixPath(path.relative(workspace.root, output));
  if (
    !relativeOutput.startsWith('..') &&
    workspace.packagePatterns.some((pattern) =>
      dirnameMatchesPattern(relativeOutput, pattern),
    )
  ) {
    app.logger.warn(
      `⚠ pnpm-export: output directory \`${output}\` matches a workspace package glob and may be treated as a workspace package by pnpm.`,
    );
  }
}

async function prepareOutputDir(app: App): Promise<void> {
  const { output } = app.config;

  if (app.config.clean) {
    if ((await pathExists(output)) && !(await isEmptyDir(output))) {
      const entries = await listDir(output);
      if (!entries.includes(CLEAN_MARKER)) {
        throw new UserError(
          `Output directory \`${output}\` is not empty and does not look like a prior pnpm-export output. Refusing to clean it.`,
        );
      }
    }
    await cleanDirContents(output);
    return;
  }

  await ensureDir(output);
  if (!(await isEmptyDir(output)) && !(await isMarkerOnlyDir(output))) {
    throw new UserError(
      `Output directory \`${output}\` is non-empty. Re-run with \`--clean\` to wipe it, or pick a different output dir.`,
    );
  }
}

async function printDryRunTree(app: App): Promise<void> {
  const exported = app.requireExported();
  let totalFiles = 0;

  const packageFiles = await Promise.all(
    exported.all().map(async (pkg) => ({
      files: await collectPackageFiles(pkg.dir),
      pkg,
    })),
  );

  for (const { files, pkg } of packageFiles) {
    const header =
      pkg === exported.root
        ? `${pkg.name} -> ./`
        : `${pkg.name} -> packages/${pkg.dirname}/`;
    app.logger.info(header);
    totalFiles += files.length;
    for (const file of files) {
      app.logger.info(`  ${toPosixPath(file)}`);
    }
  }

  app.plannedFileCount = totalFiles;
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
