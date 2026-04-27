import type { App } from '../core/App.ts';

export async function makePackageLockFile(_app: App): Promise<void> {
  // v1 intentionally emits no package-lock.json. The --lockfile flag is reserved.
}
