const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testLogin(email, password) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log(`Login ${email}: ${response.status} -`, data.success ? 'SUCCESS' : 'FAILED');
        if (data.success) {
            console.log(`  Token: ${data.token.substring(0, 20)}...`);
            console.log(`  User: ${data.user.username}`);
        } else {
            console.log(`  Error: ${data.error}`);
        }
        return data.success;
        
    } catch (error) {
        console.log(`Login ${email}: ERROR -`, error.message);
        return false;
    }
}

async function testLogins() {
    console.log('🧪 Testing logins...');
    
    const testCases = [
        ['roberts14@example.com', 'demo123'],
        ['roberts10@example.com', 'demo123'],
        ['davis@example.com', 'demo123'],
        ['johnson@example.com', 'demo123'],
        ['joe@example.com', 'demo123']
    ];
    
    for (const [email, password] of testCases) {
        await testLogin(email, password);
    }
}

testLogins().catch(console.error);