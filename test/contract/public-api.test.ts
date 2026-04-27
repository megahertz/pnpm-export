import { describe, expect, it } from 'vitest';
import * as api from '../../src/index';

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
      'exportPackage',
    ]) {
      expect(api).toHaveProperty(key);
    }
  });
});
