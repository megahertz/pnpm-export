import path from 'node:path';
import type { App } from '../../core/App.ts';
import { writeJson } from '../../utils/json.ts';

export async function writePackageJsons(app: App): Promise<void> {
  if (app.config.dryRun) {
    return;
  }

  const exported = app.requireExported();
  const packageJsons = app.requirePackageJsons();
  await Promise.all(
    [...packageJsons.entries()].map(([pkg, packageJson]) =>
      writeJson(
        path.join(exported.outputPathFor(pkg), 'package.json'),
        packageJson.toJSON(),
      ),
    ),
  );
}
