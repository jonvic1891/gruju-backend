#!/usr/bin/env node

const fs = require('fs');

// Read the backend file
const backendCode = fs.readFileSync('/home/jonathan/Claud-Clubs2/postgres-backend.js', 'utf8');

console.log('🔍 SECURITY AUDIT: Scanning for Sequential ID Vulnerabilities');
console.log('='.repeat(80));

// Patterns that indicate sequential ID usage instead of UUIDs
const vulnerabilityPatterns = [
    { pattern: /parseInt\(req\.params\.\w+\)/, description: 'Using parseInt on request parameters (expects sequential ID)' },
    { pattern: /isNaN\(.*req\.params\.\w+\)/, description: 'Using isNaN check on parameters (expects numeric ID)' },
    { pattern: /WHERE \w+\.id = \$\d+ AND/, description: 'Direct sequential ID lookup in WHERE clause' },
    { pattern: /INSERT INTO \w+ \([^)]*\) VALUES \([^)]*\) RETURNING \*/, description: 'RETURNING * exposes all fields including sequential IDs' }
];

const lines = backendCode.split('\n');

let vulnerabilityCount = 0;
let endpointVulnerabilities = {};

vulnerabilityPatterns.forEach(({ pattern, description }) => {
    console.log(`\n📋 Checking: ${description}`);
    console.log('-'.repeat(60));
    
    lines.forEach((line, index) => {
        if (pattern.test(line)) {
            vulnerabilityCount++;
            const lineNumber = index + 1;
            
            // Find the nearest endpoint definition
            let endpoint = 'Unknown endpoint';
            for (let i = index; i >= 0; i--) {
                const appMethodMatch = lines[i].match(/app\.(get|post|put|delete)\('([^']+)'/);
                if (appMethodMatch) {
                    endpoint = `${appMethodMatch[1].toUpperCase()} ${appMethodMatch[2]}`;
                    break;
                }
            }
            
            if (!endpointVulnerabilities[endpoint]) {
                endpointVulnerabilities[endpoint] = [];
            }
            endpointVulnerabilities[endpoint].push({
                lineNumber,
                issue: description,
                code: line.trim()
            });
            
            console.log(`❌ Line ${lineNumber}: ${line.trim()}`);
            console.log(`   Endpoint: ${endpoint}`);
        }
    });
});

console.log('\n' + '='.repeat(80));
console.log('📊 VULNERABILITY SUMMARY');
console.log('='.repeat(80));

if (vulnerabilityCount === 0) {
    console.log('✅ No sequential ID vulnerabilities found!');
} else {
    console.log(`❌ Found ${vulnerabilityCount} potential security vulnerabilities`);
    console.log('\n🎯 ENDPOINTS REQUIRING FIXES:');
    
    Object.entries(endpointVulnerabilities).forEach(([endpoint, issues]) => {
        console.log(`\n🔴 ${endpoint}`);
        issues.forEach(issue => {
            console.log(`   - Line ${issue.lineNumber}: ${issue.issue}`);
            console.log(`     Code: ${issue.code}`);
        });
    });
    
    console.log('\n⚠️  IMMEDIATE ACTION REQUIRED:');
    console.log('   1. Update all endpoints to use UUIDs instead of sequential IDs');
    console.log('   2. Remove parseInt() and isNaN() checks on UUID parameters');
    console.log('   3. Use specific RETURNING clauses to avoid exposing sequential IDs');
    console.log('   4. Add UUID format validation instead of numeric validation');
}

console.log('\n🛡️  SECURITY BEST PRACTICES:');
console.log('   ✅ Use UUIDs for all public-facing identifiers');
console.log('   ✅ Validate UUID format with regex, not numeric checks');
console.log('   ✅ Only return necessary fields in API responses');
console.log('   ✅ Implement proper authorization checks with UUIDs');