#!/usr/bin/env node

/**
 * Test Structure Validation
 * Validates that all test files are properly structured and can be loaded
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Test Structure...\n');

const testFiles = [
  // Backend tests
  'tests/setup.js',
  'tests/helpers/testHelpers.js',
  'tests/integration/connections/connectionRequests.test.js',
  'tests/unit/connectionValidation.test.js',
  
  // Frontend tests  
  'parent-activity-web/src/components/__tests__/ConnectionsScreen.test.tsx',
  'parent-activity-web/src/services/__tests__/api.test.ts',
  
  // Test runner
  'test-runner.js'
];

let allValid = true;

testFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath}`);
    
    // Try to load the file to check for syntax errors
    try {
      if (filePath.endsWith('.js')) {
        require(fullPath);
      }
    } catch (error) {
      console.log(`   ⚠️  Syntax issue: ${error.message}`);
      allValid = false;
    }
  } else {
    console.log(`❌ ${filePath} - File not found`);
    allValid = false;
  }
});

console.log('\n📊 Test Coverage Areas:');
console.log('   • Backend API Integration Tests');
console.log('   • Frontend Component Tests');
console.log('   • Frontend Service Tests');
console.log('   • Unit Tests & Validation');
console.log('   • Test Helpers & Utilities');

console.log('\n🎯 Test Commands Available:');
console.log('   • npm run test:all - Run comprehensive test suite');
console.log('   • npm run test:connections - Backend connection tests');
console.log('   • npm run test:unit - Backend unit tests');
console.log('   • npm run test:regression - Critical regression tests');
console.log('   • cd parent-activity-web && npm test - Frontend tests');

if (allValid) {
  console.log('\n🎉 All test files are properly structured and ready to run!');
  console.log('💡 Run "npm run test:all" to execute the complete test suite');
} else {
  console.log('\n⚠️  Some test files have issues. Please review the errors above.');
}

process.exit(allValid ? 0 : 1);