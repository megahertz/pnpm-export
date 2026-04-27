import { App } from './core/App';
import { Config } from './core/Config';
import { makeDependencies } from './core/makeDependencies';
import { copyProjectFiles } from './operations/copyProjectFiles';
import { makePackageLockFile } from './operations/makePackageLockFile';
import { modifyPackageJson } from './operations/modifyPackageJson';
import { readWorkspace } from './operations/readWorkspace';
import { resolveDependencies } from './operations/resolveDependencies';
import type { ConfigOptions } from './types';

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
