import type { App } from '../../core/App.ts';
import { collectPackageFiles } from '../../utils/fs.ts';
import { toPosixPath } from '../../utils/paths.ts';

export async function printDryRunTree(app: App): Promise<void> {
  const exported = app.requireExported();
  let totalFiles = 0;

  const packageFiles = await Promise.all(
    exported.all().map(async (pkg) => ({
      files: await collectPackageFiles(pkg.dir),
      pkg,
    })),
  );

  for (const { files, pkg } of packageFiles) {
    const header =
      pkg === exported.root
        ? `${pkg.name} -> ./`
        : `${pkg.name} -> packages/${pkg.dirname}/`;
    app.logger.info(header);
    totalFiles += files.length;
    for (const file of files) {
      app.logger.info(`  ${toPosixPath(file)}`);
    }
  }

  app.plannedFileCount = totalFiles;
}
