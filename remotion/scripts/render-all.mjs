// Renders every lesson animation to ../SCH4U/media/<file>.mp4 plus a <file>.jpg poster still.
// Usage: pnpm render            (Remotion downloads its own browser the first time)
//        REMOTION_BROWSER=/path/to/chrome pnpm render   (use an already-installed Chromium)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.resolve(root, "../SCH4U/media");
mkdirSync(outDir, { recursive: true });

// Keep in sync with VIDEOS in src/Root.tsx: [composition id, output file, poster frame]
const VIDEOS = [
  ["GoldFoil", "gold-foil", 340],
  ["Photoelectric", "photoelectric", 330],
  ["BohrHydrogen", "bohr-hydrogen", 520],
  ["Orbitals", "orbitals", 440],
  ["Polymerization", "polymerization", 215],
  ["CollisionTheory", "collision-theory", 395],
];
const only = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER || null;
const chromeMode = browserExecutable ? "chrome-for-testing" : undefined;

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
for (const [id, file, poster] of VIDEOS) {
  if (only.length && !only.includes(id)) continue;
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromeMode });
  await renderMedia({
    composition, serveUrl, browserExecutable, chromeMode,
    codec: "h264", crf: 30, pixelFormat: "yuv420p", muted: true, imageFormat: "png", // png frames keep the standard (limited-range) yuv420p colour range that every browser and phone decodes
    outputLocation: path.join(outDir, `${file}.mp4`),
  });
  await renderStill({
    composition, serveUrl, browserExecutable, chromeMode, frame: poster, imageFormat: "jpeg", jpegQuality: 82,
    output: path.join(outDir, `${file}.jpg`),
  });
  const kb = (p) => Math.round(statSync(p).size / 1024);
  console.log(`${id}: ${file}.mp4 ${kb(path.join(outDir, file + ".mp4"))} KB, poster ${kb(path.join(outDir, file + ".jpg"))} KB`);
}
