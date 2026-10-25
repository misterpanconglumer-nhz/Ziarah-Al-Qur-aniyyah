import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const brandDir = path.resolve(publicDir, 'brand');

if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

const appIconSvg = fs.readFileSync(path.join(brandDir, 'app-icon.svg'));
const logoSymbolSvg = fs.readFileSync(path.join(brandDir, 'logo-symbol.svg'));

async function generate() {
  console.log('Generating PNG icons...');

  // 512x512
  await sharp(appIconSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(brandDir, 'app-icon-512.png'));
  console.log('Created app-icon-512.png');

  // 192x192
  await sharp(appIconSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(brandDir, 'app-icon-192.png'));
  console.log('Created app-icon-192.png');

  // Maskable 512x512 with safe padding
  await sharp(appIconSvg)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#142B4A'
    })
    .png()
    .toFile(path.join(brandDir, 'app-icon-maskable.png'));
  console.log('Created app-icon-maskable.png');

  // Favicon 32x32
  await sharp(logoSymbolSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(brandDir, 'favicon-32.png'));
  console.log('Created favicon-32.png');

  // Copy favicon to public root
  fs.copyFileSync(path.join(brandDir, 'favicon-32.png'), path.join(publicDir, 'favicon.ico'));
  fs.copyFileSync(path.join(brandDir, 'logo-symbol.svg'), path.join(publicDir, 'favicon.svg'));
  fs.copyFileSync(path.join(brandDir, 'app-icon-192.png'), path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(path.join(brandDir, 'app-icon-512.png'), path.join(publicDir, 'icon-512.png'));

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
