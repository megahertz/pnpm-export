import { describe, expect, it } from 'vitest';
import { mangleDirname, relativePathWithFileProtocol } from '../paths.ts';

describe('path helpers', () => {
  it('mangles scoped package names', () => {
    expect(mangleDirname('@scope/foo')).toBe('scope__foo');
    expect(mangleDirname('plain')).toBe('plain');
  });

  it('computes npm file specifiers', () => {
    expect(relativePathWithFileProtocol('/out', '/out/packages/shared')).toBe(
      'file:./packages/shared',
    );
    expect(relativePathWithFileProtocol('/out/packages/shared', '/out/packages/lib')).toBe(
      'file:../lib',
    );
    expect(relativePathWithFileProtocol('/out/packages/shared', '/out')).toBe('file:../..');
  });
});
