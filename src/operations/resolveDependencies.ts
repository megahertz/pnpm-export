import type { App } from '../core/App.ts';
import { UserError } from '../core/errors.ts';
import { ExportedPackages } from '../core/ExportedPackages.ts';
import type { DependencyMap } from '../core/types.ts';
import type { WorkspacePackage } from '../core/WorkspacePackage.ts';
import {
  DEP_FIELDS,
  isWorkspaceSpecifier,
  shouldFollowField,
} from '../utils/specifiers.ts';

export async function resolveDependencies(app: App): Promise<void> {
  const workspace = app.requireWorkspace();
  const root = app.requireSourcePackage();
  const members = new Set<WorkspacePackage>();
  const visited = new Set<WorkspacePackage>([root]);
  const queue: WorkspacePackage[] = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const field of DEP_FIELDS) {
      if (!shouldFollowField(field, app.config)) {
        continue;
      }

      const deps = readDependencyMap(current.manifest[field]);
      for (const [depName, specifier] of Object.entries(deps)) {
        if (!isWorkspaceSpecifier(specifier)) {
          continue;
        }

        const target =
          depName === root.name ? root : workspace.getByName(depName);
        if (!target) {
          continue;
        }

        if (target === current) {
          throw new UserError(
            `Package \`${current.name}\` lists itself as a workspace dependency`,
          );
        }

        if (visited.has(target)) {
          continue;
        }

        visited.add(target);
        if (target !== root) {
          members.add(target);
        }
        queue.push(target);
      }
    }
  }

  app.exported = new ExportedPackages({
    root,
    members,
    output: app.config.output,
  });
}

function readDependencyMap(value: unknown): DependencyMap {
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
