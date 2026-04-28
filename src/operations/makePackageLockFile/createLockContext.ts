import type { App } from '../../core/App.ts';
import type { PnpmLock } from '../../core/types.ts';
import { collectManifestMap, type LockContext } from './internals.ts';

export function createLockContext(
  app: App,
  pnpmLock: PnpmLock | undefined,
): LockContext {
  return {
    app,
    pnpmLock,
    manifests: collectManifestMap(app),
    workspaceStates: new Map(),
    externalStates: new Map(),
    workspaceQueue: [],
    externalQueue: [],
  };
}
