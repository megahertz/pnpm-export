import path from 'node:path';
import type { App } from '../core/App';
import {
  PackageJson,
  collectPatches,
  copyPatchFiles,
} from '../core/PackageJson';
import { writeJson } from '../utils/json';

export async function modifyPackageJson(app: App): Promise<void> {
  const workspace = app.requireWorkspace();
  const exported = app.requireExported();
  const packageJsons = new Map();
  const writes: Array<Promise<void>> = [];

  for (const pkg of exported.all()) {
    const packageJson = new PackageJson({
      pkg,
      workspace,
      exported,
      config: app.config,
      logger: app.logger,
    });
    packageJsons.set(pkg, packageJson);

    if (!app.config.dryRun) {
      writes.push(
        writeJson(
          path.join(exported.outputPathFor(pkg), 'package.json'),
          packageJson.toJSON(),
        ),
      );
    }
  }

  await Promise.all(writes);
  app.packageJsons = packageJsons;

  if (
    !app.config.dryRun &&
    app.config.patchDependencies === 'try-replace' &&
    Object.keys(collectPatches(exported.root.manifest, workspace)).length > 0
  ) {
    const count = await copyPatchFiles({
      workspace,
      rootManifest: exported.root.manifest,
      output: app.config.output,
    });
    app.logger.warn(`Applied ${count} patches via patch-package postinstall.`);
  }

  if (app.config.dryRun) {
    const warningCount = app.logger.warningCount ?? 0;
    const packageCount = exported.all().length;
    app.logger.info(
      `Would copy ${packageCount} packages, rewrite ${packageCount} manifests, emit ${warningCount} warnings.`,
    );
  }
}
