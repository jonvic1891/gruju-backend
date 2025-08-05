#!/usr/bin/env node

/**
 * Comprehensive Demo Account Testing Script
 * 
 * This script tests all demo accounts to ensure they:
 * 1. Can log in successfully
 * 2. Have correct user data
 * 3. Can access their children
 * 4. Can verify authentication tokens
 * 
 * Run: node test-demo-accounts-comprehensive.js
 * Use --verbose for detailed output
 * Use --quick for login-only testing
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';
const DEMO_PASSWORD = 'demo123';
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Official Demo Accounts (must match frontend and backend)
const DEMO_ACCOUNTS = [
    {
        type: 'Admin Family',
        email: 'admin@parentactivityapp.com',
        expectedRole: 'super_admin',
        expectedUsername: 'admin',
        expectedFamilyName: 'Admin Family',
        expectedChildren: ['Emma Johnson'] // Admin has Emma for testing
    },
    {
        type: 'Johnson Family',
        email: 'johnson@example.com',
        expectedRole: 'user',
        expectedUsername: 'johnson',
        expectedFamilyName: 'Johnson Family',
        expectedChildren: ['Emma Johnson', 'Alex Johnson']
    },
    {
        type: 'Davis Family',
        email: 'davis@example.com',
        expectedRole: 'user',
        expectedUsername: 'davis',
        expectedFamilyName: 'Davis Family',
        expectedChildren: ['Jake Davis', 'Mia Davis']
    },
    {
        type: 'Wong Family',
        email: 'wong@example.com',
        expectedRole: 'user',
        expectedUsername: 'wong',
        expectedFamilyName: 'Wong Family',
        expectedChildren: ['Mia Wong', 'Ryan Wong', 'Zoe Wong']
    },
    {
        type: 'Thompson Family',
        email: 'thompson@example.com',
        expectedRole: 'user',
        expectedUsername: 'thompson',
        expectedFamilyName: 'Thompson Family',
        expectedChildren: ['Sophie Thompson', 'Oliver Thompson']
    },
    {
        type: 'Miller Family',
        email: 'joe@example.com',
        expectedRole: 'user',
        expectedUsername: 'miller',
        expectedFamilyName: 'Miller Family',
        expectedChildren: ['Theodore Miller']
    }
];

// Command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const quickTest = args.includes('--quick');

class DemoAccountTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            timestamp: new Date().toISOString(),
            details: []
        };
    }

    log(message, force = false) {
        if (verbose || force) {
            console.log(message);
        }
    }

    async testLogin(account) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email: account.email,
                password: DEMO_PASSWORD
            }, { timeout: TEST_TIMEOUT });

            if (response.data.success && response.data.token) {
                return {
                    success: true,
                    token: response.data.token,
                    user: response.data.user
                };
            } else {
                return {
                    success: false,
                    error: response.data.error || 'Login failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    async testTokenVerification(token) {
        try {
            const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: TEST_TIMEOUT
            });

            return {
                success: response.data.success,
                user: response.data.data,
                error: response.data.error
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    async testChildren(token) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/children`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: TEST_TIMEOUT
            });

            return {
                success: response.data.success,
                children: response.data.data || [],
                error: response.data.error
            };
        } catch (error) {
            return {
                success: false,
                children: [],
                error: error.response?.data?.error || error.message
            };
        }
    }

    validateUserData(actual, expected) {
        const issues = [];
        
        if (actual.email !== expected.email) {
            issues.push(`Email mismatch: expected ${expected.email}, got ${actual.email}`);
        }
        
        if (actual.role !== expected.expectedRole) {
            issues.push(`Role mismatch: expected ${expected.expectedRole}, got ${actual.role}`);
        }
        
        if (actual.username !== expected.expectedUsername) {
            issues.push(`Username mismatch: expected ${expected.expectedUsername}, got ${actual.username}`);
        }
        
        return issues;
    }

    validateChildren(actualChildren, expectedChildren) {
        const actualNames = actualChildren.map(child => child.name).sort();
        const expectedNames = expectedChildren.sort();
        
        if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
            return [`Children mismatch: expected [${expectedNames.join(', ')}], got [${actualNames.join(', ')}]`];
        }
        
        return [];
    }

    async testAccount(account) {
        const testResult = {
            account: account.type,
            email: account.email,
            tests: {
                login: { passed: false, details: '' },
                tokenVerification: { passed: false, details: '' },
                children: { passed: false, details: '' },
                userData: { passed: false, details: '' }
            },
            overall: false
        };

        this.log(`\n🔍 Testing ${account.type} (${account.email})...`);

        // Test 1: Login
        this.log(`  1️⃣ Testing login...`);
        const loginResult = await this.testLogin(account);
        
        if (loginResult.success) {
            testResult.tests.login.passed = true;
            testResult.tests.login.details = '✅ Login successful';
            this.log(`     ✅ Login successful`);
            
            // Test 2: User Data Validation
            this.log(`  2️⃣ Validating user data...`);
            const userIssues = this.validateUserData(loginResult.user, account);
            if (userIssues.length === 0) {
                testResult.tests.userData.passed = true;
                testResult.tests.userData.details = '✅ User data correct';
                this.log(`     ✅ User data correct`);
            } else {
                testResult.tests.userData.details = `❌ ${userIssues.join(', ')}`;
                this.log(`     ❌ ${userIssues.join(', ')}`);
            }

            if (!quickTest) {
                // Test 3: Token Verification
                this.log(`  3️⃣ Testing token verification...`);
                const tokenResult = await this.testTokenVerification(loginResult.token);
                
                if (tokenResult.success) {
                    testResult.tests.tokenVerification.passed = true;
                    testResult.tests.tokenVerification.details = '✅ Token verification successful';
                    this.log(`     ✅ Token verification successful`);
                } else {
                    testResult.tests.tokenVerification.details = `❌ ${tokenResult.error}`;
                    this.log(`     ❌ Token verification failed: ${tokenResult.error}`);
                }

                // Test 4: Children Access
                this.log(`  4️⃣ Testing children access...`);
                const childrenResult = await this.testChildren(loginResult.token);
                
                if (childrenResult.success) {
                    const childrenIssues = this.validateChildren(childrenResult.children, account.expectedChildren);
                    if (childrenIssues.length === 0) {
                        testResult.tests.children.passed = true;
                        testResult.tests.children.details = `✅ Children correct: ${childrenResult.children.map(c => c.name).join(', ')}`;
                        this.log(`     ✅ Children correct: ${childrenResult.children.map(c => c.name).join(', ')}`);
                    } else {
                        testResult.tests.children.details = `❌ ${childrenIssues.join(', ')}`;
                        this.log(`     ❌ ${childrenIssues.join(', ')}`);
                    }
                } else {
                    testResult.tests.children.details = `❌ ${childrenResult.error}`;
                    this.log(`     ❌ Children access failed: ${childrenResult.error}`);
                }
            } else {
                // Quick test - mark other tests as skipped
                testResult.tests.tokenVerification.passed = true;
                testResult.tests.tokenVerification.details = '⏭️ Skipped (quick test)';
                testResult.tests.children.passed = true;
                testResult.tests.children.details = '⏭️ Skipped (quick test)';
            }
            
        } else {
            testResult.tests.login.details = `❌ ${loginResult.error}`;
            this.log(`     ❌ Login failed: ${loginResult.error}`);
        }

        // Determine overall success
        testResult.overall = Object.values(testResult.tests).every(test => test.passed);
        
        if (testResult.overall) {
            this.results.passed++;
            this.log(`  ✅ ${account.type} - ALL TESTS PASSED`, true);
        } else {
            this.results.failed++;
            this.results.errors.push(`${account.type}: ${Object.values(testResult.tests).filter(t => !t.passed).map(t => t.details).join(', ')}`);
            this.log(`  ❌ ${account.type} - SOME TESTS FAILED`, true);
        }

        this.results.details.push(testResult);
        return testResult;
    }

    async runAllTests() {
        console.log('🎯 Demo Account Comprehensive Testing');
        console.log('=====================================');
        console.log(`📅 Timestamp: ${this.results.timestamp}`);
        console.log(`🔗 API Base URL: ${API_BASE_URL}`);
        console.log(`🔍 Test Mode: ${quickTest ? 'Quick (login only)' : 'Full (login + verification + children)'}`);
        console.log(`📊 Testing ${DEMO_ACCOUNTS.length} demo accounts...\n`);

        for (const account of DEMO_ACCOUNTS) {
            await this.testAccount(account);
        }

        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📋 DEMO ACCOUNT TEST RESULTS');
        console.log('='.repeat(50));
        
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Passed: ${this.results.passed}/${DEMO_ACCOUNTS.length}`);
        console.log(`   ❌ Failed: ${this.results.failed}/${DEMO_ACCOUNTS.length}`);
        console.log(`   📈 Success Rate: ${Math.round((this.results.passed / DEMO_ACCOUNTS.length) * 100)}%`);

        if (this.results.failed > 0) {
            console.log(`\n❌ Failed Accounts:`);
            this.results.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        }

        // Save detailed results to file
        const reportFile = `demo-account-test-results-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Detailed results saved to: ${reportFile}`);

        if (this.results.passed === DEMO_ACCOUNTS.length) {
            console.log('\n🎉 ALL DEMO ACCOUNTS ARE WORKING PERFECTLY!');
            process.exit(0);
        } else {
            console.log('\n⚠️  SOME DEMO ACCOUNTS NEED ATTENTION!');
            process.exit(1);
        }
    }
}

// Help message
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Demo Account Testing Script

Usage:
  node test-demo-accounts-comprehensive.js [options]

Options:
  --verbose    Show detailed test output
  --quick      Run login tests only (faster)
  --help       Show this help message

Examples:
  node test-demo-accounts-comprehensive.js
  node test-demo-accounts-comprehensive.js --verbose
  node test-demo-accounts-comprehensive.js --quick --verbose
`);
    process.exit(0);
}

// Run the tests
const tester = new DemoAccountTester();
tester.runAllTests().catch(error => {
    console.error('💥 Testing script failed:', error);
    process.exit(1);
});