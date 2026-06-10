import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_CANDIDATES = [
  "public/assets/icon-only.png",
  "public/icon.png",
  "public/assets/icon.png",
  "public/logo-symbol-dark.png",
  "src/assets/logo-symbol-dark.png",
];

const sourcePath = SOURCE_CANDIDATES.map((relativePath) =>
  path.join(root, relativePath),
).find((candidate) => fs.existsSync(candidate));

if (!sourcePath) {
  console.error("No icon source file found.");
  process.exit(1);
}

const outputDir = path.join(
  root,
  "ios/App/App/Assets.xcassets/AppIcon.appiconset",
);

const sizes = [
  [20, "icon_20x20.png"],
  [29, "icon_29x29.png"],
  [38, "icon_38x38.png"],
  [40, "icon_40x40.png"],
  [58, "icon_58x58.png"],
  [60, "icon_60x60.png"],
  [64, "icon_64x64.png"],
  [76, "icon_76x76.png"],
  [80, "icon_80x80.png"],
  [87, "icon_87x87.png"],
  [114, "icon_114x114.png"],
  [120, "icon_120x120.png"],
  [128, "icon_128x128.png"],
  [136, "icon_136x136.png"],
  [152, "icon_152x152.png"],
  [167, "icon_167x167.png"],
  [180, "icon_180x180.png"],
  [192, "icon_192x192.png"],
  [1024, "icon_1024x1024.png"],
];

console.log(`Source: ${path.relative(root, sourcePath)}`);
console.log(`Output: ${path.relative(root, outputDir)}`);

for (const [size, filename] of sizes) {
  const outputPath = path.join(outputDir, filename);

  if (size === 1024) {
    await sharp(sourcePath)
      .resize(size, size, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(outputPath);
  } else {
    await sharp(sourcePath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
  }

  console.log(`✓ ${filename} (${size}x${size})`);
}

console.log(`\nGenerated ${sizes.length} icons.`);
