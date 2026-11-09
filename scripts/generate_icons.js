import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG definition for FREELAS
// 512x512 viewBox with deep teal gradient, inner subtle glow, and an architectural,
// minimalist, iconic symbol combining an elevated 'F' and financial ascending facets
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background gradients: Deep luxury petroleum teal -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c2b24" />
      <stop offset="50%" stop-color="#09201b" />
      <stop offset="100%" stop-color="#04120f" />
    </linearGradient>

    <radialGradient id="centerGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#145a4c" stop-opacity="0.45" />
      <stop offset="60%" stop-color="#0d3b32" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#04120f" stop-opacity="0" />
    </radialGradient>

    <!-- Symbol Primary Gradient: Vivid Teal to Emerald -->
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="35%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>

    <!-- Symbol Secondary Gradient: Deep Teal Sheen -->
    <linearGradient id="tealDeep" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>

    <!-- Accent Gradient: Warm Champagne Copper / Gold -->
    <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Base background (for rounded squircle launcher) -->
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)" />
  <rect width="512" height="512" rx="116" fill="url(#centerGlow)" />
  <!-- Delicate perimeter border -->
  <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke="#256b5c" stroke-width="2.5" stroke-opacity="0.3" />

  <!-- Central Freelance & Financial Growth Emblem (Strictly within safe area: 100 to 412) -->
  <g filter="url(#subtleShadow)">
    <!-- Vertical Anchor Column (Left spine of the F, representing stability and foundation) -->
    <path
      d="M148 142 C148 133 155 126 164 126 L196 126 C205 126 212 133 212 142 L212 370 C212 379 205 386 196 386 L164 386 C155 386 148 379 148 370 Z"
      fill="url(#tealDeep)"
    />

    <!-- Top Forward Momentum Wing (Upper arm of the F, dynamic chamfer) -->
    <path
      d="M212 126 L348 126 C358 126 365 136 360 145 L328 193 C324 199 317 203 310 203 L212 203 Z"
      fill="url(#tealGrad)"
    />

    <!-- Middle Productivity & Financial Growth Node (Mid arm of the F with ascending energy facet) -->
    <path
      d="M212 238 L284 238 C292 238 299 243 303 250 L318 277 C324 287 317 299 305 299 L212 299 Z"
      fill="url(#tealGrad)"
    />

    <!-- Upward Golden Growth Accent / Value Node (Champagne Copper Diamond) -->
    <path
      d="M346 226 L372 252 C376 256 376 262 372 266 L346 292 C342 296 336 296 332 292 L306 266 C302 262 302 256 306 252 L332 226 C336 222 342 222 346 226 Z"
      fill="url(#copperGrad)"
    />

    <!-- Upward Trend Accent Line (subtle financial trajectory spark) -->
    <circle cx="339" cy="162" r="14" fill="url(#copperGrad)" />
  </g>
</svg>
`;

// Maskable version: Full bleed background (no rounded corners so OS can apply any mask)
const maskableSvg = svgContent.replace(/rx="116"/g, 'rx="0"').replace(/rx="114"/g, 'rx="0"');

async function run() {
  const publicIconsDir = path.resolve('public/icons');
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // 1. Write the main vector SVG
  fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.resolve('public/favicon.svg'), svgContent, 'utf-8');

  const svgBuffer = Buffer.from(svgContent);
  const maskableBuffer = Buffer.from(maskableSvg);

  // 2. Render 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'icon-192.png'));

  // 3. Render 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'icon-512.png'));

  // 4. Render 512x512 Maskable PNG
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'icon-maskable-512.png'));

  // 5. Render Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicIconsDir, 'apple-touch-icon.png'));

  // 6. Render Favicon 32x32 and 48x48
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.resolve('public/favicon-32x32.png'));

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));

  console.log('✅ All FREELAS icons generated successfully!');
}

run().catch(console.error);
