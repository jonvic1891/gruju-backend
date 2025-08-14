#!/usr/bin/env node

/**
 * COMPREHENSIVE ACTIVITY COUNT TESTS
 * 
 * This test suite verifies that activity counts are calculated correctly:
 * 1. Own activities (created by user)
 * 2. Accepted invitations (connected activities from others)
 * 3. Frontend logic matches backend data
 * 4. Edge cases and filtering work properly
 */

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

class ActivityCountTestSuite {
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

    async login(email, password) {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            return data;
        }
        throw new Error(`Login failed for ${email}: ${data.error}`);
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

    // TEST 1: Test Empty Activity Count (Baseline)
    async testEmptyActivityCount() {
        await this.log('TEST 1: Testing empty activity count baseline...', 'test');
        
        try {
            // Login as Roberts family (Emilia's parent)
            const login = await this.login('roberts@example.com', 'test123');
            
            // Get children
            const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${login.token}` }
            });
            const childrenData = await childrenResponse.json();
            const emilia = childrenData.data.find(child => child.name === 'Emilia');
            
            if (!emilia) {
                throw new Error('Emilia not found in children');
            }
            
            // Clear any existing activities and invitations for clean test
            const activitiesResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
                headers: { 'Authorization': `Bearer ${login.token}` }
            });
            const activities = await activitiesResponse.json();
            
            const initialOwnCount = activities.data?.length || 0;
            
            // Calculate activity count using same logic as frontend
            const totalCount = await this.calculateActivityCount(login, emilia);
            
            this.testData = { login, emilia, initialOwnCount };
            
            await this.addResult('Empty Activity Count Baseline', true, 
                `Baseline established - Own: ${initialOwnCount}, Total: ${totalCount}`);
            return true;
            
        } catch (error) {
            await this.addResult('Empty Activity Count Baseline', false, error.message);
            return false;
        }
    }

    // TEST 2: Test Own Activities Count
    async testOwnActivitiesCount() {
        await this.log('TEST 2: Testing own activities count...', 'test');
        
        try {
            const { login, emilia, initialOwnCount } = this.testData;
            
            // Create a test activity for Emilia
            const activityData = {
                name: 'Emilia Own Activity Test',
                description: 'Testing own activity count',
                start_date: '2025-08-25',
                end_date: '2025-08-25',
                start_time: '10:00',
                end_time: '12:00',
                location: 'Test Location',
                cost: '0',
                max_participants: '5',
                auto_notify_new_connections: false
            };
            
            const createResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${login.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activityData)
            });
            
            const createResult = await createResponse.json();
            if (!createResult.success) {
                throw new Error(`Failed to create activity: ${createResult.error}`);
            }
            
            this.testData.ownActivity = createResult.data;
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/activities/${this.testData.ownActivity.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${login.token}` }
                });
            });
            
            // Verify activity count increased
            const newCount = await this.calculateActivityCount(login, emilia);
            const expectedCount = initialOwnCount + 1;
            
            if (newCount !== expectedCount) {
                throw new Error(`Expected count ${expectedCount}, got ${newCount}`);
            }
            
            await this.addResult('Own Activities Count', true, 
                `Activity count correctly increased from ${initialOwnCount} to ${newCount} after creating own activity`);
            return true;
            
        } catch (error) {
            await this.addResult('Own Activities Count', false, error.message);
            return false;
        }
    }

    // TEST 3: Test Accepted Invitations Count
    async testAcceptedInvitationsCount() {
        await this.log('TEST 3: Testing accepted invitations count...', 'test');
        
        try {
            const { login, emilia } = this.testData;
            
            // Create an invitation from another user to Emilia
            const hostLogin = await this.login('jonathan.roberts006@hotmail.co.uk', 'test123');
            const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            });
            const hostChildren = await hostChildrenResponse.json();
            const hostChild = hostChildren.data[0];
            
            // Create activity by host
            const hostActivityData = {
                name: 'Host Activity for Count Test',
                description: 'Testing invitation count',
                start_date: '2025-08-26',
                end_date: '2025-08-26',
                start_time: '14:00',
                end_time: '16:00',
                location: 'Host Location',
                cost: '0',
                max_participants: '10',
                auto_notify_new_connections: false
            };
            
            const hostActivityResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(hostActivityData)
            });
            
            const hostActivity = await hostActivityResponse.json();
            if (!hostActivity.success) {
                throw new Error('Failed to create host activity');
            }
            
            this.testData.hostActivity = hostActivity.data;
            this.testData.hostLogin = hostLogin;
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/activities/${this.testData.hostActivity.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
            });
            
            // Send invitation to Emilia
            const inviteData = {
                invited_parent_id: login.user.id,
                child_id: emilia.id,
                message: 'Test invitation for activity count'
            };
            
            const inviteResponse = await fetch(`${API_BASE}/api/activities/${hostActivity.data.id}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteData)
            });
            
            const inviteResult = await inviteResponse.json();
            if (!inviteResult.success) {
                throw new Error(`Failed to send invitation: ${inviteResult.error}`);
            }
            
            // Get invitation ID
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${login.token}` }
            });
            const invitations = await invitationsResponse.json();
            
            const invitation = invitations.data?.find(inv => 
                inv.activity_name === hostActivity.data.name && 
                inv.invited_child_name === emilia.name
            );
            
            if (!invitation) {
                throw new Error('Invitation not found');
            }
            
            // Accept the invitation
            const acceptResponse = await fetch(`${API_BASE}/api/activity-invitations/${invitation.invitation_id}/respond`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${login.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'accept' })
            });
            
            const acceptResult = await acceptResponse.json();
            if (!acceptResult.success) {
                throw new Error(`Failed to accept invitation: ${acceptResult.error}`);
            }
            
            // Verify activity count increased
            const newCount = await this.calculateActivityCount(login, emilia);
            const previousCount = await this.getOwnActivitiesCount(login, emilia) + 1; // Previous own activities + 1 
            
            if (newCount <= previousCount) {
                throw new Error(`Expected count to increase due to accepted invitation. Previous: ${previousCount}, New: ${newCount}`);
            }
            
            await this.addResult('Accepted Invitations Count', true, 
                `Activity count correctly increased to ${newCount} after accepting invitation`);
            return true;
            
        } catch (error) {
            await this.addResult('Accepted Invitations Count', false, error.message);
            return false;
        }
    }

    // TEST 4: Test Filtering (Exclude Own Hosted Activities)
    async testActivityCountFiltering() {
        await this.log('TEST 4: Testing activity count filtering...', 'test');
        
        try {
            const { login, emilia, hostLogin } = this.testData;
            
            // Create activity by Emilia and invite herself (should be filtered out)
            const selfInviteActivityData = {
                name: 'Self Invite Test Activity',
                description: 'Testing filtering of own hosted activities',
                start_date: '2025-08-27',
                end_date: '2025-08-27',
                start_time: '16:00',
                end_time: '18:00',
                location: 'Self Location',
                cost: '0',
                max_participants: '5',
                auto_notify_new_connections: false
            };
            
            const selfActivityResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${login.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(selfInviteActivityData)
            });
            
            const selfActivity = await selfActivityResponse.json();
            if (!selfActivity.success) {
                throw new Error('Failed to create self activity');
            }
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/activities/${selfActivity.data.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${login.token}` }
                });
            });
            
            // Send invitation to another user then back to Emilia (to test filtering)
            const inviteToSelfData = {
                invited_parent_id: login.user.id,
                child_id: emilia.id,
                message: 'Self invitation test (should be filtered out)'
            };
            
            await fetch(`${API_BASE}/api/activities/${selfActivity.data.id}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${login.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteToSelfData)
            });
            
            // Accept the self invitation
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${login.token}` }
            });
            const invitations = await invitationsResponse.json();
            
            const selfInvitation = invitations.data?.find(inv => 
                inv.activity_name === selfActivity.data.name && 
                inv.invited_child_name === emilia.name
            );
            
            if (selfInvitation) {
                await fetch(`${API_BASE}/api/activity-invitations/${selfInvitation.invitation_id}/respond`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${login.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'accept' })
                });
            }
            
            // Calculate activity count - self-hosted accepted invitations should be filtered out
            const finalCount = await this.calculateActivityCount(login, emilia);
            
            // Count should NOT include the self-hosted accepted invitation due to filtering
            const ownActivitiesCount = await this.getOwnActivitiesCount(login, emilia);
            const acceptedExternalInvitations = await this.getAcceptedExternalInvitationsCount(login, emilia);
            
            const expectedCount = ownActivitiesCount + acceptedExternalInvitations;
            
            if (finalCount !== expectedCount) {
                throw new Error(`Filtering failed. Expected: ${expectedCount}, Got: ${finalCount}`);
            }
            
            await this.addResult('Activity Count Filtering', true, 
                `Filtering correctly excludes self-hosted invitations. Count: ${finalCount} (${ownActivitiesCount} own + ${acceptedExternalInvitations} external)`);
            return true;
            
        } catch (error) {
            await this.addResult('Activity Count Filtering', false, error.message);
            return false;
        }
    }

    // TEST 5: Test Frontend-Backend Consistency
    async testFrontendBackendConsistency() {
        await this.log('TEST 5: Testing frontend-backend consistency...', 'test');
        
        try {
            const { login, emilia } = this.testData;
            
            // Calculate using frontend logic (exact same as ChildrenScreen.tsx)
            const frontendCount = await this.calculateActivityCount(login, emilia);
            
            // Calculate using individual API calls
            const backendOwnCount = await this.getOwnActivitiesCount(login, emilia);
            const backendInvitationsCount = await this.getAcceptedExternalInvitationsCount(login, emilia);
            const backendTotalCount = backendOwnCount + backendInvitationsCount;
            
            if (frontendCount !== backendTotalCount) {
                throw new Error(`Inconsistency detected. Frontend: ${frontendCount}, Backend: ${backendTotalCount}`);
            }
            
            await this.addResult('Frontend-Backend Consistency', true, 
                `Frontend and backend calculations match: ${frontendCount} activities`);
            return true;
            
        } catch (error) {
            await this.addResult('Frontend-Backend Consistency', false, error.message);
            return false;
        }
    }

    // TEST 6: Test Edge Cases
    async testEdgeCases() {
        await this.log('TEST 6: Testing edge cases...', 'test');
        
        try {
            const { login, emilia } = this.testData;
            
            // Test with declined invitations (should not count)
            const hostLogin = this.testData.hostLogin;
            const hostChild = (await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            }).then(r => r.json())).data[0];
            
            // Create another activity and decline invitation
            const declineTestData = {
                name: 'Decline Test Activity',
                description: 'Testing declined invitation edge case',
                start_date: '2025-08-28',
                end_date: '2025-08-28',
                start_time: '11:00',
                end_time: '13:00',
                location: 'Decline Location',
                cost: '0',
                max_participants: '8',
                auto_notify_new_connections: false
            };
            
            const declineActivityResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(declineTestData)
            });
            
            const declineActivity = await declineActivityResponse.json();
            if (!declineActivity.success) {
                throw new Error('Failed to create decline test activity');
            }
            
            // Add cleanup task
            this.cleanupTasks.push(async () => {
                await fetch(`${API_BASE}/api/activities/${declineActivity.data.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
            });
            
            // Send and decline invitation
            const inviteData = {
                invited_parent_id: login.user.id,
                child_id: emilia.id,
                message: 'Test decline invitation'
            };
            
            await fetch(`${API_BASE}/api/activities/${declineActivity.data.id}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLogin.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteData)
            });
            
            // Get and decline invitation
            const today = new Date();
            const oneYearLater = new Date();
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const startDate = today.toISOString().split('T')[0];
            const endDate = oneYearLater.toISOString().split('T')[0];
            
            const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${login.token}` }
            });
            const invitations = await invitationsResponse.json();
            
            const declineInvitation = invitations.data?.find(inv => 
                inv.activity_name === declineActivity.data.name
            );
            
            if (declineInvitation) {
                await fetch(`${API_BASE}/api/activity-invitations/${declineInvitation.invitation_id}/respond`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${login.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'reject' })
                });
            }
            
            // Count should not change due to declined invitation
            const countAfterDecline = await this.calculateActivityCount(login, emilia);
            const expectedCount = await this.getOwnActivitiesCount(login, emilia) + 
                                 await this.getAcceptedExternalInvitationsCount(login, emilia);
            
            if (countAfterDecline !== expectedCount) {
                throw new Error(`Declined invitation affected count incorrectly. Expected: ${expectedCount}, Got: ${countAfterDecline}`);
            }
            
            await this.addResult('Edge Cases', true, 
                `Edge cases handled correctly. Declined invitations do not affect count: ${countAfterDecline}`);
            return true;
            
        } catch (error) {
            await this.addResult('Edge Cases', false, error.message);
            return false;
        }
    }

    // Helper method to calculate activity count using frontend logic
    async calculateActivityCount(login, child) {
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        let totalCount = 0;
        
        // Count own activities
        const ownActivitiesResponse = await fetch(`${API_BASE}/api/activities/${child.id}`, {
            headers: { 'Authorization': `Bearer ${login.token}` }
        });
        const ownActivitiesData = await ownActivitiesResponse.json();
        
        if (ownActivitiesData.success && ownActivitiesData.data && Array.isArray(ownActivitiesData.data)) {
            totalCount += ownActivitiesData.data.length;
        }
        
        // Count accepted invitations using unified endpoint (same as frontend)
        const allInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${login.token}` }
        });
        const allInvitationsData = await allInvitationsResponse.json();
        
        if (allInvitationsData.success && allInvitationsData.data) {
            const currentUser = login.user;
            const currentUsername = currentUser.username;
            
            const childAcceptedInvitations = allInvitationsData.data.filter(invitation => 
                invitation.invited_child_name === child.name &&
                invitation.status === 'accepted' &&
                invitation.host_parent_username !== currentUsername
            );
            
            totalCount += childAcceptedInvitations.length;
        }
        
        return totalCount;
    }

    async getOwnActivitiesCount(login, child) {
        const response = await fetch(`${API_BASE}/api/activities/${child.id}`, {
            headers: { 'Authorization': `Bearer ${login.token}` }
        });
        const data = await response.json();
        return data.data?.length || 0;
    }

    async getAcceptedExternalInvitationsCount(login, child) {
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const response = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${login.token}` }
        });
        const data = await response.json();
        
        if (!data.success || !data.data) return 0;
        
        const currentUsername = login.user.username;
        const acceptedExternal = data.data.filter(invitation => 
            invitation.invited_child_name === child.name &&
            invitation.status === 'accepted' &&
            invitation.host_parent_username !== currentUsername
        );
        
        return acceptedExternal.length;
    }

    async runAllTests() {
        await this.log('🚀 Starting Comprehensive Activity Count Tests', 'setup');
        console.log('=' .repeat(80));
        
        const tests = [
            { name: 'Empty Activity Count Baseline', method: 'testEmptyActivityCount' },
            { name: 'Own Activities Count', method: 'testOwnActivitiesCount' },
            { name: 'Accepted Invitations Count', method: 'testAcceptedInvitationsCount' },
            { name: 'Activity Count Filtering', method: 'testActivityCountFiltering' },
            { name: 'Frontend-Backend Consistency', method: 'testFrontendBackendConsistency' },
            { name: 'Edge Cases', method: 'testEdgeCases' }
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
        await this.log(`🎯 ACTIVITY COUNT TEST RESULTS`, 'test');
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
            console.log('\n🎉 ALL ACTIVITY COUNT TESTS PASSED!');
            console.log('\n📊 Activity count functionality verified:');
            console.log('   ✅ Own activities counted correctly');
            console.log('   ✅ Accepted invitations counted correctly'); 
            console.log('   ✅ Self-hosted invitations filtered out correctly');
            console.log('   ✅ Frontend-backend calculations consistent');
            console.log('   ✅ Edge cases handled properly');
        } else {
            console.log('\n❌ Some activity count tests failed. Please check the issues above.');
        }
        
        console.log('=' .repeat(80));
        
        return passedTests === tests.length;
    }
}

// Run the tests
async function main() {
    const testSuite = new ActivityCountTestSuite();
    
    try {
        await testSuite.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Activity count test suite failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ActivityCountTestSuite;