#!/usr/bin/env node
/**
 * Create a model manifest JSON template with real checksum/size filled in.
 * No external dependencies.
 *
 * Usage:
 *   node mobile/scripts/create-manifest.mjs \
 *     --model-id <id> --mode <mode> --runtime <runtime> \
 *     --file <path> --stems vocals,instrumental \
 *     [--version 0.1.0] [--sample-rate 44100] [--channels 2] [--format float32] \
 *     [--license-name ""] [--license-url ""] [--notes ""]
 *
 * Prints manifest JSON to stdout. Redirect to a file to save it.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function getArg(name, fallback = undefined) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (value === undefined || value.startsWith('--')) return fallback;
  return value;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

if (hasFlag('help') || args.length === 0) {
  console.error(`Usage:
  node mobile/scripts/create-manifest.mjs \\
    --model-id <id> --mode <mode> --runtime <runtime> \\
    --file <path> --stems <stem1,stem2,...> \\
    [--version 0.1.0] [--sample-rate 44100] [--channels 2] [--format float32] \\
    [--license-name "..."] [--license-url "..."] [--notes "..."]

Required:
  --model-id      Model identifier, e.g. htdemucs-vocals-onnx
  --mode          Capability mode, e.g. vocal_instrumental
  --runtime       onnxruntime | coreml | litert | executorch | custom
  --file          Path to model file (checksum/size computed from this file)
  --stems         Comma-separated output stems, e.g. vocals,instrumental
`);
  process.exit(args.length === 0 ? 2 : 0);
}

const modelId = getArg('model-id');
const mode = getArg('mode');
const runtime = getArg('runtime');
const file = getArg('file');
const stemsArg = getArg('stems');
const version = getArg('version', '0.1.0');
const sampleRate = Number(getArg('sample-rate', '44100'));
const channels = Number(getArg('channels', '2'));
const format = getArg('format', 'float32');
const licenseName = getArg('license-name', '');
const licenseUrl = getArg('license-url', '');
const notes = getArg('notes', '');

const missing = [];
if (!modelId) missing.push('--model-id');
if (!mode) missing.push('--mode');
if (!runtime) missing.push('--runtime');
if (!file) missing.push('--file');
if (!stemsArg) missing.push('--stems');
if (missing.length) {
  console.error(`Missing required args: ${missing.join(', ')}`);
  process.exit(2);
}

const allowedRuntimes = ['onnxruntime', 'coreml', 'litert', 'executorch', 'custom'];
if (!allowedRuntimes.includes(runtime)) {
  console.error(`Invalid --runtime "${runtime}". Expected one of: ${allowedRuntimes.join(', ')}`);
  process.exit(2);
}

const stems = stemsArg.split(',').map((s) => s.trim()).filter(Boolean);
if (stems.length === 0) {
  console.error('--stems must contain at least one stem name');
  process.exit(2);
}

if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const sizeBytes = fs.statSync(file).size;
const hash = crypto.createHash('sha256');

await new Promise((resolve, reject) => {
  const stream = fs.createReadStream(file);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', resolve);
});

const sha256 = hash.digest('hex');
const manifest = {
  modelId,
  mode,
  version,
  runtime,
  files: [
    {
      path: path.basename(file),
      sha256,
      sizeBytes,
    },
  ],
  input: {
    sampleRate,
    channels,
    format,
  },
  output: {
    stems,
  },
};

if (licenseName || licenseUrl) {
  manifest.license = {};
  if (licenseName) manifest.license.name = licenseName;
  if (licenseUrl) manifest.license.url = licenseUrl;
}

if (notes) manifest.notes = notes;

console.log(JSON.stringify(manifest, null, 2));
