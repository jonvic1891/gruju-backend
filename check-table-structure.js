#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTableStructure() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking activity_invitations table structure...');
        
        const structureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'activity_invitations'
            ORDER BY ordinal_position
        `;
        const structure = await client.query(structureQuery);
        
        console.log('📋 Column structure:');
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Also check a sample record to see actual data
        console.log('\n📋 Sample record:');
        const sampleQuery = `
            SELECT * 
            FROM activity_invitations 
            WHERE invited_parent_id = 3 
            LIMIT 1
        `;
        const sample = await client.query(sampleQuery);
        
        if (sample.rows.length > 0) {
            console.log('   Sample record columns:');
            Object.keys(sample.rows[0]).forEach(key => {
                console.log(`   - ${key}: ${sample.rows[0][key]}`);
            });
        } else {
            console.log('   No sample records found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTableStructure();