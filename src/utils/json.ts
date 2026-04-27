import fs from 'node:fs/promises';

export async function readJson<T>(filePath: string): Promise<T> {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}

export async function writeJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.writeFile(
    filePath,
    `${JSON.stringify(value, undefined, 2)}\n`,
    'utf8',
  );
}
