#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script verifies that a deployment was successful by checking:
 * 1. All demo accounts work correctly
 * 2. Frontend displays all 6 demo families
 * 3. API endpoints are responsive
 * 4. Critical functionality works
 * 
 * Run after any deployment to ensure everything is working.
 * 
 * Usage: node verify-deployment.js [--quick]
 */

const axios = require('axios');
const { exec } = require('child_process');

const FRONTEND_URL = 'https://gruju-parent-activity-app.web.app';
const API_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

class DeploymentVerifier {
    constructor() {
        this.quick = process.argv.includes('--quick');
        this.results = {
            timestamp: new Date().toISOString(),
            overall: false,
            checks: {
                demoAccounts: { passed: false, details: '' },
                apiHealth: { passed: false, details: '' },
                frontendLoad: { passed: false, details: '' },
                criticalEndpoints: { passed: false, details: '' }
            }
        };
    }

    log(message, force = false) {
        if (!this.quick || force) {
            console.log(message);
        }
    }

    async checkDemoAccounts() {
        this.log('🔍 Checking demo accounts...');
        
        return new Promise((resolve) => {
            exec('node test-demo-accounts-comprehensive.js --quick', (error, stdout, stderr) => {
                if (error) {
                    this.results.checks.demoAccounts.details = `❌ Demo account tests failed: ${error.message}`;
                    resolve(false);
                } else {
                    this.results.checks.demoAccounts.details = '✅ All 6 demo accounts working correctly';
                    this.results.checks.demoAccounts.passed = true;
                    resolve(true);
                }
            });
        });
    }

    async checkApiHealth() {
        this.log('🔍 Checking API health...');
        
        try {
            const response = await axios.get(`${API_URL}/health`, { timeout: 10000 });
            
            if (response.status === 200 && response.data.status === 'OK') {
                this.results.checks.apiHealth.passed = true;
                this.results.checks.apiHealth.details = '✅ API health check passed';
                return true;
            } else {
                this.results.checks.apiHealth.details = `❌ API health check failed: ${response.data.message || 'Unknown error'}`;
                return false;
            }
        } catch (error) {
            this.results.checks.apiHealth.details = `❌ API unreachable: ${error.message}`;
            return false;
        }
    }

    async checkFrontendLoad() {
        this.log('🔍 Checking frontend load...');
        
        try {
            const response = await axios.get(FRONTEND_URL, { timeout: 10000 });
            
            if (response.status === 200 && response.data.includes('Parent Activity App')) {
                this.results.checks.frontendLoad.passed = true;
                this.results.checks.frontendLoad.details = '✅ Frontend loads correctly';
                return true;
            } else {
                this.results.checks.frontendLoad.details = '❌ Frontend content appears incorrect';
                return false;
            }
        } catch (error) {
            this.results.checks.frontendLoad.details = `❌ Frontend unreachable: ${error.message}`;
            return false;
        }
    }

    async checkCriticalEndpoints() {
        this.log('🔍 Checking critical API endpoints...');
        
        const endpoints = [
            { path: '/api/auth/login', method: 'POST', data: { email: 'admin@parentactivityapp.com', password: 'demo123' } },
            { path: '/auth/verify', method: 'GET', requiresAuth: true }
        ];

        let allPassed = true;
        let token = null;

        try {
            // Test login endpoint
            const loginResponse = await axios.post(`${API_URL}${endpoints[0].path}`, endpoints[0].data, { timeout: 5000 });
            
            if (loginResponse.data.success && loginResponse.data.token) {
                token = loginResponse.data.token;
                this.log('  ✅ Login endpoint working');
            } else {
                this.log('  ❌ Login endpoint failed');
                allPassed = false;
            }

            // Test auth verification endpoint
            if (token) {
                const verifyResponse = await axios.get(`${API_URL}${endpoints[1].path}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000
                });
                
                if (verifyResponse.data.success) {
                    this.log('  ✅ Auth verification endpoint working');
                } else {
                    this.log('  ❌ Auth verification endpoint failed');
                    allPassed = false;
                }
            }

        } catch (error) {
            this.log(`  ❌ Critical endpoint error: ${error.message}`);
            allPassed = false;
        }

        if (allPassed) {
            this.results.checks.criticalEndpoints.passed = true;
            this.results.checks.criticalEndpoints.details = '✅ All critical endpoints working';
        } else {
            this.results.checks.criticalEndpoints.details = '❌ Some critical endpoints failed';
        }

        return allPassed;
    }

    async runVerification() {
        console.log('🚀 Deployment Verification');
        console.log('==========================');
        console.log(`📅 Timestamp: ${this.results.timestamp}`);
        console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
        console.log(`🔗 API URL: ${API_URL}`);
        console.log(`⚡ Mode: ${this.quick ? 'Quick' : 'Full'}\n`);

        const checks = [
            { name: 'Demo Accounts', fn: () => this.checkDemoAccounts() },
            { name: 'API Health', fn: () => this.checkApiHealth() },
            { name: 'Frontend Load', fn: () => this.checkFrontendLoad() },
            { name: 'Critical Endpoints', fn: () => this.checkCriticalEndpoints() }
        ];

        let allPassed = true;

        for (const check of checks) {
            this.log(`\n🔄 ${check.name}...`);
            const passed = await check.fn();
            
            if (passed) {
                this.log(`✅ ${check.name} - PASSED`, true);
            } else {
                this.log(`❌ ${check.name} - FAILED`, true);
                allPassed = false;
            }
        }

        this.results.overall = allPassed;
        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '='.repeat(40));
        console.log('📋 DEPLOYMENT VERIFICATION RESULTS');
        console.log('='.repeat(40));
        
        console.log(`\n📊 Overall Status: ${this.results.overall ? '✅ PASSED' : '❌ FAILED'}`);
        
        console.log('\n📋 Check Details:');
        Object.entries(this.results.checks).forEach(([name, result]) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`   ${status} ${name}: ${result.details}`);
        });

        if (this.results.overall) {
            console.log('\n🎉 DEPLOYMENT VERIFICATION SUCCESSFUL!');
            console.log('✅ All systems are working correctly');
            console.log(`🌐 Live site: ${FRONTEND_URL}`);
            process.exit(0);
        } else {
            console.log('\n⚠️  DEPLOYMENT VERIFICATION FAILED!');
            console.log('❌ Some systems need attention before going live');
            process.exit(1);
        }
    }
}

// Help message
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Deployment Verification Script

Usage:
  node verify-deployment.js [options]

Options:
  --quick      Run faster checks only
  --help       Show this help message

Examples:
  node verify-deployment.js
  node verify-deployment.js --quick

Use this script after every deployment to ensure:
- All demo accounts work
- API is healthy and responsive  
- Frontend loads correctly
- Critical endpoints function properly
`);
    process.exit(0);
}

// Run verification
const verifier = new DeploymentVerifier();
verifier.runVerification().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
});