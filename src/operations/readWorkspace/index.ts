import type { App } from '../../core/App.ts';
import { loadSourcePackage } from './loadSourcePackage.ts';
import { loadWorkspace } from './loadWorkspace.ts';

export async function readWorkspace(app: App): Promise<void> {
  await loadWorkspace(app);
  await loadSourcePackage(app);
}

export { findWorkspaceRoot } from './findWorkspaceRoot.ts';
