import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');

// Read SVG
const svgBuffer = fs.readFileSync(svgPath);

// Generate regular icons
await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'icon-192.png'));
console.log('✅ Generated icon-192.png');

await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'));
console.log('✅ Generated icon-512.png');

// Generate maskable icons with safe area padding (10% padding each side = 80% content)
// For maskable icons, the safe area is the inner 80% circle
await sharp(svgBuffer)
    .resize(154, 154) // 192 * 0.8 = 153.6, rounded to 154
    .extend({
        top: 19,
        bottom: 19,
        left: 19,
        right: 19,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
    })
    .png()
    .toFile(join(publicDir, 'icon-maskable-192.png'));
console.log('✅ Generated icon-maskable-192.png');

await sharp(svgBuffer)
    .resize(410, 410) // 512 * 0.8 = 409.6, rounded to 410
    .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
    })
    .png()
    .toFile(join(publicDir, 'icon-maskable-512.png'));
console.log('✅ Generated icon-maskable-512.png');

console.log('\\n🎉 All icons generated successfully!');
