import type { PackageJson } from '../../core/PackageJson.ts';

export function stripPnpmFields(packageJson: PackageJson): void {
  const { data } = packageJson;
  delete data.workspaces;
  delete data.pnpm;
  delete data.packageManager;

  if (
    data.publishConfig &&
    typeof data.publishConfig === 'object' &&
    !Array.isArray(data.publishConfig)
  ) {
    const publishConfig = { ...data.publishConfig };
    delete publishConfig.directory;
    if (Object.keys(publishConfig).length === 0) {
      delete data.publishConfig;
    } else {
      data.publishConfig = publishConfig;
    }
  }
}
