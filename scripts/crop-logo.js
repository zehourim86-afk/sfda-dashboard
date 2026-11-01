// One-time script: crop the DEMARA logo to its artwork and make the background transparent.
//   node scripts/crop-logo.js
// Input:  public/logo_1.png  (8001x4500 canvas, flat purple background, artwork in the middle)
// Output: public/demara-logo-transparent.png  (tight crop, transparent background)
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'public', 'logo_1.png');
const OUT = path.join(__dirname, '..', 'public', 'demara-logo-transparent.png');
const OUTPUT_HEIGHT = 300;   // plenty for a 52px topbar logo on high-DPI screens
const PAD = 0.03;            // breathing room around the artwork, as a fraction of its size
const SOFT = 140;            // colour distance at which a pixel counts as fully opaque

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const bg = [data[0], data[1], data[2]];   // the canvas is a flat colour; top-left pixel is background
  const dist = (i) => Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);

  // 1. Bounding box of everything that is clearly not background
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dist((y * width + x) * channels) > 40) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('No artwork found');
  const padX = Math.round((maxX - minX) * PAD), padY = Math.round((maxY - minY) * PAD);
  const left = Math.max(0, minX - padX), top = Math.max(0, minY - padY);
  const cw = Math.min(width, maxX + padX + 1) - left, ch = Math.min(height, maxY + padY + 1) - top;

  // 2. Colour-to-alpha: background becomes transparent, anti-aliased edges become partly
  //    transparent with the background colour taken back out, so they stay smooth on any colour.
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = ((y + top) * width + (x + left)) * channels, o = (y * cw + x) * 4;
      const a = Math.min(1, dist(i) / SOFT);
      for (let c = 0; c < 3; c++) {
        out[o + c] = a > 0 ? Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - a) * bg[c]) / a))) : 0;
      }
      out[o + 3] = Math.round(a * 255);
    }
  }

  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .resize({ height: OUTPUT_HEIGHT })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`source ${width}x${height}, background rgb(${bg.join(',')})`);
  console.log(`artwork box x ${minX}-${maxX}, y ${minY}-${maxY} -> crop ${cw}x${ch}`);
  console.log(`saved ${path.relative(process.cwd(), OUT)}: ${meta.width}x${meta.height}, alpha=${meta.hasAlpha}`);
})().catch((e) => { console.error(e); process.exit(1); });
