#!/usr/bin/env node

const fs = require('fs');

// Read the backend file
const backendCode = fs.readFileSync('/home/jonathan/Claud-Clubs2/postgres-backend.js', 'utf8');

console.log('🔍 PII EXPOSURE AUDIT: Scanning for Personal Information Leaks');
console.log('='.repeat(80));

// Patterns that indicate PII exposure
const piiPatterns = [
    { pattern: /\.email\s+as\s+\w*email/gi, description: 'Email field exposure in SELECT statements' },
    { pattern: /\.phone\s+as\s+\w*phone/gi, description: 'Phone field exposure in SELECT statements' },
    { pattern: /SELECT.*\*.*FROM.*users/gi, description: 'SELECT * from users table (exposes all PII)' },
    { pattern: /u\.email(?!\s+ILIKE)/gi, description: 'User email field selection (not for search)' },
    { pattern: /u\.phone(?!\s+ILIKE)/gi, description: 'User phone field selection (not for search)' },
    { pattern: /\.address/gi, description: 'Address field exposure' },
    { pattern: /\.ssn/gi, description: 'SSN field exposure' },
    { pattern: /password(?!.*hash)/gi, description: 'Password field exposure (should only be password_hash)' }
];

const lines = backendCode.split('\n');

let piiViolationCount = 0;
let endpointViolations = {};

piiPatterns.forEach(({ pattern, description }) => {
    console.log(`\n📋 Checking: ${description}`);
    console.log('-'.repeat(60));
    
    lines.forEach((line, index) => {
        if (pattern.test(line)) {
            // Skip comments and safe patterns
            if (line.trim().startsWith('//') || 
                line.includes('password_hash') ||
                line.includes('ILIKE') ||
                line.includes('WHERE') && (line.includes('email') || line.includes('phone'))) {
                return;
            }
            
            piiViolationCount++;
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
            
            if (!endpointViolations[endpoint]) {
                endpointViolations[endpoint] = [];
            }
            endpointViolations[endpoint].push({
                lineNumber,
                issue: description,
                code: line.trim()
            });
            
            console.log(`❌ Line ${lineNumber}: ${line.trim()}`);
            console.log(`   Endpoint: ${endpoint}`);
        }
    });
});

// Additional checks for specific privacy concerns
console.log('\n📋 Checking: Hardcoded demo emails in responses');
console.log('-'.repeat(60));

const demoEmailPattern = /@example\.com/gi;
lines.forEach((line, index) => {
    if (demoEmailPattern.test(line) && !line.trim().startsWith('//') && !line.includes('INSERT')) {
        const lineNumber = index + 1;
        console.log(`⚠️  Line ${lineNumber}: Potential demo email exposure: ${line.trim()}`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('📊 PII VIOLATION SUMMARY');
console.log('='.repeat(80));

if (piiViolationCount === 0) {
    console.log('✅ No PII exposure violations found!');
} else {
    console.log(`❌ Found ${piiViolationCount} potential PII exposure violations`);
    console.log('\n🎯 ENDPOINTS REQUIRING PRIVACY FIXES:');
    
    Object.entries(endpointViolations).forEach(([endpoint, issues]) => {
        console.log(`\n🔴 ${endpoint}`);
        issues.forEach(issue => {
            console.log(`   - Line ${issue.lineNumber}: ${issue.issue}`);
            console.log(`     Code: ${issue.code}`);
        });
    });
    
    console.log('\n⚠️  IMMEDIATE PRIVACY ACTION REQUIRED:');
    console.log('   1. Remove email/phone fields from API responses unless absolutely necessary');
    console.log('   2. Replace SELECT * with specific field selections');
    console.log('   3. Only expose PII to the data owner (user themselves)');
    console.log('   4. Implement data minimization principle');
}

console.log('\n🛡️  PRIVACY BEST PRACTICES:');
console.log('   ✅ Only return PII to the data owner');
console.log('   ✅ Use data minimization - only necessary fields');
console.log('   ✅ No email/phone in search results for other users');
console.log('   ✅ No PII in connection/activity participant lists');
console.log('   ✅ Hash or anonymize sensitive data when possible');

// Check for potential GDPR violations
console.log('\n🇪🇺 GDPR COMPLIANCE CHECK:');
console.log('   📋 Right to privacy: PII should not be exposed to other users');
console.log('   📋 Data minimization: Only collect/expose necessary data');
console.log('   📋 Purpose limitation: PII should only be used for intended purpose');

const remainingIssues = Object.keys(endpointViolations).length;
if (remainingIssues === 0) {
    console.log('   ✅ No obvious GDPR violations detected');
} else {
    console.log(`   ❌ ${remainingIssues} endpoints may violate GDPR privacy principles`);
}