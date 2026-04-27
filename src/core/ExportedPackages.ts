import path from 'node:path';
import { relFile } from '../utils/paths';
import { WorkspacePackage } from './WorkspacePackage';

export class ExportedPackages {
  readonly root: WorkspacePackage;
  readonly members: Set<WorkspacePackage>;
  readonly output: string;

  constructor({
    root,
    members,
    output,
  }: {
    root: WorkspacePackage;
    members: Iterable<WorkspacePackage>;
    output: string;
  }) {
    this.root = root;
    this.members = new Set(members);
    this.output = output;
  }

  has(pkg: WorkspacePackage): boolean {
    return pkg === this.root || this.members.has(pkg);
  }

  all(): WorkspacePackage[] {
    return [this.root, ...this.members];
  }

  outputPathFor(pkg: WorkspacePackage): string {
    if (pkg === this.root) {
      return this.output;
    }
    return path.join(this.output, 'packages', pkg.dirname);
  }

  relativeFileSpecifier(from: WorkspacePackage, to: WorkspacePackage): string {
    const fromDir = this.outputPathFor(from);
    const toDir = this.outputPathFor(to);
    return relFile(fromDir, toDir);
  }
}
