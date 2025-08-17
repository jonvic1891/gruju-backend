#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the build timestamp
const buildTimestamp = Date.now();

// Path to the built index.html
const indexPath = path.join(__dirname, '../build/index.html');

try {
  // Read the built index.html
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Replace the placeholder with actual timestamp
  indexContent = indexContent.replace('BUILD_TIMESTAMP_PLACEHOLDER', buildTimestamp);
  
  // Write back the modified content
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  
  console.log(`✅ Cache busting timestamp applied: ${buildTimestamp}`);
} catch (error) {
  console.error('❌ Error applying cache busting:', error.message);
  process.exit(1);
}