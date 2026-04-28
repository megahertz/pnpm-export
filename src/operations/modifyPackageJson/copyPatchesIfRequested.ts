import type { App } from '../../core/App.ts';
import { copyPatchFiles } from './copyPatchFiles.ts';
import { collectPatches } from './internals.ts';

export async function copyPatchesIfRequested(app: App): Promise<void> {
  if (app.config.dryRun || app.config.patchDependencies !== 'try-replace') {
    return;
  }

  const workspace = app.requireWorkspace();
  const exported = app.requireExported();
  if (
    Object.keys(collectPatches(exported.root.manifest, workspace)).length === 0
  ) {
    return;
  }

  const count = await copyPatchFiles({
    workspace,
    rootManifest: exported.root.manifest,
    output: app.config.output,
  });
  app.logger.warn(`Applied ${count} patches via patch-package postinstall.`);
}
