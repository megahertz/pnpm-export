import type { App } from '../../core/App.ts';
import { buildPackageJsons } from './buildPackageJsons.ts';
import { copyPatchesIfRequested } from './copyPatchesIfRequested.ts';
import { reportDryRunSummary } from './reportDryRunSummary.ts';
import { writePackageJsons } from './writePackageJsons.ts';

export async function modifyPackageJson(app: App): Promise<void> {
  buildPackageJsons(app);
  await writePackageJsons(app);
  await copyPatchesIfRequested(app);
  reportDryRunSummary(app);
}
