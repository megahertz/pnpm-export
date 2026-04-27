import type { PackageJsonData } from '../types.ts';
import { mangleDirname } from '../utils/paths.ts';

export class WorkspacePackage {
  readonly name: string;
  readonly dir: string;
  readonly manifest: PackageJsonData;
  readonly dirname: string;
  readonly isScoped: boolean;
  readonly isPrivate: boolean;

  constructor({ dir, manifest }: { dir: string; manifest: PackageJsonData }) {
    this.name = String(manifest.name);
    this.dir = dir;
    this.manifest = manifest;
    this.dirname = mangleDirname(this.name);
    this.isScoped = this.name.startsWith('@');
    this.isPrivate = manifest.private === true;
  }
}
