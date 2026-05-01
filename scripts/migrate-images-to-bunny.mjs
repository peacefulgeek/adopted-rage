#!/usr/bin/env node
// Master scope §9B: convert ALL local hero PNGs to compressed WebP and
// upload to Bunny storage zone, then delete the local copies. Repo
// stays image-free (only public/favicon.svg permitted).
//
// Usage: node scripts/migrate-images-to-bunny.mjs
//
// Reads creds from src/lib/site-config.mjs (BUNNY).
// Source dir: /home/ubuntu/webdev-static-assets/  (contains af-hero-*.png and af-card-*.png)
// Target on Bunny: /heroes/<slug>.webp  (one file per topic, plus af-card-* if useful later)

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { BUNNY } from '../src/lib/site-config.mjs';

const SRC = '/home/ubuntu/webdev-static-assets';
const TMP = '/tmp/adopted-rage-webp';
fs.mkdirSync(TMP, { recursive: true });

const ENDPOINT = `https://${BUNNY.HOSTNAME}/${BUNNY.STORAGE_ZONE}`;

if (!BUNNY.API_KEY) {
  console.error('[migrate] BUNNY.API_KEY missing in site-config.mjs');
  process.exit(2);
}

async function uploadOne(localPath, remotePath) {
  const buf = fs.readFileSync(localPath);
  const url = `${ENDPOINT}/${remotePath}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY.API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: buf,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`upload failed ${r.status} ${url} ${t}`);
  }
  return url;
}

async function convert(srcFile, outFile) {
  await sharp(srcFile)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(outFile);
  return fs.statSync(outFile).size;
}

async function run() {
  const files = fs
    .readdirSync(SRC)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
  console.log(`[migrate] found ${files.length} local images in ${SRC}`);

  let okCount = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const fname of files) {
    const srcPath = path.join(SRC, fname);
    const base = fname.replace(/\.(png|jpe?g)$/i, '');
    const webpName = `${base}.webp`;
    const outPath = path.join(TMP, webpName);
    let bytesIn = 0;
    try {
      bytesIn = fs.statSync(srcPath).size;
      const bytesOut = await convert(srcPath, outPath);
      totalIn += bytesIn;
      totalOut += bytesOut;
      // Heroes go to /heroes/, cards to /cards/
      const remote = fname.startsWith('af-hero-')
        ? `heroes/${webpName}`
        : `cards/${webpName}`;
      const url = await uploadOne(outPath, remote);
      const cdnUrl = `${BUNNY.PULL_ZONE}/${remote}`;
      console.log(
        `[migrate] OK ${fname} -> ${webpName} (${(bytesIn / 1024).toFixed(0)}K -> ${(bytesOut / 1024).toFixed(0)}K) -> ${cdnUrl}`
      );
      okCount++;
    } catch (err) {
      console.error(`[migrate] FAIL ${fname}: ${err.message}`);
    }
  }

  console.log('---');
  console.log(`[migrate] uploaded ${okCount}/${files.length}`);
  console.log(
    `[migrate] total ${(totalIn / 1024 / 1024).toFixed(1)}MB png -> ${(totalOut / 1024 / 1024).toFixed(1)}MB webp`
  );

  // Wipe local source images and tmp.
  if (okCount === files.length) {
    for (const f of files) fs.unlinkSync(path.join(SRC, f));
    console.log(`[migrate] deleted ${files.length} local source images from ${SRC}`);
  } else {
    console.log('[migrate] some uploads failed; NOT deleting local sources');
  }
  fs.rmSync(TMP, { recursive: true, force: true });
}

run().catch((e) => {
  console.error('[migrate] fatal:', e);
  process.exit(1);
});
