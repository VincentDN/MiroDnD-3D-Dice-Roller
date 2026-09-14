import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const input = resolve(process.argv[2] || 'desktop/release');
const filename = 'VincentsVibeRoller.exe';
const bytes = readFileSync(resolve(input, filename));
// Keep ordinary clones usable without Git LFS and fail before GitHub rejects a blob.
if (bytes.length >= 100 * 1024 * 1024) throw new Error('Portable EXE exceeds the GitHub 100 MiB file limit. Reduce packaging size before publishing.');
if (bytes[0] !== 0x4d || bytes[1] !== 0x5a) throw new Error('Portable artifact is not a Windows executable.');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const expected = readFileSync(resolve(input, 'SHA256SUMS.txt'), 'utf8').trim().split(/\s+/);
if (expected[0].toLowerCase() !== sha256 || expected[1] !== filename) throw new Error('Portable artifact checksum mismatch.');
const source = process.env.GITHUB_SHA;
if (!source || !/^[a-f0-9]{40}$/.test(source)) throw new Error('GITHUB_SHA must identify the tested source commit.');
mkdirSync('portable', { recursive: true });
copyFileSync(resolve(input, filename), resolve('portable', filename));
writeFileSync('portable/SHA256SUMS.txt', `${sha256}  ${filename}\n`);
writeFileSync('portable/build.json', JSON.stringify({
  version: JSON.parse(readFileSync('desktop/package.json', 'utf8')).version,
  sourceCommit: source,
  release: process.env.PORTABLE_RELEASE || null,
  sha256,
  bytes: statSync(resolve('portable', filename)).size,
}, null, 2) + '\n');
console.log(`Verified portable EXE: ${sha256}`);
