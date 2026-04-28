import type { App } from '../../core/App.ts';
import { assembleLockData } from './assembleLockData.ts';
import { createLockContext } from './createLockContext.ts';
import { readPnpmLock } from './readPnpmLock.ts';
import { walkLockClosure } from './walkLockClosure.ts';
import { writeLockFile } from './writeLockFile.ts';

export async function makePackageLockFile(app: App): Promise<void> {
  if (!app.config.lockfile || app.config.dryRun) {
    return;
  }

  const pnpmLock = await readPnpmLock(app);
  const context = createLockContext(app, pnpmLock);
  walkLockClosure(context);
  const packageLock = assembleLockData(context);
  await writeLockFile(app, packageLock);
}
