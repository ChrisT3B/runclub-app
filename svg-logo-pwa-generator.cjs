// svg-logo-pwa-generator.js
// This creates PWA icons using your actual Run Alcester SVG logo

const fs = require('fs');
const path = require('path');

// Create public/icons directory
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Function to create PWA icon using your actual logo
const createPWAIcon = (size, logoSVGContent) => {
  // Calculate padding and logo size
  const padding = size * 0.08; // 8% padding for breathing room
  const logoSize = size - (padding * 2);
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad${size}" cx="50%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
    </radialGradient>
    
    <!-- Subtle shadow -->
    <filter id="logoShadow${size}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.01}" stdDeviation="${size * 0.008}" flood-color="rgba(0,0,0,0.15)"/>
    </filter>
    
    <!-- Border shadow -->
    <filter id="borderShadow${size}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.015}" flood-color="rgba(220,38,38,0.3)"/>
    </filter>
  </defs>
  
  <!-- White background circle with subtle gradient -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="url(#bgGrad${size})" filter="url(#borderShadow${size})"/>
  
  <!-- Your actual logo, scaled and centered -->
  <g transform="translate(${padding}, ${padding}) scale(${logoSize/800})" filter="url(#logoShadow${size})">
    ${logoSVGContent}
  </g>
  
  <!-- Subtle border -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="#e5e7eb" stroke-width="1" opacity="0.5"/>
</svg>`;
};

// Function to create maskable icon (for Android adaptive icons)
const createMaskableIcon = (size, logoSVGContent) => {
  const padding = size * 0.2; // 20% padding for maskable icons (safe zone)
  const logoSize = size - (padding * 2);
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="maskBg${size}" cx="50%" cy="30%" r="80%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Solid background (required for maskable) -->
  <rect width="${size}" height="${size}" fill="url(#maskBg${size})"/>
  
  <!-- White version of your logo -->
  <g transform="translate(${padding}, ${padding}) scale(${logoSize/800})" fill="white">
    ${logoSVGContent.replace(/fill="[^"]*"/g, 'fill="white"')}
  </g>
</svg>`;
};

// Main function to generate all icons
function generateIconsFromSVG() {
  console.log('🎨 Run Alcester PWA Icon Generator');
  console.log('📁 Looking for your SVG logo...\n');
  
  // Check for common logo file locations
  const possiblePaths = [
    './logo.svg',
    './runalcester-logo.svg', 
    './public/logo.svg',
    './src/assets/logo.svg',
    './assets/logo.svg'
  ];
  
  let logoPath = null;
  let logoSVGContent = null;
  
  // Try to find the logo file
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      logoPath = testPath;
      break;
    }
  }
  
  if (logoPath) {
    console.log(`✅ Found logo at: ${logoPath}`);
    logoSVGContent = fs.readFileSync(logoPath, 'utf8');
    
    // Extract the SVG content (remove XML declaration and outer svg tags)
    const svgMatch = logoSVGContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    if (svgMatch) {
      logoSVGContent = svgMatch[1];
    }
  } else {
    console.log('❌ Logo file not found. Please:');
    console.log('1. Save your SVG logo as "logo.svg" in the project root, OR');
    console.log('2. Update the logoSVGContent variable below with your SVG content\n');
    
    // Fallback: Use placeholder content
    logoSVGContent = `
      <!-- Placeholder - Replace with your actual logo SVG content -->
      <text x="400" y="250" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="120" font-weight="bold">RA</text>
      <text x="400" y="350" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="60">LOGO</text>
      <text x="400" y="420" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="60">HERE</text>
    `;
  }
  
  // Generate regular PWA icons
  sizes.forEach(size => {
    const svgContent = createPWAIcon(size, logoSVGContent);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created icon-${size}x${size}.svg`);
  });
  
  // Generate maskable icons for Android
  [192, 512].forEach(size => {
    const svgContent = createMaskableIcon(size, logoSVGContent);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}-maskable.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created icon-${size}x${size}-maskable.svg (Android adaptive)`);
  });
  
  // Create favicon
  const faviconSVG = createPWAIcon(32, logoSVGContent);
  const faviconPath = path.join(__dirname, 'public', 'favicon.svg');
  fs.writeFileSync(faviconPath, faviconSVG);
  console.log('✅ Created favicon.svg');
  
  // Create apple-touch-icon
  const appleTouchIcon = createPWAIcon(180, logoSVGContent);
  const appleTouchPath = path.join(__dirname, 'public', 'apple-touch-icon.svg');
  fs.writeFileSync(appleTouchPath, appleTouchIcon);
  console.log('✅ Created apple-touch-icon.svg');
  
  console.log('\n🎉 Icon generation complete!');
  console.log('\n📝 Next steps:');
  
  if (logoPath) {
    console.log('✅ Your actual Run Alcester logo is embedded in the icons!');
  } else {
    console.log('⚠️  Please replace the placeholder with your actual logo SVG content');
  }
  
  console.log('\n🔄 Convert to PNG (choose one method):');
  console.log('Method 1 - Online: https://cloudconvert.com/svg-to-png');
  console.log('Method 2 - ImageMagick: ./convert-icons.sh');
  console.log('Method 3 - Ask me to help create PNGs directly');
  
  // Create batch conversion script
  const conversionScript = `#!/bin/bash
echo "🔄 Converting Run Alcester PWA icons to PNG..."

cd public/icons/

# Convert regular icons
for size in 72 96 128 144 152 192 384 512; do
  if command -v magick &> /dev/null; then
    magick icon-\${size}x\${size}.svg icon-\${size}x\${size}.png
  elif command -v convert &> /dev/null; then
    convert icon-\${size}x\${size}.svg icon-\${size}x\${size}.png
  else
    echo "❌ ImageMagick not found. Please install it:"
    echo "   Mac: brew install imagemagick"
    echo "   Ubuntu: sudo apt install imagemagick"
    echo "   Or use online converter: https://cloudconvert.com/svg-to-png"
    exit 1
  fi
  echo "✅ Converted icon-\${size}x\${size}.png"
done

# Convert maskable icons
for size in 192 512; do
  if command -v magick &> /dev/null; then
    magick icon-\${size}x\${size}-maskable.svg icon-\${size}x\${size}-maskable.png
  elif command -v convert &> /dev/null; then
    convert icon-\${size}x\${size}-maskable.svg icon-\${size}x\${size}-maskable.png
  fi
  echo "✅ Converted icon-\${size}x\${size}-maskable.png"
done

cd ../
# Convert additional icons
if command -v magick &> /dev/null; then
  magick favicon.svg favicon.png
  magick apple-touch-icon.svg apple-touch-icon.png
elif command -v convert &> /dev/null; then
  convert favicon.svg favicon.png  
  convert apple-touch-icon.svg apple-touch-icon.png
fi

echo "🎉 All Run Alcester PWA icons converted!"
echo "📱 Your app icons now feature the official club branding"
`;
  
  const scriptPath = path.join(__dirname, 'convert-icons.sh');
  fs.writeFileSync(scriptPath, conversionScript);
  fs.chmodSync(scriptPath, '755'); // Make executable
  console.log('📜 Created convert-icons.sh script');
}

// Run the generator
generateIconsFromSVG();