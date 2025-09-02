const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Check if Emma Johnson shows up in Zoe Wong's connections
async function checkZoeConnections() {
    try {
        console.log('🔍 Checking if Emma Johnson is in Zoe Wong\'s connections...\n');

        // Login as wong@example.com
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.error);
            return;
        }

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('✅ Logged in as wong@example.com');

        // Get Zoe Wong's connections
        const zoeWongUuid = '6795debd-d0cf-4c23-a5a1-a4ce65339fe6';
        const zoeConnectionsResponse = await axios.get(`${API_BASE}/connections/${zoeWongUuid}`, { headers });
        
        console.log('📊 Zoe Wong connections API response:', JSON.stringify(zoeConnectionsResponse.data, null, 2));
        
        if (zoeConnectionsResponse.data.success) {
            const connections = zoeConnectionsResponse.data.data;
            console.log(`📊 Zoe Wong has ${connections.length} connections:`);
            
            connections.forEach((conn, index) => {
                console.log(`  ${index + 1}. ${conn.name || 'Unknown'} (${conn.connected_child_uuid || conn.child_uuid || conn.uuid})`);
                console.log(`     Parent: ${conn.parentname || conn.parent_name || 'Unknown'} (${conn.parentuuid || conn.parent_uuid || 'Unknown'})`);
                console.log(`     Status: ${conn.status || 'Unknown'}`);
                console.log('');
            });
            
            // Look for Emma Johnson specifically
            const emmaConnection = connections.find(conn => 
                (conn.name || '').includes('Emma Johnson') ||
                (conn.connected_child_name || '').includes('Emma Johnson') ||
                (conn.child_name || '').includes('Emma Johnson')
            );
            
            if (emmaConnection) {
                console.log('✅ Emma Johnson found in Zoe Wong\'s connections:');
                console.log('   Name:', emmaConnection.name || emmaConnection.connected_child_name || emmaConnection.child_name);
                console.log('   UUID:', emmaConnection.connected_child_uuid || emmaConnection.child_uuid || emmaConnection.uuid);
                console.log('   Parent UUID:', emmaConnection.parentuuid || emmaConnection.parent_uuid || emmaConnection.connected_parent_uuid);
                console.log('   Status:', emmaConnection.status || emmaConnection.connection_status);
                
                // Check if status is active
                const status = emmaConnection.status || emmaConnection.connection_status || 'unknown';
                if (status === 'active' || status === 'accepted' || status === 'connected') {
                    console.log('✅ Connection is active - Emma should appear in joint host UI');
                } else {
                    console.log(`❌ Connection status is "${status}" - this might prevent Emma from appearing in joint host UI`);
                }
            } else {
                console.log('❌ Emma Johnson NOT found in Zoe Wong\'s connections!');
                console.log('💡 This would explain why she doesn\'t appear in the joint host selection UI');
                
                // Show what connections exist
                console.log('\n📋 Available connections for Zoe Wong:');
                connections.forEach(conn => {
                    console.log(`  - ${conn.name || 'Unknown'}`);
                });
            }
        } else {
            console.error('❌ Failed to get Zoe Wong connections:', zoeConnectionsResponse.data);
        }

    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

// Run the check
checkZoeConnections();