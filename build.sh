#!/bin/bash

# Build script for GuardPasteAI Chrome Extension
echo "🔧 Building GuardPasteAI Chrome Extension..."

# Generate unique build number
BUILD_NUMBER=$(date +%s)
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
VERSION="1.0.0"

echo "📅 Build #$BUILD_NUMBER - $BUILD_DATE"

# Create build directory
BUILD_DIR="build"
DIST_DIR="dist"

# Clean previous builds
rm -rf $BUILD_DIR $DIST_DIR
mkdir -p $BUILD_DIR $DIST_DIR

# Copy all necessary files to build directory
echo "📁 Copying extension files..."

# Core extension files
cp manifest.json $BUILD_DIR/
cp background.js $BUILD_DIR/
cp content.js $BUILD_DIR/
cp popup.html $BUILD_DIR/
cp popup.js $BUILD_DIR/
cp popup.css $BUILD_DIR/

# Detection engine files
cp detection-engine.js $BUILD_DIR/
cp patterns.js $BUILD_DIR/
cp data-generator.js $BUILD_DIR/
cp dictionary-compression.js $BUILD_DIR/
cp llm-integration.js $BUILD_DIR/
cp enterprise-deployment.js $BUILD_DIR/
cp enterprise-admin.js $BUILD_DIR/
cp feature-gates.js $BUILD_DIR/

# Warning system files
cp warning.html $BUILD_DIR/
cp warning.css $BUILD_DIR/
cp warning.js $BUILD_DIR/
cp animated-warning.js $BUILD_DIR/
cp animated-warning.css $BUILD_DIR/

# Configuration files
mkdir -p $BUILD_DIR/config
cp config/rules.json $BUILD_DIR/config/

# Icons - Create PNG versions from SVG for better compatibility
echo "🎨 Processing icons..."
mkdir -p $BUILD_DIR/icons

# Check if we have the required tools for icon conversion
if command -v rsvg-convert &> /dev/null; then
    echo "✅ Using rsvg-convert for icon conversion"
    # Convert SVG to PNG with proper sizes
    rsvg-convert -w 16 -h 16 icons/icon16.svg -o $BUILD_DIR/icons/icon16.png
    rsvg-convert -w 48 -h 48 icons/icon48.svg -o $BUILD_DIR/icons/icon48.png
    rsvg-convert -w 128 -h 128 icons/icon128.svg -o $BUILD_DIR/icons/icon128.png
    echo "✅ PNG icons created successfully"
elif command -v convert &> /dev/null; then
    echo "✅ Using ImageMagick for icon conversion"
    # Convert SVG to PNG using ImageMagick
    convert icons/icon16.svg -resize 16x16 $BUILD_DIR/icons/icon16.png
    convert icons/icon48.svg -resize 48x48 $BUILD_DIR/icons/icon48.png
    convert icons/icon128.svg -resize 128x128 $BUILD_DIR/icons/icon128.png
    echo "✅ PNG icons created successfully"
else
    echo "⚠️  No icon conversion tool found, using SVG icons only"
    cp icons/*.svg $BUILD_DIR/icons/
fi

# Copy SVG icons as well for fallback
cp icons/*.svg $BUILD_DIR/icons/

# Copy generated icon if it exists
if [ -f "generated-icon.png" ]; then
    cp generated-icon.png $BUILD_DIR/icons/icon128.png
    echo "✅ Using generated icon"
fi

# Update manifest with build number and proper icon references
echo "📝 Updating manifest with build number..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION.$BUILD_NUMBER\"/" $BUILD_DIR/manifest.json

# Create ZIP file for distribution
echo "📦 Creating distribution package..."
cd $BUILD_DIR
zip -r ../$DIST_DIR/guardpasteai-extension-v$VERSION.$BUILD_NUMBER.zip . -x "*.DS_Store" "*/.*"
cd ..

# Create development package (uncompressed)
echo "📁 Creating development package..."
mkdir -p $DIST_DIR/development
cp -r $BUILD_DIR/* $DIST_DIR/development/

# Generate build info
echo "📋 Generating build information..."
cat > $DIST_DIR/build-info.txt << EOF
GuardPasteAI Chrome Extension Build
===================================

Build Number: $BUILD_NUMBER
Build Date: $BUILD_DATE
Version: $VERSION.$BUILD_NUMBER
Manifest Version: 3

Files Included:
$(find $BUILD_DIR -type f | sort)

Total Files: $(find $BUILD_DIR -type f | wc -l)
Package Size: $(du -sh $DIST_DIR/guardpasteai-extension-v$VERSION.$BUILD_NUMBER.zip | cut -f1)

Icons Available:
$(ls -la $BUILD_DIR/icons/)

Installation:
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked" and select the development folder
4. Or drag the ZIP file to chrome://extensions/ for installation

Target Domains:
- chat.openai.com
- claude.ai
- gemini.google.com
- bard.google.com
- poe.com
- character.ai
- huggingface.co
- replicate.com
- cohere.ai
- anthropic.com

Features:
- Sensitive data detection
- Animated warnings
- Enterprise features
- Custom rules support
- Webhook integration
- Unique build numbers to prevent caching

Build Notes:
- This build includes unique version number to prevent Chrome caching
- Icons are optimized for better visibility
- All security features are enabled
EOF

# Create a simple installation script
cat > $DIST_DIR/install.sh << 'EOF'
#!/bin/bash
echo "🚀 Installing GuardPasteAI Extension..."
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. The extension will be installed and ready to use!"
echo ""
echo "🎯 The extension will now protect you from pasting sensitive data into AI tools!"
EOF

chmod +x $DIST_DIR/install.sh

echo "✅ Build completed successfully!"
echo ""
echo "📦 Distribution files created:"
echo "  - $DIST_DIR/guardpasteai-extension-v$VERSION.$BUILD_NUMBER.zip (for Chrome Web Store)"
echo "  - $DIST_DIR/development/ (for development/loading)"
echo "  - $DIST_DIR/build-info.txt (build information)"
echo "  - $DIST_DIR/install.sh (installation helper)"
echo ""
echo "🎨 Icons processed:"
ls -la $DIST_DIR/development/icons/
echo ""
echo "🚀 To install the extension:"
echo "  1. Open Chrome and go to chrome://extensions/"
echo "  2. Enable 'Developer mode' (toggle in top right)"
echo "  3. Click 'Load unpacked' and select the 'dist/development' folder"
echo "  4. Or run: ./dist/install.sh"
echo ""
echo "🎯 The extension will now protect you from pasting sensitive data into AI tools!"
echo "📈 Build #$BUILD_NUMBER - Version $VERSION.$BUILD_NUMBER" 