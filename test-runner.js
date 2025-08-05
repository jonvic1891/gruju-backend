#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Runs both backend and frontend tests with detailed reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Comprehensive Test Suite for Connection Requests Feature\n');

const results = {
  backend: { success: false, output: '', error: '' },
  frontend: { success: false, output: '', error: '' },
  startTime: Date.now()
};

/**
 * Run a command and capture its output
 */
function runCommand(command, description, options = {}) {
  console.log(`📋 ${description}...`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000, // 60 second timeout
      ...options
    });
    
    console.log(`✅ ${description} - PASSED\n`);
    return { success: true, output, error: '' };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log(`Error: ${error.message}\n`);
    return { success: false, output: '', error: error.message };
  }
}

/**
 * Install dependencies if needed
 */
function ensureDependencies() {
  console.log('📦 Checking dependencies...\n');
  
  // Check if backend test dependencies exist
  const backendPackageJson = path.join(__dirname, 'package.json');
  const backendNodeModules = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(backendNodeModules)) {
    console.log('Installing backend dependencies...');
    runCommand('npm install', 'Backend dependency installation');
  }
  
  // Check if frontend test dependencies exist
  const frontendDir = path.join(__dirname, 'parent-activity-web');
  const frontendNodeModules = path.join(frontendDir, 'node_modules');
  
  if (!fs.existsSync(frontendNodeModules)) {
    console.log('Installing frontend dependencies...');
    runCommand('npm install', 'Frontend dependency installation', { cwd: frontendDir });
  }
}

/**
 * Run backend tests
 */
function runBackendTests() {
  console.log('🔧 Running Backend API Tests\n');
  console.log('=' .repeat(50));
  
  // Run connection request specific tests
  results.backend = runCommand(
    'npm run test:connections',
    'Backend Connection Request API Tests'
  );
  
  if (results.backend.success) {
    // Run unit tests
    const unitTestResult = runCommand(
      'npm run test:unit',
      'Backend Unit Tests'
    );
    
    results.backend.success = results.backend.success && unitTestResult.success;
    results.backend.output += '\n' + unitTestResult.output;
    results.backend.error += unitTestResult.error;
  }
}

/**
 * Run frontend tests
 */
function runFrontendTests() {
  console.log('⚛️  Running Frontend Component Tests\n');
  console.log('=' .repeat(50));
  
  const frontendDir = path.join(__dirname, 'parent-activity-web');
  
  // Run ConnectionsScreen component tests
  results.frontend = runCommand(
    'npm test -- --testPathPattern=ConnectionsScreen --watchAll=false --coverage=false',
    'Frontend ConnectionsScreen Component Tests',
    { cwd: frontendDir }
  );
  
  if (results.frontend.success) {
    // Run API service tests
    const apiTestResult = runCommand(
      'npm test -- --testPathPattern=api.test --watchAll=false --coverage=false',
      'Frontend API Service Tests',
      { cwd: frontendDir }
    );
    
    results.frontend.success = results.frontend.success && apiTestResult.success;
    results.frontend.output += '\n' + apiTestResult.output;
    results.frontend.error += apiTestResult.error;
  }
}

/**
 * Generate test report
 */
function generateReport() {
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUITE RESULTS');
  console.log('='.repeat(70));
  
  console.log(`⏱️  Total Duration: ${duration}s\n`);
  
  console.log('🔧 Backend Tests:');
  if (results.backend.success) {
    console.log('   ✅ PASSED - All API endpoints and validation working correctly');
  } else {
    console.log('   ❌ FAILED - Issues with backend functionality');
    if (results.backend.error) {
      console.log(`   Error: ${results.backend.error}`);
    }
  }
  
  console.log('\n⚛️  Frontend Tests:');
  if (results.frontend.success) {
    console.log('   ✅ PASSED - All components and UI interactions working correctly');
  } else {
    console.log('   ❌ FAILED - Issues with frontend functionality');
    if (results.frontend.error) {
      console.log(`   Error: ${results.frontend.error}`);
    }
  }
  
  console.log('\n📋 Feature Coverage:');
  console.log('   • Connection request creation with detailed child info');
  console.log('   • Incoming requests display with child details');
  console.log('   • Sent requests tracking and display');
  console.log('   • Parent search functionality');
  console.log('   • Request acceptance/rejection');
  console.log('   • Error handling and validation');
  console.log('   • UI interactions and state management');
  
  const overallSuccess = results.backend.success && results.frontend.success;
  
  console.log('\n' + '='.repeat(70));
  if (overallSuccess) {
    console.log('🎉 OVERALL RESULT: ALL TESTS PASSED');
    console.log('✨ Connection Request feature is working correctly!');
  } else {
    console.log('⚠️  OVERALL RESULT: SOME TESTS FAILED');
    console.log('🔍 Please review the failing tests above');
  }
  console.log('='.repeat(70));
  
  return overallSuccess;
}

/**
 * Main execution
 */
function main() {
  try {
    ensureDependencies();
    runBackendTests();
    runFrontendTests();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test suite runner failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, runBackendTests, runFrontendTests, generateReport };