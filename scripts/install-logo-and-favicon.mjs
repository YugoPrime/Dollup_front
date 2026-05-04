// One-shot: copy ../cropped-final.png to public/logo.png and derive favicons
// (cropping out the curved "DOLL UP BOUTIQUE" text band so the favicon is just the dress).
//
// Run from DUB-front: node scripts/install-logo-and-favicon.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("..");
const SRC = path.join(ROOT, "cropped-final.png");
const PUBLIC = path.resolve("public");
const APP = path.resolve("src", "app");

async function main() {
  const buf = await fs.readFile(SRC);
  console.log(`source: ${SRC} (${buf.length} bytes)`);

  // 1. Drop into public/logo.png (replacing the old)
  await fs.writeFile(path.join(PUBLIC, "logo.png"), buf);
  console.log("✓ public/logo.png replaced");

  // 2. Inspect dimensions
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  console.log(`  dims: ${W} × ${H}`);

  // 3. Crop the top portion (dress + bow only — exclude the curved text below).
  //    The text occupies roughly the bottom ~32% of the image. Trial: keep top 68%.
  //    Then square-pad with transparent so it centers cleanly in the favicon.
  const topH = Math.round(H * 0.68);
  const cropped = await sharp(buf)
    .extract({ left: 0, top: 0, width: W, height: topH })
    .png()
    .toBuffer();
  const croppedMeta = await sharp(cropped).metadata();
  const cw = croppedMeta.width ?? W;
  const ch = croppedMeta.height ?? topH;
  console.log(`  cropped dress: ${cw} × ${ch}`);

  // Square the canvas (pad to max dim) with transparent bg
  const side = Math.max(cw, ch);
  const padLeft = Math.floor((side - cw) / 2);
  const padTop = Math.floor((side - ch) / 2);
  const squared = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: padLeft, top: padTop }])
    .png()
    .toBuffer();
  console.log(`  squared: ${side} × ${side}`);

  // 4. Emit standard favicon set
  const tasks = [
    { out: path.join(APP, "icon.png"), size: 512 }, // Next.js auto-uses this
    { out: path.join(APP, "apple-icon.png"), size: 180 }, // Next.js auto-uses this
    { out: path.join(PUBLIC, "icon-192.png"), size: 192 },
    { out: path.join(PUBLIC, "icon-512.png"), size: 512 },
  ];
  for (const t of tasks) {
    await sharp(squared).resize(t.size, t.size).png({ compressionLevel: 9 }).toFile(t.out);
    console.log(`✓ ${path.relative(".", t.out)}  (${t.size}px)`);
  }

  // 5. Replace the default favicon.ico with our 32px PNG (browsers accept PNG inside .ico container,
  //    but to be safe we write a 32px PNG and rename — modern browsers prefer src/app/icon.png anyway)
  // Next.js convention: src/app/favicon.ico OR src/app/icon.{png,svg} — both supported.
  // We delete favicon.ico so the new icon.png is used cleanly.
  const faviconIco = path.join(APP, "favicon.ico");
  try {
    await fs.unlink(faviconIco);
    console.log(`✓ removed src/app/favicon.ico (replaced by icon.png)`);
  } catch {
    /* didn't exist */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
