import type { App } from '../../core/App.ts';
import { ExportedPackages } from '../../core/ExportedPackages.ts';
import type { WorkspacePackage } from '../../core/WorkspacePackage.ts';

export function assignExportedPackages(
  app: App,
  members: Set<WorkspacePackage>,
): void {
  app.exported = new ExportedPackages({
    root: app.requireSourcePackage(),
    members,
    output: app.config.output,
  });
}
