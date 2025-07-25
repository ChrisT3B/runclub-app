#!/bin/bash
echo "🔄 Converting high-contrast icons to PNG..."

cd public/icons/

# Convert high-contrast icons
for size in 72 192 512; do
  if command -v magick &> /dev/null; then
    magick icon-${size}x${size}-contrast.svg icon-${size}x${size}.png
  elif command -v convert &> /dev/null; then
    convert icon-${size}x${size}-contrast.svg icon-${size}x${size}.png
  else
    echo "❌ ImageMagick not found. Use online converter:"
    echo "   https://cloudconvert.com/svg-to-png"
    echo "   Convert: icon-${size}x${size}-contrast.svg → icon-${size}x${size}.png"
  fi
  echo "✅ Converted icon-${size}x${size}.png (high-contrast)"
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
