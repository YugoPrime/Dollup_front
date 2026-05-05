// One-off optimizer: reads from src/app/lookbook/Model <Name>/* (heavy originals)
// and writes optimized .webp files to public/lookbook/ with naming
// NN-model-name.webp so the lookbook page picks them up automatically.
// Run with: node scripts/optimize-lookbook.mjs

import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC_ROOT = path.resolve(process.cwd(), "src/app/lookbook");
const DEST = path.resolve(process.cwd(), "public/lookbook");
const MAX_WIDTH = 1600;
const QUALITY = 80;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function listModelDirs() {
  const entries = await readdir(SRC_ROOT, { withFileTypes: true });
  return entries
    .filter((d) => d.isDirectory() && d.name.toLowerCase().startsWith("model"))
    .map((d) => d.name);
}

async function listImages(dir) {
  const entries = await readdir(dir);
  return entries.filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
}

async function main() {
  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  const modelDirs = await listModelDirs();
  let counter = 0;
  const summary = [];

  for (const dirName of modelDirs) {
    const modelLabel = dirName.replace(/^model\s+/i, "").trim();
    const modelSlug = slug(modelLabel);
    const fullDir = path.join(SRC_ROOT, dirName);
    const files = await listImages(fullDir);

    for (const file of files) {
      counter += 1;
      const num = String(counter).padStart(2, "0");
      const outName = `${num}-${modelSlug}.webp`;
      const inPath = path.join(fullDir, file);
      const outPath = path.join(DEST, outName);

      const meta = await sharp(inPath).metadata();
      const inSize = meta.size ?? 0;

      await sharp(inPath)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath);

      const outMeta = await sharp(outPath).metadata();
      summary.push({
        in: file,
        out: outName,
        model: modelLabel,
        inKb: Math.round(inSize / 1024),
        outKb: Math.round((outMeta.size ?? 0) / 1024),
      });
    }
  }

  console.log(`\nOptimized ${summary.length} images → public/lookbook/\n`);
  for (const row of summary) {
    console.log(
      `  ${row.out.padEnd(28)} ${String(row.inKb).padStart(6)} KB → ${String(row.outKb).padStart(5)} KB  (${row.model})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
