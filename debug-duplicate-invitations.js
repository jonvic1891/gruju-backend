#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost', 
    database: process.env.PGDATABASE || 'parent_activity_app',
    password: process.env.PGPASSWORD || 'password',
    port: process.env.PGPORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugDuplicateInvitations() {
    try {
        console.log('🔍 CHECKING FOR DUPLICATE INVITATIONS');
        console.log('='.repeat(70));
        
        const client = await pool.connect();
        
        // Check for charlie 1 activity specifically
        const charlie1Query = await client.query(`
            SELECT ai.*, a.name as activity_name, u1.username as inviter, u2.username as invited
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_id = a.id
            JOIN users u1 ON ai.inviter_parent_id = u1.id
            JOIN users u2 ON ai.invited_parent_id = u2.id
            WHERE a.name = 'charlie 1'
            ORDER BY ai.created_at DESC
        `);
        
        console.log(`📧 INVITATIONS FOR "charlie 1" ACTIVITY: ${charlie1Query.rows.length}`);
        charlie1Query.rows.forEach((inv, i) => {
            console.log(`\n${i + 1}. Invitation ID: ${inv.id}`);
            console.log(`   Status: ${inv.status}`);
            console.log(`   Inviter: ${inv.inviter} (ID: ${inv.inviter_parent_id})`);
            console.log(`   Invited: ${inv.invited} (ID: ${inv.invited_parent_id})`);
            console.log(`   Invited Child ID: ${inv.invited_child_id}`);
            console.log(`   Created: ${inv.created_at}`);
            console.log(`   Updated: ${inv.updated_at}`);
        });
        
        // Check for any duplicate invitations (same activity + same invited parent)
        const duplicatesQuery = await client.query(`
            SELECT activity_id, invited_parent_id, COUNT(*) as count, 
                   array_agg(id) as invitation_ids,
                   array_agg(status) as statuses,
                   array_agg(created_at) as created_dates
            FROM activity_invitations 
            GROUP BY activity_id, invited_parent_id
            HAVING COUNT(*) > 1
        `);
        
        console.log(`\n🔍 DUPLICATE INVITATIONS FOUND: ${duplicatesQuery.rows.length}`);
        duplicatesQuery.rows.forEach((dup, i) => {
            console.log(`\n${i + 1}. Activity ID: ${dup.activity_id}, Invited Parent: ${dup.invited_parent_id}`);
            console.log(`   Count: ${dup.count}`);
            console.log(`   Invitation IDs: ${dup.invitation_ids}`);
            console.log(`   Statuses: ${dup.statuses}`);
            console.log(`   Created dates: ${dup.created_dates.map(d => d.toISOString())}`);
        });
        
        client.release();
        
        console.log('\n🎯 ANALYSIS:');
        console.log('If there are duplicates, we need to:');
        console.log('1. Keep the most recent invitation');
        console.log('2. Delete older duplicates');
        console.log('3. Fix the invitation response logic to UPDATE instead of INSERT');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        pool.end();
    }
}

debugDuplicateInvitations();