import path from 'node:path';
import type { App } from '../../core/App.ts';
import { UserError } from '../../core/errors.ts';
import {
  dirnameMatchesPattern,
  isSameOrInside,
  toPosixPath,
} from '../../utils/paths.ts';

export function validateOutputLocation(app: App): void {
  const workspace = app.requireWorkspace();
  const source = app.requireSourcePackage();
  const { output } = app.config;

  if (output === workspace.root) {
    throw new UserError(
      `Output directory \`${output}\` cannot equal workspace root \`${workspace.root}\``,
    );
  }

  if (isSameOrInside(output, source.dir)) {
    throw new UserError(
      `Output directory \`${output}\` cannot be inside source dir \`${source.dir}\``,
    );
  }

  const existingPackage = workspace.getByDir(output);
  if (existingPackage) {
    throw new UserError(
      `Output directory \`${output}\` is an existing workspace package \`${existingPackage.name}\``,
    );
  }

  const relativeOutput = toPosixPath(path.relative(workspace.root, output));
  if (
    !relativeOutput.startsWith('..') &&
    workspace.packagePatterns.some((pattern) =>
      dirnameMatchesPattern(relativeOutput, pattern),
    )
  ) {
    app.logger.warn(
      `⚠ pnpm-export: output directory \`${output}\` matches a workspace package glob and may be treated as a workspace package by pnpm.`,
    );
  }
}
