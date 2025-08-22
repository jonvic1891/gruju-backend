const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createTestAccount(email, username, childName, birthYear) {
    try {
        console.log(`\n📝 Creating account: ${email}`);
        
        // Register account
        const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'test123',
                username
            })
        });
        
        const registerData = await registerResponse.json();
        
        if (!registerData.success) {
            console.log(`❌ Registration failed: ${registerData.message}`);
            return null;
        }
        
        console.log(`✅ Account created: ${username}`);
        const token = registerData.token;
        
        // Add child
        const childResponse = await fetch(`${API_BASE}/api/children`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: childName,
                birth_year: birthYear
            })
        });
        
        const childData = await childResponse.json();
        
        if (childData.success) {
            console.log(`✅ Child created: ${childData.data.name}`);
            return {
                email,
                username,
                token,
                child: childData.data
            };
        } else {
            console.log(`❌ Child creation failed: ${childData.message}`);
            return { email, username, token, child: null };
        }
        
    } catch (error) {
        console.error(`❌ Error creating account ${email}:`, error.message);
        return null;
    }
}

async function createAllTestAccounts() {
    console.log('🚀 Creating test accounts for skeleton flow...');
    
    const accounts = [
        {
            email: 'roberts97@example.com',
            username: 'Roberts 97',
            childName: 'Hugo Stearn',
            birthYear: 2016
        },
        {
            email: 'roberts98@example.com', 
            username: 'Roberts 98',
            childName: 'Emilia Roberts',
            birthYear: 2015
        },
        {
            email: 'roberts99@example.com',
            username: 'Roberts 99', 
            childName: 'Charlie Smith',
            birthYear: 2017
        }
    ];
    
    const results = [];
    
    for (const account of accounts) {
        const result = await createTestAccount(
            account.email,
            account.username,
            account.childName,
            account.birthYear
        );
        if (result) {
            results.push(result);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Summary:');
    console.log('==========');
    results.forEach(account => {
        console.log(`✅ ${account.username} (${account.email})`);
        if (account.child) {
            console.log(`   └── Child: ${account.child.name} (${account.child.uuid})`);
        }
    });
    
    return results;
}

createAllTestAccounts().catch(console.error);