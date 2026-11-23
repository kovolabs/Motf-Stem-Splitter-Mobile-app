#!/usr/bin/env node
/**
 * Lightweight model manifest validator.
 * No external dependencies; checks required fields and basic types.
 *
 * Usage:
 *   node mobile/scripts/validate-manifest.mjs path/to/manifest.json
 */

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node mobile/scripts/validate-manifest.mjs <manifest.json>');
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Invalid JSON: ${err.message}`);
  process.exit(1);
}

const errors = [];
const allowedRuntimes = ['onnxruntime', 'coreml', 'litert', 'executorch', 'custom'];
const allowedSampleRates = [16000, 22050, 44100, 48000];
const allowedChannels = [1, 2];
const allowedFormats = ['float32', 'float16', 'int16'];

function req(cond, msg) { if (!cond) errors.push(msg); }
function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

req(isObj(manifest), 'Manifest must be a JSON object');
if (isObj(manifest)) {
  req(typeof manifest.modelId === 'string' && manifest.modelId.length > 0, 'modelId is required');
  req(typeof manifest.mode === 'string' && manifest.mode.length > 0, 'mode is required');
  req(typeof manifest.version === 'string' && manifest.version.length > 0, 'version is required');
  req(allowedRuntimes.includes(manifest.runtime), `runtime must be one of: ${allowedRuntimes.join(', ')}`);

  req(Array.isArray(manifest.files) && manifest.files.length > 0, 'files must be a non-empty array');
  if (Array.isArray(manifest.files)) {
    manifest.files.forEach((f, i) => {
      req(isObj(f), `files[${i}] must be an object`);
      if (!isObj(f)) return;
      req(typeof f.path === 'string' && f.path.length > 0, `files[${i}].path is required`);
      req(typeof f.sha256 === 'string' && /^[a-fA-F0-9]{64}$/.test(f.sha256), `files[${i}].sha256 must be 64 hex chars`);
      if (f.sizeBytes !== undefined) req(Number.isInteger(f.sizeBytes) && f.sizeBytes >= 0, `files[${i}].sizeBytes must be integer >= 0`);
    });
  }

  req(isObj(manifest.input), 'input is required');
  if (isObj(manifest.input)) {
    req(allowedSampleRates.includes(manifest.input.sampleRate), `input.sampleRate must be one of ${allowedSampleRates.join(', ')}`);
    req(allowedChannels.includes(manifest.input.channels), `input.channels must be 1 or 2`);
    req(allowedFormats.includes(manifest.input.format), `input.format must be one of ${allowedFormats.join(', ')}`);
  }

  req(isObj(manifest.output), 'output is required');
  if (isObj(manifest.output)) {
    req(Array.isArray(manifest.output.stems) && manifest.output.stems.length > 0, 'output.stems must be non-empty array');
    if (Array.isArray(manifest.output.stems)) {
      manifest.output.stems.forEach((s, i) => req(typeof s === 'string' && s.length > 0, `output.stems[${i}] must be string`));
    }
  }
}

if (errors.length) {
  console.error(`Manifest invalid: ${file}`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Manifest OK: ${file}`);