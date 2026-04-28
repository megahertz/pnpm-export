import type { App } from '../../core/App.ts';
import { UserError } from '../../core/errors.ts';
import {
  CLEAN_MARKER,
  cleanDirContents,
  ensureDir,
  isEmptyDir,
  isMarkerOnlyDir,
  listDir,
  pathExists,
} from '../../utils/fs.ts';

export async function prepareOutputDir(app: App): Promise<void> {
  const { output } = app.config;

  if (app.config.clean) {
    if ((await pathExists(output)) && !(await isEmptyDir(output))) {
      const entries = await listDir(output);
      if (!entries.includes(CLEAN_MARKER)) {
        throw new UserError(
          `Output directory \`${output}\` is not empty and does not look like a prior pnpm-export output. Refusing to clean it`,
        );
      }
    }
    await cleanDirContents(output);
    return;
  }

  await ensureDir(output);
  if (!(await isEmptyDir(output)) && !(await isMarkerOnlyDir(output))) {
    throw new UserError(
      `Output directory \`${output}\` is non-empty. Re-run with \`--clean\` to wipe it, or pick a different output dir`,
    );
  }
}
