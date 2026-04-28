import fs from 'node:fs/promises';
import path from 'node:path';
import type { PackageJsonData } from '../../core/types.ts';
import type { Workspace } from '../../core/Workspace.ts';
import { collectPatches } from './internals.ts';

export async function copyPatchFiles({
  workspace,
  rootManifest,
  output,
}: {
  output: string;
  rootManifest: PackageJsonData;
  workspace: Workspace;
}): Promise<number> {
  const patches = collectPatches(rootManifest, workspace);
  const entries = Object.entries(patches);
  if (entries.length === 0) {
    return 0;
  }

  const outputPatchDir = path.join(output, 'patches');
  await fs.mkdir(outputPatchDir, { recursive: true });

  await Promise.all(
    entries.map(async ([name, patchPath]) => {
      const source = path.isAbsolute(patchPath)
        ? patchPath
        : path.join(workspace.root, patchPath);
      const basename = renamePatchFile(path.basename(patchPath), name);
      await fs.copyFile(source, path.join(outputPatchDir, basename));
    }),
  );

  return entries.length;
}

function renamePatchFile(basename: string, patchName: string): string {
  const withoutPatch = basename.endsWith('.patch')
    ? basename.slice(0, -6)
    : basename;
  if (withoutPatch.includes('@')) {
    return `${withoutPatch.replace('@', '+')}.patch`;
  }
  return `${patchName.replace('@', '+')}.patch`;
}
