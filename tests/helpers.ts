import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type FixtureName =
  | 'basic-monorepo'
  | 'bom-json'
  | 'cyclic'
  | 'duplicate-workspace'
  | 'missing-build-output'
  | 'multiple-versions'
  | 'private-vs-public'
  | 'scoped'
  | 'source-is-workspace-root'
  | 'with-catalogs'
  | 'with-optional-deps'
  | 'with-overrides'
  | 'with-patches'
  | 'with-peer-deps'
  | 'with-pnpmexportignore';

const TESTS_TMP_DIR = path.join(os.tmpdir(), 'pnpm-export-tests');

export async function tempDir(prefix = 'pnpm-export-'): Promise<string> {
  const targetPath = path.join(TESTS_TMP_DIR, prefix);
  await fs.mkdir(path.dirname(targetPath + 'XXXXXX'), { recursive: true });
  return fs.mkdtemp(targetPath);
}

export async function fixturePath(name: FixtureName): Promise<string> {
  return path.join(process.cwd(), 'tests', 'fixtures', name);
}

export async function makeTempFixtureCopy(name: FixtureName): Promise<string> {
  const source = await fixturePath(name);
  const target = await tempDir(`${name}/`);
  await fs.cp(source, target, { recursive: true });
  return target;
}

export async function makeTempOutputDir(): Promise<string> {
  const output = await tempDir('output/');
  await fs.rm(output, { recursive: true, force: true });
  return output;
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
