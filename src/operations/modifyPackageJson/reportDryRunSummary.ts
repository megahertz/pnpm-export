import type { App } from '../../core/App.ts';

export function reportDryRunSummary(app: App): void {
  if (!app.config.dryRun) {
    return;
  }

  const exported = app.requireExported();
  const warningCount = app.logger.warningCount ?? 0;
  const packageCount = exported.all().length;
  app.logger.info(
    `Would copy ${packageCount} packages, rewrite ${packageCount} manifests, emit ${warningCount} warnings.`,
  );
}
