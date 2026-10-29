import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
// Remove only files from this project's generated output directory.
await mkdir(output, { recursive: true });
for (const entry of await readdir(output, { withFileTypes: true })) {
  await rm(new URL(entry.name + (entry.isDirectory() ? '/' : ''), output), { recursive: true, force: true });
}
await cp(fileURLToPath(source), fileURLToPath(output), { recursive: true });
console.log('Built static assets in dist/');
