import { describe, expect, it } from 'vitest';
import { mangleDirname, relFile } from '../../src/utils/paths.ts';

describe('path helpers', () => {
  it('mangles scoped package names', () => {
    expect(mangleDirname('@scope/foo')).toBe('scope__foo');
    expect(mangleDirname('plain')).toBe('plain');
  });

  it('computes npm file specifiers', () => {
    expect(relFile('/out', '/out/packages/shared')).toBe(
      'file:./packages/shared',
    );
    expect(relFile('/out/packages/shared', '/out/packages/lib')).toBe(
      'file:../lib',
    );
    expect(relFile('/out/packages/shared', '/out')).toBe('file:../..');
  });
});
