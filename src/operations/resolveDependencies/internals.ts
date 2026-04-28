import type { DependencyMap } from '../../core/types.ts';

export function readDependencyMap(value: unknown): DependencyMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: DependencyMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    }
  }
  return output;
}
