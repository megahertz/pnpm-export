import path from 'node:path';
import type { App } from '../../core/App.ts';
import type { PnpmLock } from '../../core/types.ts';
import { pathExists } from '../../utils/fs.ts';
import { readYaml } from '../../utils/yaml.ts';

export async function readPnpmLock(app: App): Promise<PnpmLock | undefined> {
  const workspace = app.requireWorkspace();
  const lockfilePath = path.join(workspace.root, 'pnpm-lock.yaml');
  if (!(await pathExists(lockfilePath))) {
    return undefined;
  }
  return readYaml<PnpmLock>(lockfilePath);
}
