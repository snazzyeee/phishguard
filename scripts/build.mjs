import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (!output.startsWith(root + sep)) throw new Error('Build output must stay inside the project');

const files = [
  'index.html',
  'styles.css',
  'src/app.js',
  'src/engine.js',
  'source/phishguard.c',
];

await rm(output, { recursive: true, force: true });
for (const file of files) {
  const destination = join(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, file), destination);
}
console.log(`Built ${files.length} static files in dist/`);
