import { describe, expect, it } from 'vitest';
import { Workspace } from '../../src/core/Workspace';
import { WorkspacePackage } from '../../src/core/WorkspacePackage';
import {
  resolveSpecifier,
  workspaceVersionSpecifier,
} from '../../src/utils/specifiers';

describe('specifier helpers', () => {
  it('resolves catalog refs', () => {
    const workspace = new Workspace({
      root: '/repo',
      data: {
        packages: [],
        catalog: { zod: '^4.0.0' },
        catalogs: { strict: { react: '^19.0.0' } },
        overrides: {},
        patchedDependencies: {},
      },
      packages: new Map(),
    });

    expect(resolveSpecifier('catalog:', 'zod', { workspace })).toBe('^4.0.0');
    expect(resolveSpecifier('catalog:strict', 'react', { workspace })).toBe(
      '^19.0.0',
    );
  });

  it('version-resolves excluded public workspace refs', () => {
    const pkg = new WorkspacePackage({
      dir: '/repo/packages/lib',
      manifest: { name: 'lib', version: '1.2.3' },
    });

    expect(workspaceVersionSpecifier('workspace:*', pkg)).toBe('1.2.3');
    expect(workspaceVersionSpecifier('workspace:^', pkg)).toBe('^1.2.3');
    expect(workspaceVersionSpecifier('workspace:~1.0.0', pkg)).toBe('~1.0.0');
  });
});
