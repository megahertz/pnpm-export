import { describe, expect, it } from 'vitest';
import * as api from '../../src/index.ts';

describe('public API contract', () => {
  it('exports the documented classes, operations, wiring, errors, and helper API', () => {
    for (const key of [
      'Config',
      'App',
      'Workspace',
      'WorkspacePackage',
      'ExportedPackages',
      'PackageJson',
      'readWorkspace',
      'resolveDependencies',
      'copyProjectFiles',
      'modifyPackageJson',
      'makePackageLockFile',
      'makeDependencies',
      'UserError',
      'InternalError',
      'pnpmExport',
    ]) {
      expect(api).toHaveProperty(key);
    }
  });
});
