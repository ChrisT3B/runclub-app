// high-contrast-icon-generator.cjs
// Creates high-contrast icons for better Windows Start Menu visibility

const fs = require('fs');
const path = require('path');

// Create public/icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Key icon sizes for PWA (focusing on most important ones)
const sizes = [72, 192, 512];

// High-contrast icon generator using your actual Run Alcester logo
const createHighContrastIcon = (size) => {
  const padding = size * 0.08; // 8% padding
  const logoSize = size - (padding * 2);
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Strong red background gradient for visibility -->
    <radialGradient id="strongBg${size}" cx="50%" cy="40%" r="80%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
    </radialGradient>
    
    <!-- White logo with subtle shadow for definition -->
    <filter id="logoGlow${size}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.008}" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>
  
  <!-- Solid red background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#strongBg${size})"/>
  
  <!-- White version of your logo, scaled appropriately -->
  <g transform="translate(${padding}, ${padding}) scale(${logoSize/800})" filter="url(#logoGlow${size})">
    <!-- Castle silhouette - simplified from your logo -->
    <g fill="white">
      <!-- Main castle structure -->
      <path d="M120 600 L120 200 L200 200 L200 120 L240 120 L240 180 L280 180 L280 80 L320 80 L320 160 L400 160 L400 600 Z" opacity="0.95"/>
      
      <!-- Castle tower details -->
      <rect x="160" y="320" width="80" height="160" fill="rgba(220,38,38,0.3)"/>
      <rect x="280" y="280" width="60" height="120" fill="rgba(220,38,38,0.3)"/>
      
      <!-- Castle battlements -->
      <rect x="120" y="180" width="20" height="40"/>
      <rect x="160" y="180" width="20" height="40"/>
      <rect x="200" y="180" width="20" height="40"/>
      <rect x="280" y="140" width="15" height="40"/>
      <rect x="305" y="140" width="15" height="40"/>
      <rect x="330" y="140" width="15" height="40"/>
      <rect x="355" y="140" width="15" height="40"/>
      <rect x="380" y="140" width="15" height="40"/>
      
      <!-- Small castle details -->
      <circle cx="200" cy="260" r="12" fill="rgba(220,38,38,0.4)"/>
      <circle cx="310" cy="220" r="8" fill="rgba(220,38,38,0.4)"/>
    </g>
    
    <!-- Running shoe - white version -->
    <g transform="translate(150, 420)" fill="white">
      <!-- Shoe sole -->
      <ellipse cx="200" cy="140" rx="180" ry="40" opacity="0.9"/>
      
      <!-- Shoe upper -->
      <path d="M40 140 C40 100, 120 60, 280 80 C320 90, 340 120, 320 140 Z" opacity="0.95"/>
      
      <!-- Shoe details (laces/stripes) -->
      <rect x="100" y="90" width="20" height="40" fill="rgba(220,38,38,0.6)" rx="4"/>
      <rect x="130" y="95" width="20" height="35" fill="rgba(220,38,38,0.6)" rx="4"/>
      <rect x="160" y="100" width="20" height="30" fill="rgba(220,38,38,0.6)" rx="4"/>
      <rect x="190" y="105" width="20" height="25" fill="rgba(220,38,38,0.6)" rx="4"/>
      <rect x="220" y="110" width="20" height="20" fill="rgba(220,38,38,0.6)" rx="4"/>
      <rect x="250" y="115" width="20" height="15" fill="rgba(220,38,38,0.6)" rx="4"/>
    </g>
  </g>
  
  <!-- Add text for larger icons for better recognition -->
  ${size >= 192 ? `
  <text x="${size * 0.5}" y="${size * 0.9}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.08}" opacity="0.9">
    RUN ALCESTER
  </text>` : size >= 72 ? `
  <text x="${size * 0.5}" y="${size * 0.9}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.12}" opacity="0.9">
    RA
  </text>` : ''}
</svg>`;
};

// Generate high-contrast icons
console.log('🎨 Creating high-contrast PWA icons for Windows visibility...\n');

sizes.forEach(size => {
  const svgContent = createHighContrastIcon(size);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}-contrast.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Created icon-${size}x${size}-contrast.svg`);
});

// Create high-contrast favicon
const faviconSVG = createHighContrastIcon(32);
const faviconPath = path.join(__dirname, 'public', 'favicon-contrast.svg');
fs.writeFileSync(faviconPath, faviconSVG);
console.log('✅ Created favicon-contrast.svg');

console.log('\n🎉 High-contrast icons generated!');
console.log('\n📝 Next steps:');
console.log('1. Convert SVG files to PNG using online converter or ImageMagick');
console.log('2. Replace your existing icon PNG files with these high-contrast versions');
console.log('3. Update vite.config.ts to use the new icons');
console.log('4. Rebuild and reinstall the PWA');

console.log('\n🔍 Key improvements:');
console.log('✅ Solid red background for Windows visibility');
console.log('✅ White logo elements for high contrast'); 
console.log('✅ Clear "RA" text for smaller icons');
console.log('✅ "RUN ALCESTER" text for larger icons');

// Create conversion script
const conversionScript = `#!/bin/bash
echo "🔄 Converting high-contrast icons to PNG..."

cd public/icons/

# Convert high-contrast icons
for size in 72 192 512; do
  if command -v magick &> /dev/null; then
    magick icon-\${size}x\${size}-contrast.svg icon-\${size}x\${size}.png
  elif command -v convert &> /dev/null; then
    convert icon-\${size}x\${size}-contrast.svg icon-\${size}x\${size}.png
  else
    echo "❌ ImageMagick not found. Use online converter:"
    echo "   https://cloudconvert.com/svg-to-png"
    echo "   Convert: icon-\${size}x\${size}-contrast.svg → icon-\${size}x\${size}.png"
  fi
  echo "✅ Converted icon-\${size}x\${size}.png (high-contrast)"
done

cd ../
# Convert high-contrast favicon
if command -v magick &> /dev/null; then
  magick favicon-contrast.svg favicon.png
elif command -v convert &> /dev/null; then
  convert favicon-contrast.svg favicon.png
fi

echo "🎉 High-contrast icons ready for Windows!"
echo "📱 Your app will now be clearly visible in Windows Start Menu"
`;

const scriptPath = path.join(__dirname, 'convert-contrast-icons.sh');
fs.writeFileSync(scriptPath, conversionScript);
fs.chmodSync(scriptPath, '755');
console.log('📜 Created convert-contrast-icons.sh script');