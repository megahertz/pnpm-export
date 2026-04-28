import type { App } from '../../core/App.ts';
import { UserError } from '../../core/errors.ts';
import { cleanDirContents, ensureDir, isEmptyDir } from '../../utils/fs.ts';

export async function prepareOutputDir(app: App): Promise<void> {
  const { output } = app.config;

  if (app.config.clean) {
    await cleanDirContents(output);
    return;
  }

  await ensureDir(output);
  if (!(await isEmptyDir(output))) {
    throw new UserError(
      `Output directory \`${output}\` is non-empty. Re-run with \`--clean\` to wipe it, or pick a different output dir`,
    );
  }
}
