import type { App } from '../../core/App.ts';
import { copyPackage } from '../../utils/fs.ts';

export async function copyPackages(app: App): Promise<void> {
  const exported = app.requireExported();
  for (const pkg of exported.all()) {
    // eslint-disable-next-line no-await-in-loop -- Root package copies can overlap member output paths, so copy order matters.
    await copyPackage(pkg.dir, exported.outputPathFor(pkg));
  }
}
