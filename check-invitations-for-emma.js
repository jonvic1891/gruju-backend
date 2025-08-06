#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkInvitationsForEmma() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking invitations for Emma Johnson and Mia Davis...');
        
        // First, find user IDs for Emma's parent (Johnson) and Mia Davis's parent (Davis)
        const usersQuery = `
            SELECT id, username, email 
            FROM users 
            WHERE email IN ('johnson@example.com', 'davis@example.com')
            ORDER BY email
        `;
        const users = await client.query(usersQuery);
        console.log('👤 Found users:');
        users.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.email} (ID: ${user.id})`);
        });
        
        const johnsonId = users.rows.find(u => u.email === 'johnson@example.com')?.id;
        const davisId = users.rows.find(u => u.email === 'davis@example.com')?.id;
        
        if (!johnsonId || !davisId) {
            console.log('❌ Could not find Johnson or Davis user IDs');
            return;
        }
        
        // Check for invitations TO Johnson family (Emma's parent)
        console.log('\n📧 Checking invitations TO Johnson family (Emma\'s parent):');
        const johnsonInvitationsQuery = `
            SELECT 
                ai.*,
                a.name as activity_name,
                a.start_date,
                a.start_time,
                a.location,
                u_inviter.username as inviter_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_id = a.id
            JOIN users u_inviter ON ai.inviter_parent_id = u_inviter.id
            WHERE ai.invited_parent_id = $1
            ORDER BY ai.created_at DESC
        `;
        const johnsonInvitations = await client.query(johnsonInvitationsQuery, [johnsonId]);
        
        if (johnsonInvitations.rows.length === 0) {
            console.log('   ❌ No invitations found for Johnson family');
        } else {
            johnsonInvitations.rows.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.inviter_name}`);
                console.log(`      Status: ${inv.status} | Date: ${inv.start_date} ${inv.start_time || ''}`);
                console.log(`      Location: ${inv.location || 'None'} | Message: "${inv.message || 'None'}"`);
            });
        }
        
        // Check for invitations TO Davis family (Mia Davis's parent)
        console.log('\n📧 Checking invitations TO Davis family (Mia Davis\'s parent):');
        const davisInvitations = await client.query(johnsonInvitationsQuery, [davisId]);
        
        if (davisInvitations.rows.length === 0) {
            console.log('   ❌ No invitations found for Davis family');
        } else {
            davisInvitations.rows.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.inviter_name}`);
                console.log(`      Status: ${inv.status} | Date: ${inv.start_date} ${inv.start_time || ''}`);
                console.log(`      Location: ${inv.location || 'None'} | Message: "${inv.message || 'None'}"`);
            });
        }
        
        // Check all recent invitations to understand the data
        console.log('\n📊 All recent invitations in database:');
        const allInvitationsQuery = `
            SELECT 
                ai.id,
                ai.status,
                ai.created_at,
                a.name as activity_name,
                u_inviter.username as inviter_name,
                u_invited.username as invited_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_id = a.id
            JOIN users u_inviter ON ai.inviter_parent_id = u_inviter.id
            JOIN users u_invited ON ai.invited_parent_id = u_invited.id
            ORDER BY ai.created_at DESC
            LIMIT 10
        `;
        const allInvitations = await client.query(allInvitationsQuery);
        
        if (allInvitations.rows.length === 0) {
            console.log('   ❌ No invitations found in entire database');
        } else {
            allInvitations.rows.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}": ${inv.inviter_name} → ${inv.invited_name} (${inv.status})`);
                console.log(`      Created: ${new Date(inv.created_at).toLocaleString()}`);
            });
        }
        
        console.log('\n🔍 Summary:');
        console.log(`- Johnson family (Emma's parent) has ${johnsonInvitations.rows.length} invitations`);
        console.log(`- Davis family (Mia Davis's parent) has ${davisInvitations.rows.length} invitations`);
        console.log(`- Total recent invitations in database: ${allInvitations.rows.length}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkInvitationsForEmma();