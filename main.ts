#!/usr/bin/env node
// gta6-trophy-guide-01 — dossier build pipeline (v2).
//
// Stages the static app and its render captures into MAKEFUN_OUTPUT_DIR
// (default /output), then emits dossier.json through the vendored make.fun
// builder. Pure Node 22 stdlib; no network, no install, no build step.
//
// Guards run before anything is staged:
//   * app/index.html must exist (the entry point the grader opens);
//   * screenshots/ must hold 3–4 PNG/JPEG captures, each <= 262144 bytes.
// Paths anchor to this file's own directory so the build works from any cwd.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const SHOT_MIN = 3;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 262144;
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

function die(reason) {
  console.error(`build refused: ${reason}`);
  process.exit(1);
}

function extOf(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

// --- guard 1: the app entry point must be present -------------------------
const appDir = join(HERE, 'app');
if (!existsSync(join(appDir, 'index.html'))) {
  die(`app/index.html is missing under ${appDir}`);
}

// --- guard 2: screenshot count and per-image byte cap ---------------------
const shotDir = join(HERE, 'screenshots');
if (!existsSync(shotDir)) {
  die(`screenshots/ directory is missing under ${HERE}`);
}
const shots = readdirSync(shotDir)
  .filter((name) => IMAGE_EXT.has(extOf(name)))
  .filter((name) => statSync(join(shotDir, name)).isFile())
  .sort();
if (shots.length < SHOT_MIN || shots.length > SHOT_MAX) {
  die(`expected ${SHOT_MIN}-${SHOT_MAX} screenshots, found ${shots.length}`);
}
for (const name of shots) {
  const bytes = statSync(join(shotDir, name)).size;
  if (bytes > SHOT_MAX_BYTES) {
    die(`${name} is ${bytes} bytes, over the ${SHOT_MAX_BYTES}-byte cap`);
  }
}

// --- stage: copy app/ and screenshots/ into the output directory ----------
mkdirSync(OUT, { recursive: true });
cpSync(appDir, join(OUT, 'app'), { recursive: true, force: true });
cpSync(shotDir, join(OUT, 'screenshots'), { recursive: true, force: true });

// --- emit: canonical dossier bytes from the vendored builder --------------
const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: SHOT_MAX, max_bytes: SHOT_MAX_BYTES },
  app_max_files: 993,
  app_max_bytes: 50331648
});
const dossierPath = join(OUT, 'dossier.json');
writeFileSync(dossierPath, dossier);
console.log(`staged ${shots.length} screenshots + app/ -> ${OUT}`);
console.log(`dossier written: ${dossierPath} (${dossier.length} bytes)`);
