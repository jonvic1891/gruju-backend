#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read version from version.json
const versionPath = path.join(__dirname, '../src/version.json');
const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
const appVersion = versionData.version;

// Random cache buster for JS/CSS files (still useful for browser cache)
const additionalBuster = Math.random().toString(36).substr(2, 15);

// Path to the built index.html
const indexPath = path.join(__dirname, '../build/index.html');

try {
  // Read the built index.html
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Replace the placeholder with actual version
  indexContent = indexContent.replace('APP_VERSION_PLACEHOLDER', appVersion);
  
  // Also add version and cache buster to all script and link tags
  indexContent = indexContent.replace(
    /(src|href)="([^"]*\.(js|css))"/g,
    `$1="$2?v=${appVersion}&cb=${additionalBuster}"`
  );
  
  // Write back the modified content
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  
  console.log(`✅ Cache busting applied for version: ${appVersion}`);
  console.log(`✅ Added version parameter to all JS/CSS files`);
  console.log(`🔥 To clear browser cache completely:`);
  console.log(`   1. Open DevTools (F12)`);
  console.log(`   2. Right-click refresh button`);
  console.log(`   3. Select "Empty Cache and Hard Reload"`);
  console.log(`   4. Or go to Application tab > Storage > Clear Storage`);
} catch (error) {
  console.error('❌ Error applying cache busting:', error.message);
  process.exit(1);
}