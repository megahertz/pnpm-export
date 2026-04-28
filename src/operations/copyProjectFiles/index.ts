import type { App } from '../../core/App.ts';
import { copyPackages } from './copyPackages.ts';
import { prepareOutputDir } from './prepareOutputDir.ts';
import { printDryRunTree } from './printDryRunTree.ts';
import { validateOutputLocation } from './validateOutputLocation.ts';
import { verifyBuildOutputs } from './verifyBuildOutputs.ts';

export async function copyProjectFiles(app: App): Promise<void> {
  validateOutputLocation(app);

  if (app.config.dryRun) {
    await printDryRunTree(app);
    return;
  }

  await prepareOutputDir(app);
  await copyPackages(app);
  await verifyBuildOutputs(app);
  app.logger.debug(`Copied packages into ${app.config.output}`);
}
