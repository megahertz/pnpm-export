import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function tempDir(prefix = 'pnpm-export-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function fixturePath(name: string): Promise<string> {
  return path.join(process.cwd(), 'test', 'fixtures', name);
}

export async function copyFixture(name: string): Promise<string> {
  const source = await fixturePath(name);
  const target = await tempDir(`${name}-`);
  await fs.cp(source, target, { recursive: true });
  return target;
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

export async function listFiles(dir: string): Promise<string[]> {
  const output: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          output.push(path.relative(dir, fullPath).split(path.sep).join('/'));
        }
      }),
    );
  }

  await walk(dir);
  return output.toSorted();
}
