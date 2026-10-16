// Runs after `expo export --platform web`. Lists every file in the web build so
// the service worker can save the whole app for offline use on the first
// visit, and stamps the service worker's cache name with a build ID.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const skipped = new Set(['/index.html', '/metadata.json', '/precache.json', '/sw.js']);

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [`/${relative(dist, path).split(sep).join('/')}`];
  });
}

const files = ['/', ...listFiles(dist).filter((file) => !skipped.has(file)).sort()];
writeFileSync(join(dist, 'precache.json'), `${JSON.stringify(files, null, 2)}\n`);

const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(readFileSync(join(dist, file === '/' ? 'index.html' : file)));
}
const buildId = hash.digest('hex').slice(0, 12);
const workerPath = join(dist, 'sw.js');
writeFileSync(
  workerPath,
  readFileSync(workerPath, 'utf8').replace("'one-percent-better-v1'", `'one-percent-better-${buildId}'`),
);

console.log(`Saved a list of ${files.length} files for offline use (build ${buildId}).`);
