// Generates the install / home-screen icons from public/logo.png.
//
// The logo is the coral dress inside curved "DOLL UP BOUTIQUE" lettering. At
// app-icon size the lettering is unreadable and a square crop clips it into
// stray letters, so this keeps only the dress: coral pixels plus a band around
// them wide enough for the dress's black outline, but not reaching the text.
//
// Outputs:
//   public/pwa/icon-192.png, icon-512.png  manifest "any" icons, transparent
//   public/pwa/icon-maskable-512.png       manifest "maskable", cream full-bleed,
//                                          dress inside the 80% safe circle
//   src/app/apple-icon.png                 iOS home screen (opaque: iOS turns
//                                          transparency black)
//   src/app/icon.png                       browser-tab favicon
//
// Run from DUB-front: node scripts/generate-pwa-icons.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("public", "logo.png");
const PWA_DIR = path.resolve("public", "pwa");
const APP = path.resolve("src", "app");
const CREAM = { r: 0xfd, g: 0xf8, b: 0xf7, alpha: 1 }; // --color-cream
const OUTLINE_BAND = 24; // px around the coral that still counts as dress

function isCoral(r, g, b, a) {
  return a > 128 && r > 150 && r - b > 60 && r - g > 40;
}

// Square dilation via two separable running-max passes.
function dilate(mask, w, h, radius) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let dx = -radius; dx <= radius && !hit; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < w && mask[y * w + xx]) hit = 1;
      }
      tmp[y * w + x] = hit;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let dy = -radius; dy <= radius && !hit; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < h && tmp[yy * w + x]) hit = 1;
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}

async function extractDress() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const coral = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    coral[i] = isCoral(data[o], data[o + 1], data[o + 2], data[o + 3]) ? 1 : 0;
  }
  const keep = dilate(coral, w, h, OUTLINE_BAND);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!keep[i]) {
        data[i * 4 + 3] = 0;
        continue;
      }
      if (data[i * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}

// Fit the dress into `fraction` of a size×size canvas, centred.
async function icon(dress, size, fraction, background) {
  const box = Math.round(size * fraction);
  const fitted = await sharp(dress)
    .resize(box, box, { fit: "inside" })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .png({ compressionLevel: 9 });
}

async function main() {
  const dress = await extractDress();
  await fs.mkdir(PWA_DIR, { recursive: true });

  const outputs = [
    { out: path.join(PWA_DIR, "icon-192.png"), size: 192, fraction: 0.9 },
    { out: path.join(PWA_DIR, "icon-512.png"), size: 512, fraction: 0.9 },
    // Maskable safe zone is a centred circle 80% wide; 0.6 keeps the skirt's
    // bottom corners inside it.
    { out: path.join(PWA_DIR, "icon-maskable-512.png"), size: 512, fraction: 0.6, bg: CREAM },
    { out: path.join(APP, "apple-icon.png"), size: 180, fraction: 0.74, bg: CREAM },
    { out: path.join(APP, "icon.png"), size: 512, fraction: 0.94 },
  ];
  for (const o of outputs) {
    await (await icon(dress, o.size, o.fraction, o.bg)).toFile(o.out);
    console.log(`✓ ${path.relative(".", o.out)} (${o.size}px)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
