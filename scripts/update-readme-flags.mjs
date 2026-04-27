import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const readmePath = new URL('../README.md', import.meta.url);
const { stdout } = await execFileAsync(process.execPath, [
  'dist/cli.js',
  '--help',
]);
const readme = await fs.readFile(readmePath, 'utf8');
const block = `<!-- pnpm-export-help:start -->\n\`\`\`text\n${stdout.trimEnd()}\n\`\`\`\n<!-- pnpm-export-help:end -->`;
const next = readme.replace(
  /<!-- pnpm-export-help:start -->[\s\S]*?<!-- pnpm-export-help:end -->/,
  block,
);

if (next !== readme) {
  await fs.writeFile(readmePath, next, 'utf8');
}
