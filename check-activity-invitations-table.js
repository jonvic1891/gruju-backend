#!/usr/bin/env node

const { Pool } = require('pg');

async function checkTable() {
    let client;
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        client = await pool.connect();
        console.log('✅ Connected to database');

        // Check if activity_invitations table exists
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'activity_invitations'
            );
        `;
        
        const existsResult = await client.query(tableExistsQuery);
        const tableExists = existsResult.rows[0].exists;
        
        console.log('🔍 Table activity_invitations exists:', tableExists);
        
        if (tableExists) {
            // Get table structure
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'activity_invitations'
                ORDER BY ordinal_position;
            `;
            
            const structureResult = await client.query(structureQuery);
            console.log('📋 Table structure:');
            structureResult.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default || ''}`);
            });
            
            // Check if there are any rows
            const countResult = await client.query('SELECT COUNT(*) FROM activity_invitations');
            console.log('📊 Row count:', countResult.rows[0].count);
        } else {
            console.log('❌ Table does not exist - this is likely the cause of the 500 error');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (client) {
            client.release();
        }
    }
}

checkTable();