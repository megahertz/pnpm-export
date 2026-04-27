import { App } from './core/App.ts';
import { Config } from './core/Config.ts';
import { makeDependencies } from './core/makeDependencies.ts';
import { copyProjectFiles } from './operations/copyProjectFiles.ts';
import { makePackageLockFile } from './operations/makePackageLockFile.ts';
import { modifyPackageJson } from './operations/modifyPackageJson.ts';
import { readWorkspace } from './operations/readWorkspace.ts';
import { resolveDependencies } from './operations/resolveDependencies.ts';
import type { ConfigOptions } from './types.ts';

export async function exportPackage(options: ConfigOptions): Promise<void> {
  const config = new Config({ options });
  const deps = makeDependencies({ config });
  const app = new App({ deps });

  await readWorkspace(app);
  await resolveDependencies(app);
  await copyProjectFiles(app);
  await modifyPackageJson(app);
  await makePackageLockFile(app);
}
