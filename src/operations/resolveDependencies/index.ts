import type { App } from '../../core/App.ts';
import { assignExportedPackages } from './assignExportedPackages.ts';
import { collectExportMembers } from './collectExportMembers.ts';

export async function resolveDependencies(app: App): Promise<void> {
  const members = collectExportMembers(app);
  assignExportedPackages(app, members);
}
