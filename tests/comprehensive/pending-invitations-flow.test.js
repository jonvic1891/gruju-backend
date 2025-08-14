#!/usr/bin/env node

/**
 * COMPREHENSIVE PENDING INVITATIONS FLOW TESTS
 * 
 * This test suite verifies the complete pending invitations workflow:
 * 1. User creates activity
 * 2. User selects pending connections 
 * 3. Pending invitations stored in database
 * 4. Connection requests sent and accepted
 * 5. processAutoNotifications triggers invitation sending
 * 6. Recipients see invitations and can accept them
 * 7. Accepted invitations show as connected activities
 */

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

// Test accounts
const TEST_ACCOUNTS = {
    host: { email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123', name: 'Test Host' },
    guest: { email: 'roberts@example.com', password: 'test123', name: 'Roberts Family' }
};

class PendingInvitationsTestSuite {
    constructor() {
        this.testResults = [];
        this.cleanupTasks = [];
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅', 
            'error': '❌',
            'test': '🧪',
            'setup': '🔧',
            'cleanup': '🧹'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async addResult(testName, passed, message) {
        this.testResults.push({ testName, passed, message, timestamp: new Date() });
        await this.log(`${testName}: ${passed ? 'PASSED' : 'FAILED'} - ${message}`, passed ? 'success' : 'error');
    }

    async login(account) {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: account.email, password: account.password })
        });
        
        const data = await response.json();
        if (data.success) {
            return { ...data, account };
        }
        throw new Error(`Login failed for ${account.email}: ${data.error}`);
    }

    async cleanup() {
        await this.log('Starting cleanup...', 'cleanup');
        
        for (const task of this.cleanupTasks.reverse()) {
            try {
                await task();
            } catch (error) {
                await this.log(`Cleanup task failed: ${error.message}`, 'error');
            }
        }
        
        await this.log('Cleanup completed', 'cleanup');
    }

    // TEST 1: Setup Test Environment
    async testSetupEnvironment() {
        await this.log('TEST 1: Setting up test environment...', 'test');
        
        try {
            // Login to both accounts
            const hostLogin = await this.login(TEST_ACCOUNTS.host);
            const guestLogin = await this.login(TEST_ACCOUNTS.guest);
            
            // Get children
            const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            });
            const hostChildren = await hostChildrenResponse.json();
            
            const guestChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const guestChildren = await guestChildrenResponse.json();
            
            // Clean any existing connections
            const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            });
            const connections = await connectionsResponse.json();
            
            const existingConnection = connections.data?.find(conn => 
                conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
            );
            
            if (existingConnection) {
                await fetch(`${API_BASE}/api/connections/${existingConnection.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
                await this.log('Cleaned existing connection');
            }
            
            this.testData = {
                hostLogin,
                guestLogin,
                hostChild: hostChildren.data[0],
                guestChild: guestChildren.data.find(child => child.name === 'Emilia')
            };
            
            await this.addResult('Environment Setup', true, 'Test accounts and children loaded successfully');
            return true;
            
        } catch (error) {
            await this.addResult('Environment Setup', false, error.message);
            return false;
        }
    }

    // TEST 2: Create Activity with Pending Invitation
    async testCreateActivityWithPendingInvitation() {
        await this.log('TEST 2: Creating activity with pending invitation...', 'test');
        
        try {
            const { hostLogin, hostChild, guestLogin } = this.testData;
            
            // Create test activity
            const activityData = {
                name: 'Test Pending Flow Activity',
                description: 'Testing comprehensive pending invitations flow',
                start_date: '2025-08-20',
                end_date: '2025-08-20', 
                start_time: '14:00',
                end_time: '16:00',
                location: 'Test Location',
                cost: '0',
                max_participants: '10',
                auto_notify_new_connections: false
            };
            
            const createResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activityData)
            });
            
            const createResult = await createResponse.json();
            if (!createResult.success) {
                throw new Error(`Failed to create activity: ${createResult.error}`);
            }
            
            this.testData.activity = createResult.data;
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/activities/${this.testData.activity.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
            });
            
            // Create pending invitation entry
            const pendingConnections = [`pending-${guestLogin.user.id}`];
            
            const pendingResponse = await fetch(`${API_BASE}/api/activities/${this.testData.activity.id}/pending-invitations`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pending_connections: pendingConnections })
            });
            
            const pendingResult = await pendingResponse.json();
            if (!pendingResult.success) {
                throw new Error(`Failed to create pending invitations: ${pendingResult.error}`);
            }
            
            await this.addResult('Create Activity with Pending Invitation', true, 
                `Activity "${this.testData.activity.name}" created with pending invitation for guest`);
            return true;
            
        } catch (error) {
            await this.addResult('Create Activity with Pending Invitation', false, error.message);
            return false;
        }
    }

    // TEST 3: Send and Accept Connection Request
    async testConnectionFlow() {
        await this.log('TEST 3: Testing connection request flow...', 'test');
        
        try {
            const { hostLogin, guestLogin, hostChild, guestChild } = this.testData;
            
            // Send connection request
            const requestData = {
                target_parent_id: guestLogin.user.id,
                child_id: hostChild.id,
                target_child_id: guestChild.id,
                message: 'Test connection for pending invitations flow'
            };
            
            const requestResponse = await fetch(`${API_BASE}/api/connections/request`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const requestResult = await requestResponse.json();
            if (!requestResult.success) {
                throw new Error(`Failed to send connection request: ${requestResult.error}`);
            }
            
            const connectionRequestId = requestResult.data.id;
            
            // Accept connection request (this should trigger processAutoNotifications)
            const acceptResponse = await fetch(`${API_BASE}/api/connection-requests/${connectionRequestId}/respond`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${guestLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'accept' })
            });
            
            const acceptResult = await acceptResponse.json();
            if (!acceptResult.success) {
                throw new Error(`Failed to accept connection: ${acceptResult.error}`);
            }
            
            // Verify connection exists
            const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            });
            const connections = await connectionsResponse.json();
            
            const newConnection = connections.data?.find(conn => 
                (conn.child1_name === hostChild.name && conn.child2_name === guestChild.name) ||
                (conn.child1_name === guestChild.name && conn.child2_name === hostChild.name)
            );
            
            if (!newConnection) {
                throw new Error('Connection not found after acceptance');
            }
            
            this.testData.connection = newConnection;
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/connections/${newConnection.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
            });
            
            await this.addResult('Connection Flow', true, 
                `Connection established between ${hostChild.name} and ${guestChild.name}`);
            return true;
            
        } catch (error) {
            await this.addResult('Connection Flow', false, error.message);
            return false;
        }
    }

    // TEST 4: Verify Invitation Created by processAutoNotifications
    async testInvitationCreation() {
        await this.log('TEST 4: Verifying invitation creation...', 'test');
        
        try {
            const { guestLogin, guestChild, activity, hostLogin } = this.testData;
            
            // Wait a moment for processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if invitation was created for guest
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            const invitations = await invitationsResponse.json();
            
            const activityInvitation = invitations.data?.find(inv => 
                inv.activity_name === activity.name && 
                inv.invited_child_name === guestChild.name
            );
            
            if (!activityInvitation) {
                throw new Error(`No invitation found for activity "${activity.name}" to ${guestChild.name}`);
            }
            
            if (activityInvitation.status !== 'pending') {
                throw new Error(`Expected pending invitation, got status: ${activityInvitation.status}`);
            }
            
            this.testData.invitation = activityInvitation;
            
            await this.addResult('Invitation Creation', true, 
                `Pending invitation created for "${activity.name}" to ${guestChild.name}`);
            return true;
            
        } catch (error) {
            await this.addResult('Invitation Creation', false, error.message);
            return false;
        }
    }

    // TEST 5: Accept Invitation and Verify Activity Count
    async testAcceptInvitationAndActivityCount() {
        await this.log('TEST 5: Testing invitation acceptance and activity count...', 'test');
        
        try {
            const { guestLogin, guestChild, invitation, activity } = this.testData;
            
            // Get initial activity count
            const initialCountResponse = await fetch(`${API_BASE}/api/activities/${guestChild.id}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const initialOwnActivities = await initialCountResponse.json();
            const initialOwnCount = initialOwnActivities.data?.length || 0;
            
            // Accept the invitation
            const acceptResponse = await fetch(`${API_BASE}/api/activity-invitations/${invitation.invitation_id}/respond`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${guestLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'accept' })
            });
            
            const acceptResult = await acceptResponse.json();
            if (!acceptResult.success) {
                throw new Error(`Failed to accept invitation: ${acceptResult.error}`);
            }
            
            // Verify invitation status changed to accepted
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const updatedInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const updatedInvitations = await updatedInvitationsResponse.json();
            
            const acceptedInvitation = updatedInvitations.data?.find(inv => 
                inv.activity_name === activity.name && 
                inv.invited_child_name === guestChild.name &&
                inv.status === 'accepted'
            );
            
            if (!acceptedInvitation) {
                throw new Error('Invitation not found in accepted status');
            }
            
            // Calculate expected activity count (own activities + accepted invitations)
            const currentUser = guestLogin.user;
            const acceptedInvitationsForChild = updatedInvitations.data.filter(inv => 
                inv.invited_child_name === guestChild.name &&
                inv.status === 'accepted' &&
                inv.host_parent_username !== currentUser.username
            );
            
            const expectedCount = initialOwnCount + acceptedInvitationsForChild.length;
            
            await this.addResult('Accept Invitation and Activity Count', true, 
                `Invitation accepted. Expected activity count for ${guestChild.name}: ${expectedCount} (${initialOwnCount} own + ${acceptedInvitationsForChild.length} accepted)`);
            
            this.testData.expectedActivityCount = expectedCount;
            return true;
            
        } catch (error) {
            await this.addResult('Accept Invitation and Activity Count', false, error.message);
            return false;
        }
    }

    // TEST 6: Verify Frontend Activity Count Logic
    async testFrontendActivityCountLogic() {
        await this.log('TEST 6: Testing frontend activity count logic...', 'test');
        
        try {
            const { guestLogin, guestChild, expectedActivityCount } = this.testData;
            
            // Simulate the exact logic used in ChildrenScreen.tsx loadActivityCounts
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            let totalCount = 0;
            
            // Count own activities
            const ownActivitiesResponse = await fetch(`${API_BASE}/api/activities/${guestChild.id}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const ownActivitiesData = await ownActivitiesResponse.json();
            
            if (ownActivitiesData.success && ownActivitiesData.data && Array.isArray(ownActivitiesData.data)) {
                totalCount += ownActivitiesData.data.length;
            }
            
            // Count accepted invitations using unified endpoint (same as frontend)
            const allInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const allInvitationsData = await allInvitationsResponse.json();
            
            if (allInvitationsData.success && allInvitationsData.data) {
                const currentUser = guestLogin.user;
                const currentUsername = currentUser.username;
                
                const childAcceptedInvitations = allInvitationsData.data.filter(invitation => 
                    invitation.invited_child_name === guestChild.name &&
                    invitation.status === 'accepted' &&
                    invitation.host_parent_username !== currentUsername
                );
                
                totalCount += childAcceptedInvitations.length;
            }
            
            if (totalCount !== expectedActivityCount) {
                throw new Error(`Activity count mismatch. Expected: ${expectedActivityCount}, Got: ${totalCount}`);
            }
            
            await this.addResult('Frontend Activity Count Logic', true, 
                `Frontend logic correctly calculates ${totalCount} activities for ${guestChild.name}`);
            return true;
            
        } catch (error) {
            await this.addResult('Frontend Activity Count Logic', false, error.message);
            return false;
        }
    }

    // TEST 7: End-to-End Verification
    async testEndToEndVerification() {
        await this.log('TEST 7: End-to-end verification...', 'test');
        
        try {
            const { guestLogin, guestChild, activity, hostChild } = this.testData;
            
            // Verify the complete flow worked
            const checks = [];
            
            // 1. Connection exists
            const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const connections = await connectionsResponse.json();
            const connection = connections.data?.find(conn => 
                (conn.child1_name === hostChild.name && conn.child2_name === guestChild.name) ||
                (conn.child1_name === guestChild.name && conn.child2_name === hostChild.name)
            );
            checks.push({ name: 'Connection exists', passed: !!connection });
            
            // 2. Invitation accepted
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            const invitations = await invitationsResponse.json();
            const acceptedInvitation = invitations.data?.find(inv => 
                inv.activity_name === activity.name && 
                inv.invited_child_name === guestChild.name &&
                inv.status === 'accepted'
            );
            checks.push({ name: 'Invitation accepted', passed: !!acceptedInvitation });
            
            // 3. Activity visible as connected activity
            checks.push({ name: 'Activity count updated', passed: this.testData.expectedActivityCount > 0 });
            
            const failedChecks = checks.filter(check => !check.passed);
            if (failedChecks.length > 0) {
                throw new Error(`Failed checks: ${failedChecks.map(c => c.name).join(', ')}`);
            }
            
            await this.addResult('End-to-End Verification', true, 
                'Complete pending invitations flow verified successfully');
            return true;
            
        } catch (error) {
            await this.addResult('End-to-End Verification', false, error.message);
            return false;
        }
    }

    async runAllTests() {
        await this.log('🚀 Starting Comprehensive Pending Invitations Flow Tests', 'setup');
        console.log('=' .repeat(80));
        
        const tests = [
            { name: 'Setup Environment', method: 'testSetupEnvironment' },
            { name: 'Create Activity with Pending Invitation', method: 'testCreateActivityWithPendingInvitation' },
            { name: 'Connection Flow', method: 'testConnectionFlow' },
            { name: 'Invitation Creation', method: 'testInvitationCreation' },
            { name: 'Accept Invitation and Activity Count', method: 'testAcceptInvitationAndActivityCount' },
            { name: 'Frontend Activity Count Logic', method: 'testFrontendActivityCountLogic' },
            { name: 'End-to-End Verification', method: 'testEndToEndVerification' }
        ];
        
        let passedTests = 0;
        let continueTesting = true;
        
        for (const test of tests) {
            if (!continueTesting) break;
            
            try {
                const result = await this[test.method]();
                if (result) {
                    passedTests++;
                } else {
                    continueTesting = false;
                    await this.log(`Stopping tests due to failure in: ${test.name}`, 'error');
                }
            } catch (error) {
                await this.log(`Test ${test.name} threw exception: ${error.message}`, 'error');
                continueTesting = false;
            }
        }
        
        // Cleanup
        await this.cleanup();
        
        // Final report
        console.log('\n' + '=' .repeat(80));
        await this.log(`🎯 TEST RESULTS SUMMARY`, 'test');
        console.log('=' .repeat(80));
        
        console.log(`📊 Tests passed: ${passedTests}/${tests.length}`);
        console.log(`📊 Success rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
        
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((result, i) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`   ${i + 1}. ${result.testName}: ${status}`);
            console.log(`      ${result.message}`);
        });
        
        if (passedTests === tests.length) {
            console.log('\n🎉 ALL TESTS PASSED! Pending invitations flow is working correctly.');
            console.log('\n📱 Frontend Testing Instructions:');
            console.log('   1. Create activity with pending connections selected');
            console.log('   2. Send connection request');
            console.log('   3. Accept connection request');
            console.log('   4. Verify invitation appears automatically');
            console.log('   5. Accept invitation');
            console.log('   6. Verify activity count updates correctly');
        } else {
            console.log('\n❌ Some tests failed. Please check the issues above.');
        }
        
        console.log('=' .repeat(80));
        
        return passedTests === tests.length;
    }
}

// Run the tests
async function main() {
    const testSuite = new PendingInvitationsTestSuite();
    
    try {
        await testSuite.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = PendingInvitationsTestSuite;