#!/usr/bin/env node
/**
 * Print SHA-256 checksum and byte size for a file.
 * Useful when filling model manifest entries.
 *
 * Usage:
 *   node mobile/scripts/checksum-file.mjs <file> [--json]
 */

import crypto from 'node:crypto';
import fs from 'node:fs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const file = args.find((a) => a !== '--json');

if (!file) {
  console.error('Usage: node mobile/scripts/checksum-file.mjs <file> [--json]');
  process.exit(2);
}

if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const sizeBytes = fs.statSync(file).size;
const hash = crypto.createHash('sha256');
const stream = fs.createReadStream(file);

stream.on('data', (chunk) => hash.update(chunk));
stream.on('error', (err) => {
  console.error(`Failed to read file: ${err.message}`);
  process.exit(1);
});
stream.on('end', () => {
  const sha256 = hash.digest('hex');
  if (json) {
    console.log(JSON.stringify({ path: file, sha256, sizeBytes }, null, 2));
  } else {
    console.log(`sha256: ${sha256}`);
    console.log(`sizeBytes: ${sizeBytes}`);
    console.log(`path: ${file}`);
  }
});
