import type { PackageJson } from '../../core/PackageJson.ts';

export function stripPnpmScripts(packageJson: PackageJson): void {
  const { data } = packageJson;
  if (!data.scripts) {
    return;
  }

  const scripts: Record<string, string> = {};
  for (const [name, command] of Object.entries(data.scripts)) {
    if (!name.startsWith('pnpm:')) {
      scripts[name] = command;
    }
  }
  data.scripts = scripts;
}
