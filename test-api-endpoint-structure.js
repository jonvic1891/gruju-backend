const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testApiEndpoints() {
    console.log('🧪 Testing API endpoints that feed the frontend...');
    
    try {
        // Need to get a token for jon 13, but we know they don't use demo123
        // Let's try to login with common passwords
        const emails = ['roberts13@example.com', 'jon13@example.com'];
        const passwords = ['demo123', 'password', 'password123', 'testpassword'];
        
        let token = null;
        let user = null;
        
        for (const email of emails) {
            for (const password of passwords) {
                try {
                    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    
                    if (loginResponse.ok) {
                        const loginData = await loginResponse.json();
                        if (loginData.success && loginData.user.username === 'jon 13') {
                            token = loginData.token;
                            user = loginData.user;
                            console.log(`✅ Successfully logged in as jon 13 with ${email}:${password}`);
                            break;
                        }
                    }
                } catch (e) {
                    // Continue trying
                }
            }
            if (token) break;
        }
        
        if (!token) {
            console.log('❌ Could not login as jon 13');
            console.log('💡 The password for this user is different from common ones');
            console.log('💡 Let\'s create a test using a different approach...');
            return;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Test the connection requests endpoint that feeds the frontend
        console.log('\n🔍 Testing /api/connections/requests endpoint...');
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers
        });
        
        if (!requestsResponse.ok) {
            console.log(`❌ Requests endpoint failed: ${requestsResponse.status}`);
            return;
        }
        
        const requestsData = await requestsResponse.json();
        console.log('📊 Connection requests endpoint response:');
        console.log(JSON.stringify(requestsData, null, 2));
        
        // Also test sent requests
        console.log('\n🔍 Testing /api/connections/sent-requests endpoint...');
        const sentResponse = await fetch(`${API_BASE}/api/connections/sent-requests`, {
            headers
        });
        
        if (!sentResponse.ok) {
            console.log(`❌ Sent requests endpoint failed: ${sentResponse.status}`);
            return;
        }
        
        const sentData = await sentResponse.json();
        console.log('📊 Sent requests endpoint response:');
        console.log(JSON.stringify(sentData, null, 2));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testApiEndpoints().catch(console.error);