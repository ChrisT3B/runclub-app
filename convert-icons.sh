#!/bin/bash
echo "🔄 Converting Run Alcester PWA icons to PNG..."

cd public/icons/

# Convert regular icons
for size in 72 96 128 144 152 192 384 512; do
  if command -v magick &> /dev/null; then
    magick icon-${size}x${size}.svg icon-${size}x${size}.png
  elif command -v convert &> /dev/null; then
    convert icon-${size}x${size}.svg icon-${size}x${size}.png
  else
    echo "❌ ImageMagick not found. Please install it:"
    echo "   Mac: brew install imagemagick"
    echo "   Ubuntu: sudo apt install imagemagick"
    echo "   Or use online converter: https://cloudconvert.com/svg-to-png"
    exit 1
  fi
  echo "✅ Converted icon-${size}x${size}.png"
done

# Convert maskable icons
for size in 192 512; do
  if command -v magick &> /dev/null; then
    magick icon-${size}x${size}-maskable.svg icon-${size}x${size}-maskable.png
  elif command -v convert &> /dev/null; then
    convert icon-${size}x${size}-maskable.svg icon-${size}x${size}-maskable.png
  fi
  echo "✅ Converted icon-${size}x${size}-maskable.png"
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
