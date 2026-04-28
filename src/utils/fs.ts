import fs from 'node:fs/promises';
import path from 'node:path';
import { makePackageFilter } from './ignoreFile.ts';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function isEmptyDir(dir: string): Promise<boolean> {
  const entries = await listDir(dir);
  return entries.length === 0;
}

export async function cleanDirContents(dir: string): Promise<void> {
  await ensureDir(dir);
  const entries = await fs.readdir(dir);
  await Promise.all(
    entries.map((entry) =>
      fs.rm(path.join(dir, entry), { recursive: true, force: true }),
    ),
  );
}

export async function copyPackage(
  srcDir: string,
  destDir: string,
): Promise<void> {
  const filter = await makePackageFilter(srcDir);
  await ensureDir(destDir);
  await fs.cp(srcDir, destDir, {
    recursive: true,
    dereference: true,
    force: true,
    filter: async (src) => filter(src),
  });
}

export async function collectPackageFiles(srcDir: string): Promise<string[]> {
  const filter = await makePackageFilter(srcDir);
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (!filter(dir)) {
      return;
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const src = path.join(dir, entry.name);
        if (!filter(src)) {
          return;
        }
        if (entry.isDirectory()) {
          await walk(src);
        } else {
          files.push(path.relative(srcDir, src));
        }
      }),
    );
  }

  await walk(srcDir);
  return files.toSorted();
}
