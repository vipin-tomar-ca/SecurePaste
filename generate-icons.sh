#!/bin/bash

# Icon generation script for GuardPasteAI
echo "🎨 Generating PNG icons from SVG files..."

# Check if we have the required tools
if command -v rsvg-convert &> /dev/null; then
    echo "✅ Using rsvg-convert for high-quality icon conversion"
    
    # Create icons directory if it doesn't exist
    mkdir -p icons
    
    # Generate PNG icons from SVG
    rsvg-convert -w 16 -h 16 icons/icon16.svg -o icons/icon16.png
    rsvg-convert -w 48 -h 48 icons/icon48.svg -o icons/icon48.png
    rsvg-convert -w 128 -h 128 icons/icon128.svg -o icons/icon128.png
    
    echo "✅ PNG icons generated successfully!"
    
elif command -v convert &> /dev/null; then
    echo "✅ Using ImageMagick for icon conversion"
    
    # Create icons directory if it doesn't exist
    mkdir -p icons
    
    # Generate PNG icons from SVG
    convert icons/icon16.svg -resize 16x16 icons/icon16.png
    convert icons/icon48.svg -resize 48x48 icons/icon48.png
    convert icons/icon128.svg -resize 128x128 icons/icon128.png
    
    echo "✅ PNG icons generated successfully!"
    
else
    echo "⚠️  No icon conversion tools found"
    echo "📦 Installing rsvg-convert (recommended)..."
    
    # Try to install rsvg-convert
    if command -v brew &> /dev/null; then
        echo "🍺 Installing via Homebrew..."
        brew install librsvg
    elif command -v apt-get &> /dev/null; then
        echo "📦 Installing via apt-get..."
        sudo apt-get update && sudo apt-get install -y librsvg2-bin
    elif command -v yum &> /dev/null; then
        echo "📦 Installing via yum..."
        sudo yum install -y librsvg2-tools
    else
        echo "❌ Could not install icon conversion tools automatically"
        echo "💡 Please install one of the following:"
        echo "   - librsvg2-bin (Ubuntu/Debian): sudo apt-get install librsvg2-bin"
        echo "   - librsvg (macOS): brew install librsvg"
        echo "   - ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Ubuntu)"
        echo ""
        echo "🔄 Using SVG icons only for now..."
    fi
fi

# Show generated icons
echo ""
echo "📁 Icons in directory:"
ls -la icons/
echo ""
echo "✅ Icon generation complete!" 