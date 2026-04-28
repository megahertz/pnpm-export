import type { App } from '../../core/App.ts';
import type { ModifyContext } from './internals.ts';

export function makeModifyContext(app: App): ModifyContext {
  return {
    workspace: app.requireWorkspace(),
    exported: app.requireExported(),
    config: app.config,
    logger: app.logger,
  };
}
