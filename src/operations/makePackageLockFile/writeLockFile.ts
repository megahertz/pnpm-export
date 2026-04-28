import path from 'node:path';
import type { App } from '../../core/App.ts';
import type { PackageLockData } from '../../core/types.ts';
import { writeJson } from '../../utils/json.ts';

export async function writeLockFile(
  app: App,
  packageLock: PackageLockData,
): Promise<void> {
  await writeJson(
    path.join(app.config.output, 'package-lock.json'),
    packageLock,
  );
}
