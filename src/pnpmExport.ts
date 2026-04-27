import type { App } from './core/App.ts';
import { copyProjectFiles } from './operations/copyProjectFiles.ts';
import { makePackageLockFile } from './operations/makePackageLockFile.ts';
import { modifyPackageJson } from './operations/modifyPackageJson.ts';
import { readWorkspace } from './operations/readWorkspace.ts';
import { resolveDependencies } from './operations/resolveDependencies.ts';

export async function pnpmExport(app: App): Promise<void> {
  await readWorkspace(app);
  await resolveDependencies(app);
  await copyProjectFiles(app);
  await modifyPackageJson(app);
  await makePackageLockFile(app);
}
