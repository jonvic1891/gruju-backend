#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgres://uakqgrp7dbvpiv:70b08b7d2ee3f7a4ebf0b334e0d7d28b10b8eee3ae5d2f44816c01b1e8bb7f45@ec2-54-158-190-214.compute-1.amazonaws.com:5432/dcvd67a80gc13e',
    ssl: { rejectUnauthorized: false }
});

async function addInvitedChildrenColumn() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Adding invited_children column to activities table...');
        
        // Check if column already exists
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'activities' 
            AND column_name = 'invited_children'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ invited_children column already exists');
            return;
        }
        
        // Add the column
        await client.query(`
            ALTER TABLE activities 
            ADD COLUMN invited_children TEXT[]
        `);
        
        console.log('✅ Successfully added invited_children column to activities table');
        
        // Update existing activities to have empty array
        const updateResult = await client.query(`
            UPDATE activities 
            SET invited_children = '{}' 
            WHERE invited_children IS NULL
        `);
        
        console.log(`✅ Updated ${updateResult.rowCount} existing activities with empty invited_children array`);
        
    } catch (error) {
        console.error('❌ Error adding invited_children column:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addInvitedChildrenColumn();