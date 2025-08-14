#!/usr/bin/env node

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://claudclubs_user:your_password@localhost:5432/claudclubs';
const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateExistingActivities() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 MIGRATING EXISTING ACTIVITIES TO SET is_shared FLAG');
        console.log('='.repeat(70));
        
        // First, update activities that have auto_notify_new_connections = true
        console.log('1️⃣ Updating activities with auto_notify_new_connections = true...');
        const autoNotifyResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE auto_notify_new_connections = true AND is_shared = false
        `);
        console.log(`   ✅ Updated ${autoNotifyResult.rowCount} activities with auto_notify_new_connections`);
        
        // Second, update activities that have pending invitations
        console.log('2️⃣ Updating activities with pending invitations...');
        const pendingInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT pai.activity_id 
                FROM pending_activity_invitations pai
            ) AND is_shared = false
        `);
        console.log(`   ✅ Updated ${pendingInvitesResult.rowCount} activities with pending invitations`);
        
        // Third, update activities that have actual invitations
        console.log('3️⃣ Updating activities with actual invitations...');
        const actualInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT ai.activity_id 
                FROM activity_invitations ai
            ) AND is_shared = false
        `);
        console.log(`   ✅ Updated ${actualInvitesResult.rowCount} activities with actual invitations`);
        
        // Show summary of changes
        console.log('\n📊 MIGRATION SUMMARY:');
        console.log(`   Auto-notify activities: ${autoNotifyResult.rowCount}`);
        console.log(`   Activities with pending invitations: ${pendingInvitesResult.rowCount}`);
        console.log(`   Activities with actual invitations: ${actualInvitesResult.rowCount}`);
        
        const totalUpdated = autoNotifyResult.rowCount + pendingInvitesResult.rowCount + actualInvitesResult.rowCount;
        console.log(`   🎯 Total activities updated: ${totalUpdated}`);
        
        // Verify specific activity (charlie 1)
        console.log('\n🔍 Checking "charlie 1" activity...');
        const charlie1Check = await client.query(`
            SELECT a.id, a.name, a.is_shared, 
                   COUNT(pai.id) as pending_count,
                   COUNT(ai.id) as invitation_count
            FROM activities a
            LEFT JOIN pending_activity_invitations pai ON a.id = pai.activity_id
            LEFT JOIN activity_invitations ai ON a.id = ai.activity_id
            WHERE a.name = 'charlie 1'
            GROUP BY a.id, a.name, a.is_shared
        `);
        
        if (charlie1Check.rows.length > 0) {
            const activity = charlie1Check.rows[0];
            console.log(`   Activity "${activity.name}" (ID: ${activity.id}):`);
            console.log(`   - is_shared: ${activity.is_shared}`);
            console.log(`   - pending_invitations: ${activity.pending_count}`);
            console.log(`   - actual_invitations: ${activity.invitation_count}`);
            
            if (activity.is_shared) {
                console.log('   ✅ "charlie 1" is now correctly marked as shared!');
            } else {
                console.log('   ❌ "charlie 1" still not marked as shared');
            }
        } else {
            console.log('   ❌ "charlie 1" activity not found');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateExistingActivities();