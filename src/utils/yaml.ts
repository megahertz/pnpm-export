import fs from 'node:fs/promises';
import YAML from 'yaml';

export async function readYaml<T>(filePath: string): Promise<T> {
  const contents = await fs.readFile(filePath, 'utf8');
  return YAML.parse(contents) as T;
}
