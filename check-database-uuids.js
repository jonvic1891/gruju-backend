#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkDatabaseUUIDs() {
    try {
        console.log('🔍 CHECKING DATABASE UUID STATUS');
        console.log('='.repeat(50));
        
        // Create an admin endpoint to check UUIDs directly
        const response = await fetch(`${API_BASE}/api/admin/check-uuids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'check_migration_status',
                tables: ['users', 'children', 'activities', 'connections']
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ UUID Check Result:', result);
        } else {
            console.log('❌ Admin endpoint not available - creating one...');
            console.log('Need to add admin endpoint to check UUID migration status');
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkDatabaseUUIDs();