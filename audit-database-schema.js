#!/usr/bin/env node

const { Pool } = require('pg');

async function auditDatabaseSchema() {
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

        // Get all tables
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        
        const tablesResult = await client.query(tablesQuery);
        console.log('\n📋 Database Tables:');
        
        for (const table of tablesResult.rows) {
            console.log(`\n🔹 TABLE: ${table.table_name}`);
            
            // Get table structure
            const structureQuery = `
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default,
                    character_maximum_length
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `;
            
            const structureResult = await client.query(structureQuery, [table.table_name]);
            
            structureResult.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
            });
            
            // Get row count
            try {
                const countResult = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
                console.log(`  📊 Rows: ${countResult.rows[0].count}`);
            } catch (err) {
                console.log(`  ⚠️ Could not count rows: ${err.message}`);
            }
        }

        console.log('\n🔍 Checking for foreign key constraints...');
        const fkQuery = `
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name;
        `;
        
        const fkResult = await client.query(fkQuery);
        if (fkResult.rows.length > 0) {
            fkResult.rows.forEach(fk => {
                console.log(`  🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('  ℹ️ No foreign key constraints found');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        if (client) {
            client.release();
        }
    }
}

auditDatabaseSchema();