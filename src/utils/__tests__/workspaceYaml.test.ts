import { describe, expect, it } from 'vitest';
import { parseWorkspaceYaml } from '../workspaceYaml.ts';

describe('parseWorkspaceYaml', () => {
  it('normalizes supported fields', () => {
    expect(
      parseWorkspaceYaml({
        packages: ['packages/*'],
        catalog: { zod: '^4.0.0' },
        catalogs: { strict: { react: '^19.0.0' } },
        overrides: { foo: '1.0.0' },
        patchedDependencies: {
          'left-pad@1.3.0': 'patches/left-pad@1.3.0.patch',
        },
      }),
    ).toEqual({
      packages: ['packages/*'],
      catalog: { zod: '^4.0.0' },
      catalogs: { strict: { react: '^19.0.0' } },
      overrides: { foo: '1.0.0' },
      patchedDependencies: { 'left-pad@1.3.0': 'patches/left-pad@1.3.0.patch' },
    });
  });
});
