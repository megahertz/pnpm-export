import type { App } from './core/App.ts';
import { copyProjectFiles } from './operations/copyProjectFiles/index.ts';
import { makePackageLockFile } from './operations/makePackageLockFile/index.ts';
import { modifyPackageJson } from './operations/modifyPackageJson/index.ts';
import { readWorkspace } from './operations/readWorkspace/index.ts';
import { resolveDependencies } from './operations/resolveDependencies/index.ts';

export async function pnpmExport(app: App): Promise<void> {
  await readWorkspace(app);
  await resolveDependencies(app);
  await copyProjectFiles(app);
  await modifyPackageJson(app);
  await makePackageLockFile(app);
}
