require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Function to fetch website metadata
async function fetchWebsiteMetadata(url) {
    try {
        console.log('🔍 Fetching metadata for:', url);
        
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Gruju/1.0; +https://gruju.com)'
            },
            timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Extract metadata using regex (simple parsing)
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let descriptionMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i) ||
                               html.match(/<meta[^>]*content=["\']([^"']+)["\'][^>]*name=["\']description["\'][^>]*>/i);
        
        // If no meta description found, try to extract from page content
        let description = descriptionMatch ? descriptionMatch[1].trim() : null;
        if (!description || description === titleMatch?.[1]?.trim()) {
            // Try to find contact information and other useful content
            const phoneMatch = html.match(/(?:\+44\s*\(?0?\)?\s*|0)([0-9\s\-\(\)]{10,15})/i);
            const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
            
            // Build description from available information
            let contentParts = [];
            
            if (phoneMatch) {
                contentParts.push(`Contact Phone: ${phoneMatch[0].trim()}`);
            }
            if (emailMatch) {
                contentParts.push(`Contact Email: ${emailMatch[1].trim()}`);
            }
            
            // Try to find other meaningful content in h1, h2, or p tags
            const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const firstPMatch = html.match(/<p[^>]*>([^<]{20,200})<\/p>/i);
            
            if (contentParts.length === 0) {
                if (firstPMatch) {
                    contentParts.push(firstPMatch[1].trim().replace(/\s+/g, ' '));
                } else if (h1Match && h1Match[1] !== titleMatch?.[1]) {
                    contentParts.push(h1Match[1].trim());
                }
            }
            
            description = contentParts.length > 0 ? contentParts.join('. ') : null;
        }
        
        // Look for various favicon formats
        const faviconMatches = [
            html.match(/<link[^>]*rel=["\']icon["\'][^>]*href=["\']([^"']+)["\'][^>]*>/i),
            html.match(/<link[^>]*rel=["\']shortcut icon["\'][^>]*href=["\']([^"']+)["\'][^>]*>/i),
            html.match(/<link[^>]*rel=["\']apple-touch-icon["\'][^>]*href=["\']([^"']+)["\'][^>]*>/i)
        ];
        
        let favicon = null;
        for (const match of faviconMatches) {
            if (match && match[1]) {
                favicon = match[1];
                // Convert relative URLs to absolute
                if (favicon.startsWith('/')) {
                    const urlObj = new URL(url);
                    favicon = `${urlObj.protocol}//${urlObj.host}${favicon}`;
                } else if (!favicon.startsWith('http')) {
                    const urlObj = new URL(url);
                    favicon = `${urlObj.protocol}//${urlObj.host}/${favicon}`;
                }
                break;
            }
        }
        
        // Fallback to default favicon.ico
        if (!favicon) {
            const urlObj = new URL(url);
            favicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
        }
        
        const metadata = {
            title: titleMatch ? titleMatch[1].trim() : null,
            description: description,
            favicon: favicon
        };
        
        console.log('✅ Extracted metadata:', metadata);
        return metadata;
        
    } catch (error) {
        console.error('❌ Error fetching metadata for', url, ':', error.message);
        return {
            title: null,
            description: null,
            favicon: null
        };
    }
}

// Middleware
const allowedOrigins = [
    'https://gruju-parent-activity-app.web.app',
    'https://gruju-parent-activity-app.firebaseapp.com',
    'http://localhost:3000', 
    'http://localhost:9000', 
    'http://127.0.0.1:5500', 
    'http://127.0.0.1:9000', 
    'file://', 
    'null'
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());

// Router-level debugging - log ALL requests with activity-related data
app.use((req, res, next) => {
    // Log any request that might create activities
    if (req.method === 'POST' || req.method === 'PUT') {
        if (req.url.includes('/api/activities') || 
            (req.body && (req.body.name || req.body.website_url || req.body.activity_type))) {
            console.log(`🔥 POTENTIAL ACTIVITY REQUEST: ${req.method} ${req.url}`);
            if (req.body) {
                console.log(`   📋 Body keys: ${Object.keys(req.body).join(', ')}`);
                if (req.body.name) console.log(`   📝 Name: ${req.body.name}`);
                if (req.body.website_url) console.log(`   🌐 URL: ${req.body.website_url}`);
                if (req.body.activity_type) console.log(`   🎯 Type: ${req.body.activity_type}`);
            }
        }
    }
    next();
});

// PostgreSQL Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Run database migrations
async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔧 Running database migrations...');
        
        // Migration 1: Add auto_notify_new_connections column to activities table
        try {
            await client.query(`
                ALTER TABLE activities 
                ADD COLUMN IF NOT EXISTS auto_notify_new_connections BOOLEAN DEFAULT false
            `);
            console.log('✅ Migration: Added auto_notify_new_connections column to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: auto_notify_new_connections column already exists');
            } else {
                throw error;
            }
        }

        // Migration 2: Add invited_child_id column to activity_invitations table
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS invited_child_id INTEGER REFERENCES children(id)
            `);
            console.log('✅ Migration: Added invited_child_id column to activity_invitations table');

            // Remove old child_id column if it exists (causes confusion with invited_child_id)
            try {
                await client.query(`
                    ALTER TABLE activity_invitations 
                    DROP COLUMN IF EXISTS child_id
                `);
                console.log('✅ Migration: Removed old child_id column from activity_invitations table');
            } catch (error) {
                console.log('Note: child_id column may not exist or already removed');
            }
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: invited_child_id column already exists');
            } else {
                throw error;
            }
        }

        // Migration 3: Add first_name and last_name columns to children table
        try {
            await client.query(`
                ALTER TABLE children 
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
                ADD COLUMN IF NOT EXISTS last_name VARCHAR(50)
            `);
            console.log('✅ Migration: Added first_name and last_name columns to children table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: first_name and last_name columns already exist');
            } else {
                throw error;
            }
        }

        // Migration 4: Update existing children to split name into first_name and last_name
        try {
            const result = await client.query(`
                UPDATE children 
                SET first_name = SPLIT_PART(name, ' ', 1),
                    last_name = CASE 
                        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
                        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
                        ELSE ''
                    END
                WHERE first_name IS NULL AND name IS NOT NULL
            `);
            console.log(`✅ Migration: Updated ${result.rowCount} existing children with split names`);
        } catch (error) {
            console.log('⚠️ Migration: Could not update existing children names:', error.message);
        }

        // Migration 5: Add viewed_at column to activity_invitations table
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP
            `);
            console.log('✅ Migration: Added viewed_at column to activity_invitations table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: viewed_at column already exists');
            } else {
                throw error;
            }
        }

        // Migration 6: Add status_viewed_at column for tracking when host views status changes
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS status_viewed_at TIMESTAMP
            `);
            console.log('✅ Migration: Added status_viewed_at column to activity_invitations table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: status_viewed_at column already exists');
            } else {
                throw error;
            }
        }

        // Migration 7: Drop username unique constraint if it exists (for existing databases)
        try {
            await client.query(`
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
            `);
            console.log('✅ Migration: Dropped username unique constraint (allows duplicate names)');
        } catch (error) {
            console.log('ℹ️ Migration: Username unique constraint already removed or didn\'t exist');
        }

        // Migration 8: Add phone unique constraint if it doesn't exist
        try {
            await client.query(`
                ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
            `);
            console.log('✅ Migration: Added phone unique constraint');
        } catch (error) {
            if (error.code === '23505' || error.message.includes('already exists')) {
                console.log('ℹ️ Migration: Phone unique constraint already exists');
            } else {
                console.log('ℹ️ Migration: Could not add phone constraint:', error.message);
            }
        }

        // Migration 9: Create pending_activity_invitations table for tracking pending connections per activity
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS pending_activity_invitations (
                    id SERIAL PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    pending_connection_id VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                    UNIQUE(activity_id, pending_connection_id)
                )
            `);
            console.log('✅ Migration: Created pending_activity_invitations table');
        } catch (error) {
            if (error.code === '42P07') {
                console.log('✅ Migration: pending_activity_invitations table already exists');
            } else {
                throw error;
            }
        }

        // Migration 10: Add is_shared column to activities table
        try {
            await client.query(`
                ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false
            `);
            console.log('✅ Migration: Added is_shared column to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: is_shared column already exists');
            } else {
                console.log('ℹ️ Migration: Could not add is_shared column:', error.message);
            }
        }

        // Migration 11: Add UUID columns for security (replace sequential IDs)
        try {
            console.log('🔐 Migration 11: Adding UUID columns for security...');
            await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
            
            // Add UUID columns to all tables (using safer syntax)
            const tables = ['users', 'children', 'activities', 'connections', 'activity_invitations', 'connection_requests', 'pending_activity_invitations'];
            
            for (const table of tables) {
                try {
                    await client.query(`ALTER TABLE ${table} ADD COLUMN uuid UUID DEFAULT uuid_generate_v4()`);
                    console.log(`✅ Added UUID column to ${table}`);
                } catch (err) {
                    if (err.message.includes('already exists')) {
                        console.log(`ℹ️ UUID column already exists in ${table}`);
                    } else {
                        console.log(`⚠️ Error adding UUID to ${table}:`, err.message);
                    }
                }
            }
            
            // Generate UUIDs for existing records that don't have them
            await client.query(`UPDATE users SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE children SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE activities SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE connections SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE activity_invitations SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE connection_requests SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE pending_activity_invitations SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            
            // Add unique constraints on UUID columns (with error handling)
            const constraints = [
                { table: 'users', constraint: 'users_uuid_unique' },
                { table: 'children', constraint: 'children_uuid_unique' },
                { table: 'activities', constraint: 'activities_uuid_unique' },
                { table: 'connections', constraint: 'connections_uuid_unique' },
                { table: 'activity_invitations', constraint: 'activity_invitations_uuid_unique' },
                { table: 'connection_requests', constraint: 'connection_requests_uuid_unique' },
                { table: 'pending_activity_invitations', constraint: 'pending_activity_invitations_uuid_unique' }
            ];
            
            for (const { table, constraint } of constraints) {
                try {
                    await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} UNIQUE (uuid)`);
                    console.log(`✅ Added UUID constraint to ${table}`);
                } catch (err) {
                    if (err.message.includes('already exists')) {
                        console.log(`ℹ️ UUID constraint already exists on ${table}`);
                    } else {
                        console.log(`⚠️ Error adding UUID constraint to ${table}:`, err.message);
                    }
                }
            }
            
            console.log('✅ Migration 11: UUID columns added and populated');
        } catch (error) {
            console.log('ℹ️ Migration 11: UUID setup issue:', error.message);
        }

        // Migration 12: Fix orphaned activities without proper child_id links
        try {
            console.log('🔧 Migration 12: Fixing orphaned activities...');
            
            // Check for activities without valid child_id references
            const orphanedActivities = await client.query(`
                SELECT a.id, a.name, a.child_id
                FROM activities a 
                LEFT JOIN children c ON a.child_id = c.id 
                WHERE c.id IS NULL
            `);
            
            if (orphanedActivities.rows.length > 0) {
                console.log(`⚠️ Found ${orphanedActivities.rows.length} orphaned activities:`, 
                    orphanedActivities.rows.map(a => ({ id: a.id, name: a.name, child_id: a.child_id })));
                
                // For demo data, we can try to link activities based on naming patterns or delete them
                // For now, let's delete orphaned activities as they can't be properly linked
                const deleteResult = await client.query(`
                    DELETE FROM activities 
                    WHERE id NOT IN (
                        SELECT a.id 
                        FROM activities a 
                        JOIN children c ON a.child_id = c.id
                    )
                `);
                console.log(`🗑️ Deleted ${deleteResult.rowCount} orphaned activities`);
            } else {
                console.log('✅ No orphaned activities found');
            }
            
            console.log('✅ Migration 12: Activity cleanup completed');
        } catch (error) {
            console.log('ℹ️ Migration 12: Activity cleanup issue:', error.message);
        }

        // Migration 13: Convert activity_invitations to use UUIDs instead of sequential IDs
        try {
            console.log('🔄 Migration 13: Converting activity_invitations to use UUIDs...');
            
            // Add UUID columns to activity_invitations table
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS activity_uuid UUID,
                ADD COLUMN IF NOT EXISTS invited_child_uuid UUID
            `);
            
            // Update activity_uuid by joining with activities table
            await client.query(`
                UPDATE activity_invitations ai
                SET activity_uuid = a.uuid
                FROM activities a
                WHERE ai.activity_id = a.id AND ai.activity_uuid IS NULL
            `);
            
            // Update invited_child_uuid by joining with children table
            await client.query(`
                UPDATE activity_invitations ai
                SET invited_child_uuid = c.uuid
                FROM children c
                WHERE ai.invited_child_id = c.id AND ai.invited_child_uuid IS NULL
            `);
            
            // Delete any orphaned invitations that couldn't be matched
            const orphanedInvitations = await client.query(`
                DELETE FROM activity_invitations 
                WHERE activity_uuid IS NULL OR invited_child_uuid IS NULL
            `);
            
            if (orphanedInvitations.rowCount > 0) {
                console.log(`🗑️ Deleted ${orphanedInvitations.rowCount} orphaned activity invitations`);
            }
            
            console.log('✅ Migration 13: Activity invitations UUID conversion completed');
        } catch (error) {
            console.log('ℹ️ Migration 13: UUID conversion issue:', error.message);
        }

        // Migration 14: Add parent UUIDs and update invitation system
        try {
            console.log('🔄 Migration 14: Adding parent UUIDs to activity_invitations...');
            
            // Add parent UUID columns to activity_invitations table
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS inviter_parent_uuid UUID,
                ADD COLUMN IF NOT EXISTS invited_parent_uuid UUID
            `);
            
            // Update inviter_parent_uuid by joining with users table
            await client.query(`
                UPDATE activity_invitations ai
                SET inviter_parent_uuid = u.uuid
                FROM users u
                WHERE ai.inviter_parent_id = u.id AND ai.inviter_parent_uuid IS NULL
            `);
            
            // Update invited_parent_uuid by joining with users table
            await client.query(`
                UPDATE activity_invitations ai
                SET invited_parent_uuid = u.uuid
                FROM users u
                WHERE ai.invited_parent_id = u.id AND ai.invited_parent_uuid IS NULL
            `);
            
            console.log('✅ Migration 14: Parent UUIDs added to activity_invitations completed');
        } catch (error) {
            console.log('ℹ️ Migration 14: Parent UUID conversion issue:', error.message);
        }

        // Migration 15: Convert connection_requests to use child UUIDs instead of IDs
        try {
            console.log('🔄 Migration 15: Converting connection_requests to use child UUIDs...');
            
            // Add UUID columns to connection_requests table
            await client.query(`
                ALTER TABLE connection_requests 
                ADD COLUMN IF NOT EXISTS child_uuid UUID,
                ADD COLUMN IF NOT EXISTS target_child_uuid UUID
            `);
            
            // Migrate existing data from child_id to child_uuid
            await client.query(`
                UPDATE connection_requests cr
                SET child_uuid = c.uuid
                FROM children c
                WHERE cr.child_id = c.id AND cr.child_uuid IS NULL
            `);
            
            // Migrate existing data from target_child_id to target_child_uuid (only if target_child_id is not null)
            await client.query(`
                UPDATE connection_requests cr
                SET target_child_uuid = c.uuid
                FROM children c
                WHERE cr.target_child_id = c.id AND cr.target_child_uuid IS NULL
            `);
            
            // Verify migration
            const migratedRequests = await client.query(`
                SELECT COUNT(*) as total,
                       COUNT(child_uuid) as with_child_uuid,
                       COUNT(target_child_uuid) as with_target_child_uuid
                FROM connection_requests
            `);
            
            console.log('📋 Connection requests migration stats:', migratedRequests.rows[0]);
            
            // Now drop the old child_id and target_child_id columns
            await client.query(`
                ALTER TABLE connection_requests 
                DROP COLUMN IF EXISTS child_id,
                DROP COLUMN IF EXISTS target_child_id
            `);
            
            console.log('✅ Migration 15: Converted connection_requests to use UUIDs and removed old ID columns');
        } catch (error) {
            console.log('ℹ️ Migration 15: Connection requests UUID conversion issue:', error.message);
        }

        // Migration 16: Add series_id and other recurring activity fields to activities table
        try {
            await client.query(`
                ALTER TABLE activities 
                ADD COLUMN IF NOT EXISTS series_id VARCHAR(100),
                ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS recurring_days INTEGER[],
                ADD COLUMN IF NOT EXISTS series_start_date DATE
            `);
            console.log('✅ Migration 16: Added series_id and recurring fields to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration 16: Series_id and recurring fields already exist');
            } else {
                throw error;
            }
        }

        // Migration 17: Assign series_id to existing recurring activities (grouped by name and host)
        try {
            const recurringActivities = await client.query(`
                SELECT name, child_id, COUNT(*) as activity_count, 
                       MIN(start_date) as first_date,
                       array_agg(id ORDER BY start_date) as activity_ids
                FROM activities 
                WHERE series_id IS NULL 
                  AND name IN (
                      SELECT name 
                      FROM activities 
                      WHERE series_id IS NULL 
                      GROUP BY name, child_id 
                      HAVING COUNT(*) > 1
                  )
                GROUP BY name, child_id
                HAVING COUNT(*) > 1
                ORDER BY name, child_id
            `);
            
            console.log(`🔄 Migration 17: Found ${recurringActivities.rows.length} recurring activity groups to assign series_id`);
            
            for (const group of recurringActivities.rows) {
                // Generate a series_id for this group
                const seriesId = `migrated_${Date.now()}_${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_${group.child_id}`;
                
                // Update all activities in this group with the same series_id
                const updateResult = await client.query(`
                    UPDATE activities 
                    SET series_id = $1, 
                        is_recurring = true,
                        series_start_date = $2
                    WHERE id = ANY($3)
                `, [seriesId, group.first_date, group.activity_ids]);
                
                console.log(`✅ Migration 17: Assigned series_id "${seriesId}" to ${updateResult.rowCount} "${group.name}" activities`);
            }
            
        } catch (error) {
            console.log('ℹ️ Migration 17: Recurring activities series_id assignment issue:', error.message);
        }
        
        // Migration 18: Add onboarding_completed field to users table
        try {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false
            `);
            console.log('✅ Migration 18: Added onboarding_completed column to users table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration 18: onboarding_completed column already exists');
            } else {
                console.log('ℹ️ Migration 18: Could not add onboarding_completed column:', error.message);
            }
        }
        
        // Migration 19: Add activity_type column to activities table
        try {
            await client.query(`
                ALTER TABLE activities 
                ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50)
            `);
            console.log('✅ Migration 19: Added activity_type column to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration 19: activity_type column already exists');
            } else {
                console.log('ℹ️ Migration 19: Could not add activity_type column:', error.message);
            }
        }
        
        // Migration 20: Create clubs table for storing club information from activities
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS clubs (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    website_url VARCHAR(500),
                    activity_type VARCHAR(50),
                    location VARCHAR(255),
                    cost DECIMAL(10,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(website_url, activity_type)
                )
            `);
            
            // Create index for better performance on filtering
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_clubs_activity_type ON clubs(activity_type)
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_clubs_website_url ON clubs(website_url)
            `);
            
            console.log('✅ Migration 20: Created clubs table and indexes');
        } catch (error) {
            console.log('ℹ️ Migration 20: Could not create clubs table:', error.message);
        }
        
        // Migration 21: Add website metadata fields to clubs table
        try {
            await client.query(`
                ALTER TABLE clubs ADD COLUMN IF NOT EXISTS website_title VARCHAR(500),
                ADD COLUMN IF NOT EXISTS website_description TEXT,
                ADD COLUMN IF NOT EXISTS website_favicon VARCHAR(1000),
                ADD COLUMN IF NOT EXISTS metadata_fetched_at TIMESTAMP
            `);
            
            console.log('✅ Migration 21: Added website metadata columns to clubs table');
        } catch (error) {
            console.log('ℹ️ Migration 21: Could not add website metadata columns:', error.message);
        }

        // Migration 22: Add address fields to users table for parent location information
        try {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(255),
                ADD COLUMN IF NOT EXISTS town_city VARCHAR(100),
                ADD COLUMN IF NOT EXISTS state_province_country VARCHAR(100),
                ADD COLUMN IF NOT EXISTS post_code VARCHAR(20)
            `);
            
            console.log('✅ Migration 22: Added address fields to users table');
        } catch (error) {
            console.log('ℹ️ Migration 22: Could not add address fields:', error.message);
        }

        // Migration 23: Modify clubs table for better deduplication and add usage tracking
        try {
            // Drop the old unique constraint that only included website_url and activity_type
            await client.query(`
                ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_website_url_activity_type_key
            `);
            
            // Add usage tracking columns to clubs table
            await client.query(`
                ALTER TABLE clubs 
                ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS first_used_date DATE,
                ADD COLUMN IF NOT EXISTS last_used_date DATE,
                ADD COLUMN IF NOT EXISTS min_child_age INTEGER,
                ADD COLUMN IF NOT EXISTS max_child_age INTEGER
            `);
            
            // Add new unique constraint that includes location for better deduplication
            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_unique_website_location_type 
                ON clubs (
                    COALESCE(website_url, ''), 
                    COALESCE(location, ''), 
                    activity_type
                )
            `);
            
            console.log('✅ Migration 23: Enhanced clubs table with usage tracking and better deduplication');
        } catch (error) {
            console.log('ℹ️ Migration 23: Could not enhance clubs table:', error.message);
        }

        // Migration 24: Create club usage tracking table for detailed usage history
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS club_usage (
                    id SERIAL PRIMARY KEY,
                    club_id INTEGER NOT NULL REFERENCES clubs(id),
                    activity_id INTEGER NOT NULL REFERENCES activities(id),
                    child_id INTEGER NOT NULL REFERENCES children(id),
                    child_age INTEGER,
                    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    activity_start_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(club_id, activity_id)
                )
            `);
            
            // Create indexes for better performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_club_usage_club_id ON club_usage(club_id)
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_club_usage_date ON club_usage(usage_date)
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_club_usage_activity_date ON club_usage(activity_start_date)
            `);
            
            console.log('✅ Migration 24: Created club_usage table for tracking usage history');
        } catch (error) {
            console.log('ℹ️ Migration 24: Could not create club_usage table:', error.message);
        }

        // Migration 25: Fix club_usage table to properly track activity dates for time-frame analysis
        try {
            // Add activity_start_date column if it doesn't exist
            await client.query(`
                ALTER TABLE club_usage 
                ADD COLUMN IF NOT EXISTS activity_start_date DATE
            `);
            
            // Drop the unique constraint that prevents tracking multiple sessions
            await client.query(`
                ALTER TABLE club_usage 
                DROP CONSTRAINT IF EXISTS club_usage_club_id_activity_id_key
            `);
            
            // Add new constraint that allows multiple entries but prevents exact duplicates
            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_club_usage_unique_entry 
                ON club_usage (club_id, activity_id, child_id, activity_start_date)
            `);
            
            console.log('✅ Migration 25: Fixed club_usage table for proper time-frame tracking');
        } catch (error) {
            console.log('ℹ️ Migration 25: Could not fix club_usage table:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Test database connection
async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to PostgreSQL Database...');
        
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL Database successfully!');
        
        // Test the connection
        await client.query('SELECT NOW()');
        console.log('✅ Database connection test query successful');
        
        client.release();
        
        // Create tables if they don't exist
        // await createTables(client);
        // client.release();

        // Run migrations
        await runMigrations();
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Create database tables
async function createTables(client) {
    try {
        console.log('🔧 Creating database tables...');
        
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20) UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
                is_active BOOLEAN DEFAULT true,
                family_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Children table
        await client.query(`
            CREATE TABLE IF NOT EXISTS children (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                parent_id INTEGER NOT NULL,
                age INTEGER,
                grade VARCHAR(20),
                school VARCHAR(100),
                interests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Activities table
        await client.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                child_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME,
                end_time TIME,
                location VARCHAR(200),
                website_url VARCHAR(500),
                cost DECIMAL(10,2),
                max_participants INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            )
        `);

        // Connection requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS connection_requests (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER NOT NULL,
                target_parent_id INTEGER NOT NULL,
                child_id INTEGER,
                target_child_id INTEGER,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(id),
                FOREIGN KEY (target_parent_id) REFERENCES users(id),
                FOREIGN KEY (child_id) REFERENCES children(id),
                FOREIGN KEY (target_child_id) REFERENCES children(id)
            )
        `);

        // Connections table (updated to match original demo structure)
        await client.query(`
            CREATE TABLE IF NOT EXISTS connections (
                id SERIAL PRIMARY KEY,
                parent1_id INTEGER,
                parent2_id INTEGER,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent1_id) REFERENCES users(id),
                FOREIGN KEY (parent2_id) REFERENCES users(id),
                UNIQUE(parent1_id, parent2_id)
            )
        `);

        // Add child columns if they don't exist (migration)
        try {
            await client.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS child1_id INTEGER`);
            await client.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS child2_id INTEGER`);
            await client.query(`ALTER TABLE connections ADD CONSTRAINT IF NOT EXISTS fk_child1 FOREIGN KEY (child1_id) REFERENCES children(id)`);
            await client.query(`ALTER TABLE connections ADD CONSTRAINT IF NOT EXISTS fk_child2 FOREIGN KEY (child2_id) REFERENCES children(id)`);
        } catch (error) {
            console.log('Migration columns may already exist:', error.message);
        }

        // Activity invitations table
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS activity_invitations (
                    id SERIAL PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    inviter_parent_id INTEGER NOT NULL,
                    invited_parent_id INTEGER NOT NULL,
                    invited_child_id INTEGER,
                    message TEXT,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                    FOREIGN KEY (inviter_parent_id) REFERENCES users(id),
                    FOREIGN KEY (invited_parent_id) REFERENCES users(id),
                    FOREIGN KEY (invited_child_id) REFERENCES children(id)
                )
            `);
            console.log('✅ Activity invitations table created/verified');
        } catch (error) {
            console.log('⚠️ Activity invitations table creation error:', error.message);
        }

        // System logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error')),
                message TEXT NOT NULL,
                user_id INTEGER,
                metadata TEXT,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Insert EXACT users from real Azure SQL database (extracted data)
        const originalDemoUsers = [
            ['admin', 'admin@parentactivityapp.com', '+1555000001', 'super_admin', 'Super Admin'],
            ['manager', 'manager@parentactivityapp.com', '+1555000002', 'admin', 'System Manager'],
            ['johnson', 'johnson@example.com', '', 'user', 'Johnson Family'],
            ['davis', 'davis@example.com', '', 'user', 'Davis Family'],
            ['wong', 'wong@example.com', '', 'user', 'Wong Family'],
            ['thompson', 'thompson@example.com', '', 'user', 'Thompson Family'],
            ['miller', 'joe@example.com', '', 'user', 'Miller Family']
        ];

        for (const [username, email, phone, role, family_name] of originalDemoUsers) {
            const userExists = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
            if (userExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO users (username, email, phone, password_hash, role, family_name)
                        VALUES ($1, $2, $3, '$2a$12$dummy.hash.for.demo.purposes', $4, $5)
                    `, [username, email, phone, role, family_name]);
                    console.log(`✅ Created original demo user: ${username}`);
                } catch (error) {
                    if (error.code !== '23505') { // Ignore duplicate key errors
                        console.error(`Error creating user ${username}:`, error);
                    }
                }
            }
        }

        // Insert demo children if they don't exist
        await insertDemoChildren(client);
        
        // Insert demo activities if they don't exist
        await insertDemoActivities(client);
        
        // Insert demo connections if they don't exist
        // TEMPORARILY DISABLED: await insertDemoConnections(client);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

// Insert original demo children from demo.html
async function insertDemoChildren(client) {
    // Get user IDs dynamically
    const users = await client.query('SELECT id, email FROM users ORDER BY id');
    const userMap = {};
    users.rows.forEach(user => {
        userMap[user.email] = user.id;
    });

    const originalDemoChildren = [
        // EXACT children from real Azure SQL database
        ['Emma Johnson', userMap['johnson@example.com']],
        ['Alex Johnson', userMap['johnson@example.com']],
        ['Jake Davis', userMap['davis@example.com']],
        ['Mia Wong', userMap['wong@example.com']],
        ['Ryan Wong', userMap['wong@example.com']],
        ['Zoe Wong', userMap['wong@example.com']],
        ['Sophie Thompson', userMap['thompson@example.com']],
        ['Oliver Thompson', userMap['thompson@example.com']],
        ['Theodore Miller', userMap['joe@example.com']]
    ];

    for (const [name, parent_id] of originalDemoChildren) {
        if (parent_id) { // Only insert if parent exists
            const childExists = await client.query(`SELECT id FROM children WHERE name = $1 AND parent_id = $2`, [name, parent_id]);
            if (childExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO children (name, parent_id)
                        VALUES ($1, $2)
                    `, [name, parent_id]);
                    console.log(`✅ Created original demo child: ${name}`);
                } catch (error) {
                    console.error(`Error creating child ${name}:`, error.message);
                }
            }
        }
    }
}

// Insert original demo activities from demo.html
async function insertDemoActivities(client) {
    // Get child IDs dynamically
    const children = await client.query('SELECT id, name FROM children ORDER BY id');
    const childMap = {};
    children.rows.forEach(child => {
        childMap[child.name] = child.id;
    });

    // Get current week dates for activities (like original demo.html)
    const today = new Date();
    const currentWeekDates = [];
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
    
    for (let i = 0; i < 7; i++) {
        const weekDay = new Date(startOfWeek);
        weekDay.setDate(startOfWeek.getDate() + i);
        const year = weekDay.getFullYear();
        const month = String(weekDay.getMonth() + 1).padStart(2, '0');
        const day = String(weekDay.getDate()).padStart(2, '0');
        currentWeekDates.push(`${year}-${month}-${day}`);
    }
    
    console.log('🗓️ Generated currentWeekDates:', currentWeekDates);
    console.log(`📅 Soccer Practice will be created for: 2025-08-06 (hardcoded)`);

    const originalDemoActivities = [
        // EXACT activities from real Azure SQL database
        // Emma Johnson's 5 activities
        [childMap['Emma Johnson'], 'Soccer Practice', null, '2025-08-06', null, '17:00:00', '19:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Swimming Lesson', null, currentWeekDates[2], null, '11:00:00', '12:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Art Class', null, currentWeekDates[3], null, '15:00:00', '16:30:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Dance Class', null, currentWeekDates[5], null, '12:00:00', '13:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Tennis Lesson', null, currentWeekDates[6], null, '15:00:00', '16:00:00', null, null, null, null],
        
        // Alex Johnson's 2 activities
        [childMap['Alex Johnson'], 'Piano Lesson', null, currentWeekDates[1], null, '16:30:00', '17:30:00', null, null, null, null],
        [childMap['Alex Johnson'], 'Basketball', null, currentWeekDates[4], null, '10:00:00', '11:30:00', null, null, null, null],
        
        // Other family activities from real Azure SQL
        [childMap['Jake Davis'], 'Football Training', null, currentWeekDates[2], null, '18:00:00', '19:30:00', null, null, null, null],
        [childMap['Theodore Miller'], 'Robotics Club', null, currentWeekDates[1], null, '17:00:00', '19:00:00', null, null, null, null],
        [childMap['Mia Wong'], 'Violin Lessons', null, currentWeekDates[3], null, '16:00:00', '17:00:00', null, null, null, null]
    ];

    for (const [child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants] of originalDemoActivities) {
        const activityExists = await client.query(`SELECT id FROM activities WHERE name = $1 AND child_id = $2`, [name, child_id]);
        if (activityExists.rows.length === 0) {
            try {
                await client.query(`
                    INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants]);
                console.log(`✅ Created demo activity: ${name} for child ${child_id}`);
            } catch (error) {
                console.error(`Error creating activity ${name}:`, error.message);
            }
        }
    }
}

// Insert original demo connections
// TEMPORARILY DISABLED ENTIRE FUNCTION DUE TO SYNTAX ERROR
/*
async function insertDemoConnections(client) {
    // Function body temporarily commented out to fix syntax error
    console.log('Demo connections function is disabled');
}
*/

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log(`🔒 No token provided for ${req.method} ${req.path}`);
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            console.log(`🔒 JWT verification failed for ${req.method} ${req.path}:`, err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        console.log(`✅ Authenticated user ${user.id} (${user.email}) for ${req.method} ${req.path}`);
        next();
    });
}

// Helper function to resolve account user ID for multi-parent support
async function resolveAccountUserId(userUuid) {
    const client = await pool.connect();
    try {
        // First check if this user is a primary parent (their own account)
        const primaryParent = await client.query(
            'SELECT account_uuid FROM parents WHERE uuid = (SELECT uuid FROM users WHERE uuid = $1) AND is_primary = true',
            [userUuid]
        );
        
        if (primaryParent.rows.length > 0) {
            // This is a primary parent - find their user ID
            const userResult = await client.query(
                'SELECT id FROM users WHERE uuid = $1',
                [primaryParent.rows[0].account_uuid]
            );
            return userResult.rows[0]?.id;
        }
        
        // Check if this user is an additional parent
        const additionalParent = await client.query(
            'SELECT account_uuid FROM parents WHERE uuid = (SELECT uuid FROM users WHERE uuid = $1) AND is_primary = false',
            [userUuid]
        );
        
        if (additionalParent.rows.length > 0) {
            // This is an additional parent - find the account user ID
            const accountResult = await client.query(
                'SELECT id FROM users WHERE uuid = $1',
                [additionalParent.rows[0].account_uuid]
            );
            return accountResult.rows[0]?.id;
        }
        
        // Fallback: this user is not in parents table (legacy user)
        const legacyUser = await client.query(
            'SELECT id FROM users WHERE uuid = $1',
            [userUuid]
        );
        return legacyUser.rows[0]?.id;
        
    } finally {
        client.release();
    }
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Super admin middleware
function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
}

// Logging function
async function logActivity(level, message, userId = null, metadata = null, req = null) {
    try {
        const client = await pool.connect();
        await client.query(`
            INSERT INTO system_logs (level, message, user_id, metadata, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [level, message, userId, metadata ? JSON.stringify(metadata) : null, req ? req.ip : null, req ? req.get('User-Agent') : null]);
        client.release();
    } catch (error) {
        console.error('Logging error:', error);
    }
}

// Health check endpoint
// Migration endpoint to fix existing activities
app.post('/api/admin/migrate-is-shared', async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Update activities that have auto_notify_new_connections = true
        const autoNotifyResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE auto_notify_new_connections = true AND (is_shared = false OR is_shared IS NULL)
        `);
        
        // Update activities that have pending invitations
        const pendingInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT pai.activity_id 
                FROM pending_activity_invitations pai
            ) AND (is_shared = false OR is_shared IS NULL)
        `);
        
        // Update activities that have actual invitations
        const actualInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT ai.activity_id 
                FROM activity_invitations ai
            ) AND (is_shared = false OR is_shared IS NULL)
        `);
        
        client.release();
        
        res.json({
            success: true,
            message: 'Migration completed',
            results: {
                auto_notify_activities: autoNotifyResult.rowCount,
                pending_invitations_activities: pendingInvitesResult.rowCount,
                actual_invitations_activities: actualInvitesResult.rowCount,
                total_updated: autoNotifyResult.rowCount + pendingInvitesResult.rowCount + actualInvitesResult.rowCount
            }
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: 'Migration failed' });
    }
});

// Migration endpoint to add host_cant_attend field
app.post('/api/admin/migrate-host-cant-attend', async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Add host_cant_attend column if it doesn't exist
        await client.query(`
            ALTER TABLE activities 
            ADD COLUMN IF NOT EXISTS host_cant_attend BOOLEAN DEFAULT FALSE
        `);
        
        client.release();
        res.json({ 
            success: true, 
            message: 'Added host_cant_attend field to activities table'
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: 'Migration failed' });
    }
});

app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        res.json({
            status: 'OK',
            message: 'SMS & Email Backend with PostgreSQL Database is running',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database status endpoint
app.get('/database/status', async (req, res) => {
    try {
        const client = await pool.connect();
        
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        const childCount = await client.query('SELECT COUNT(*) as count FROM children');
        const activityCount = await client.query('SELECT COUNT(*) as count FROM activities');
        const connectionCount = await client.query('SELECT COUNT(*) as count FROM connections');
        
        client.release();
        
        res.json({
            success: true,
            status: 'connected',
            message: 'Database is connected and operational',
            data: {
                connectionStatus: 'connected',
                currentMode: 'production',
                type: 'PostgreSQL Database',
                userCount: parseInt(userCount.rows[0].count),
                childCount: parseInt(childCount.rows[0].count),
                activityCount: parseInt(activityCount.rows[0].count),
                connectionCount: parseInt(connectionCount.rows[0].count),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            success: false,
            status: 'error',
            message: 'Database connection failed',
            data: {
                connectionStatus: 'disconnected',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// ===== AUTHENTICATION ENDPOINTS =====

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email/phone and password required' });
        }

        const client = await pool.connect();
        let result;
        
        // Check if input looks like a phone number (contains digits and possibly + or -)
        const isPhoneNumber = /^[\+\-\d\s\(\)]+$/.test(email.replace(/\s/g, ''));
        
        if (isPhoneNumber) {
            // Login with phone number - try exact match first, then with country code variations
            const cleanPhone = email.replace(/[\s\(\)\-]/g, ''); // Remove spaces, parentheses, dashes
            
            // Try multiple phone format variations
            const phoneVariations = [
                cleanPhone,
                cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
                cleanPhone.startsWith('+44') ? cleanPhone.replace('+44', '0') : cleanPhone,
                cleanPhone.startsWith('0') && !cleanPhone.startsWith('+') ? `+44${cleanPhone.substring(1)}` : cleanPhone
            ];
            
            console.log('📞 Attempting phone login with variations:', phoneVariations);
            
            for (const phoneVar of phoneVariations) {
                result = await client.query('SELECT * FROM users WHERE phone = $1 AND is_active = true', [phoneVar]);
                if (result.rows.length > 0) {
                    console.log(`✅ Phone login successful with format: ${phoneVar}`);
                    break;
                }
            }
        } else {
            // Login with email - case insensitive
            result = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true', [email]);
            console.log(`📧 Email login attempt for: ${email} (case insensitive)`);
        }

        if (result.rows.length === 0) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            client.release();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        // Verify password against stored hash
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            client.release();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // ✅ SECURITY: Use UUID in JWT instead of sequential ID
        const token = jwt.sign(
            { 
                id: user.id, // Keep sequential ID for backward compatibility in JWT
                uuid: user.uuid, // Add UUID for future use
                email: user.email, 
                role: user.role,
                username: user.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity('info', `User logged in: ${email}`, user.id, null, req);
        client.release();

        // ✅ SECURITY: Only return UUID in response, not sequential ID
        res.json({
            success: true,
            token,
            user: {
                uuid: user.uuid,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                family_name: user.family_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        await logActivity('error', `Login error: ${error.message}`, null, null, req);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, phone, password, family_name } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Username, email, and password required' });
        }

        const client = await pool.connect();
        
        // Check if email already exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(400).json({ success: false, error: 'An account with this email address already exists' });
        }

        // Check if phone number already exists (if provided)
        if (phone) {
            const existingPhone = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (existingPhone.rows.length > 0) {
                client.release();
                return res.status(400).json({ success: false, error: 'An account with this phone number already exists' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await client.query(`
            INSERT INTO users (username, email, phone, password_hash, family_name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, uuid, username, email, phone, role, family_name
        `, [username, email, phone, hashedPassword, family_name]);

        const newUser = result.rows[0];
        
        // Create primary parent record for the new user
        // This is required for resolveAccountUserId to work properly
        await client.query(`
            INSERT INTO parents (uuid, account_uuid, username, email, phone, role, is_primary)
            VALUES ($1, $2, $3, $4, $5, 'parent', true)
        `, [newUser.uuid, newUser.uuid, newUser.username, newUser.email, newUser.phone]);
        
        console.log(`✅ Created primary parent record for new user: ${newUser.email}`);
        
        // ===== SKELETON ACCOUNT MERGING =====
        // Check for skeleton accounts matching this email or phone and merge them
        await mergeSkeletonAccounts(client, newUser, email, phone);
        
        const token = jwt.sign(
            { 
                id: newUser.id, // Keep for backward compatibility during migration
                uuid: newUser.uuid, // Add UUID for secure authorization
                email: newUser.email, 
                role: newUser.role,
                username: newUser.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity('info', `New user registered: ${email}`, newUser.id, null, req);
        client.release();

        res.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                uuid: newUser.uuid,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                family_name: newUser.family_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        await logActivity('error', `Registration error: ${error.message}`, null, null, req);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// Auth verification endpoint
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT uuid, username, email, phone, role, family_name FROM users WHERE id = $1 AND is_active = true', [req.user.id]);
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Auth verify error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const client = await pool.connect();
        const user = await client.query('SELECT id, username FROM users WHERE email = $1 AND is_active = true', [email]);
        client.release();

        if (user.rows.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with this email exists, password reset instructions have been sent.'
            });
        }

        await logActivity('info', `Password reset requested for ${email}`, user.rows[0].id, null, req);

        res.json({
            success: true,
            message: 'If an account with this email exists, password reset instructions have been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process password reset request' });
    }
});

// Profile management endpoints
// Get current user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT id, username, email, phone, address_line_1, town_city, state_province_country, post_code, created_at, updated_at, onboarding_completed FROM users WHERE id = $1',
            [req.user.id]
        );
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, phone, address_line_1, town_city, state_province_country, post_code, onboarding_completed } = req.body;

        // Validate input
        if (!username || !email || !phone) {
            return res.status(400).json({ error: 'Username, email, and phone are required' });
        }

        const client = await pool.connect();
        
        // Check if email or phone already exists for another user
        const existingUser = await client.query(
            'SELECT id FROM users WHERE (email = $1 OR phone = $2) AND id != $3',
            [email, phone, req.user.id]
        );

        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(409).json({ error: 'Email or phone number already exists' });
        }

        // Update user - include address fields and onboarding_completed if provided
        const updateFields = ['username = $1', 'email = $2', 'phone = $3', 'updated_at = NOW()'];
        const updateValues = [username, email, phone];
        
        // Add address fields if provided
        if (address_line_1 !== undefined) {
            updateFields.push(`address_line_1 = $${updateValues.length + 1}`);
            updateValues.push(address_line_1 || null);
        }
        
        if (town_city !== undefined) {
            updateFields.push(`town_city = $${updateValues.length + 1}`);
            updateValues.push(town_city || null);
        }
        
        if (state_province_country !== undefined) {
            updateFields.push(`state_province_country = $${updateValues.length + 1}`);
            updateValues.push(state_province_country || null);
        }
        
        if (post_code !== undefined) {
            updateFields.push(`post_code = $${updateValues.length + 1}`);
            updateValues.push(post_code || null);
        }
        
        if (onboarding_completed !== undefined) {
            updateFields.push(`onboarding_completed = $${updateValues.length + 1}`);
            updateValues.push(onboarding_completed);
        }
        
        updateValues.push(req.user.id);
        
        await client.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`,
            updateValues
        );

        // Get updated user data
        const updatedUser = await client.query(
            'SELECT id, username, email, phone, address_line_1, town_city, state_province_country, post_code, created_at, updated_at, onboarding_completed FROM users WHERE id = $1',
            [req.user.id]
        );
        
        client.release();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password endpoint  
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    console.log('🔒 Change password endpoint hit');
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const client = await pool.connect();
        
        // Get current user with password hash
        const userResult = await client.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        console.log('🔒 Verifying current password for user:', req.user.id);
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        console.log('🔒 Current password valid:', isCurrentPasswordValid);
        
        if (!isCurrentPasswordValid) {
            client.release();
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        console.log('🔒 Hashing new password');
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        console.log('🔒 New password hash generated');

        // Update password
        console.log('🔒 Updating password in database for user:', req.user.id);
        const updateResult = await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        console.log('🔒 Password update result:', updateResult.rowCount, 'rows affected');

        // Verify the update worked
        const verifyResult = await client.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        console.log('🔒 Password was actually updated:', verifyResult.rows[0].password_hash !== user.password_hash);
        
        client.release();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Parent management endpoints
// Get all parents for current account
app.get('/api/parents', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const currentUserUuid = req.user.uuid;
        
        console.log(`🔍 GET /api/parents - User UUID: ${currentUserUuid}`);
        
        // Get all parents for the current account (including the primary parent)
        const result = await client.query(`
            SELECT 
                uuid,
                account_uuid,
                username,
                email,
                phone,
                is_primary,
                role,
                created_at,
                updated_at
            FROM parents 
            WHERE account_uuid = $1
            ORDER BY is_primary DESC, created_at ASC
        `, [currentUserUuid]);
        
        client.release();
        
        console.log(`📋 Found ${result.rows.length} parents for account`);
        res.json({ 
            success: true, 
            data: result.rows 
        });
        
    } catch (error) {
        console.error('Get parents error:', error);
        res.status(500).json({ success: false, error: 'Failed to get parents' });
    }
});

// Create new parent for current account
app.post('/api/parents', authenticateToken, async (req, res) => {
    try {
        const { username, email, phone, password, role = 'parent' } = req.body;
        const currentUserUuid = req.user.uuid;
        
        console.log(`📝 POST /api/parents - Creating parent for account: ${currentUserUuid}`);
        
        // Validate required fields
        if (!username || !email || !phone || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, email, phone, and password are required' 
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 6 characters long' 
            });
        }
        
        // Validate role
        const validRoles = ['parent', 'guardian', 'caregiver'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid role. Must be parent, guardian, or caregiver' 
            });
        }
        
        const client = await pool.connect();
        
        try {
            // Start transaction
            await client.query('BEGIN');
            
            // Check if email already exists in users table (global check)
            const existingUser = await client.query(`
                SELECT uuid FROM users WHERE email = $1
            `, [email]);
            
            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ 
                    success: false, 
                    error: 'An account with this email already exists' 
                });
            }
            
            // Check if email already exists for this account in parents table
            const existingParent = await client.query(`
                SELECT uuid FROM parents 
                WHERE account_uuid = $1 AND email = $2
            `, [currentUserUuid, email]);
            
            if (existingParent.rows.length > 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ 
                    success: false, 
                    error: 'A parent with this email already exists for this account' 
                });
            }
            
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Create new user account for the parent
            const userResult = await client.query(`
                INSERT INTO users (username, email, phone, password_hash, role)
                VALUES ($1, $2, $3, $4, 'user')
                RETURNING uuid, username, email, phone, role, created_at, updated_at
            `, [username, email, phone, hashedPassword]);
            
            const newUser = userResult.rows[0];
            
            // Create parent record linked to the account
            const parentResult = await client.query(`
                INSERT INTO parents (uuid, account_uuid, username, email, phone, role, is_primary)
                VALUES ($1, $2, $3, $4, $5, $6, false)
                RETURNING uuid, account_uuid, username, email, phone, is_primary, role, created_at, updated_at
            `, [newUser.uuid, currentUserUuid, username, email, phone, role]);
            
            // Commit transaction
            await client.query('COMMIT');
            client.release();
            
            const newParent = parentResult.rows[0];
            console.log(`✅ Created parent: ${newParent.uuid} and user account for account: ${currentUserUuid}`);
            
            res.json({ 
                success: true, 
                data: newParent,
                message: 'Parent added successfully! They can now log in with their email and password.' 
            });
            
        } catch (transactionError) {
            await client.query('ROLLBACK');
            client.release();
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Create parent error:', error);
        res.status(500).json({ success: false, error: 'Failed to create parent' });
    }
});

// Update parent information
app.put('/api/parents/:parentUuid', authenticateToken, async (req, res) => {
    try {
        const { parentUuid } = req.params;
        const { username, email, phone, role } = req.body;
        const currentUserUuid = req.user.uuid;
        
        console.log(`🔄 PUT /api/parents/${parentUuid} - Updating parent`);
        
        // Validate role if provided
        if (role) {
            const validRoles = ['parent', 'guardian', 'caregiver'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid role. Must be parent, guardian, or caregiver' 
                });
            }
        }
        
        const client = await pool.connect();
        
        // Verify parent belongs to current account
        const parentCheck = await client.query(`
            SELECT uuid, is_primary FROM parents 
            WHERE uuid = $1 AND account_uuid = $2
        `, [parentUuid, currentUserUuid]);
        
        if (parentCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Parent not found or not authorized' 
            });
        }
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (username) {
            updates.push(`username = $${paramCount++}`);
            values.push(username);
        }
        if (email) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (phone) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (role) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        
        if (updates.length === 0) {
            client.release();
            return res.status(400).json({ 
                success: false, 
                error: 'No fields to update' 
            });
        }
        
        // Add WHERE clause parameters
        values.push(parentUuid);
        values.push(currentUserUuid);
        
        const updateQuery = `
            UPDATE parents 
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE uuid = $${paramCount++} AND account_uuid = $${paramCount++}
            RETURNING uuid, account_uuid, username, email, phone, is_primary, role, created_at, updated_at
        `;
        
        const result = await client.query(updateQuery, values);
        client.release();
        
        console.log(`✅ Updated parent: ${parentUuid}`);
        
        res.json({ 
            success: true, 
            data: result.rows[0],
            message: 'Parent updated successfully' 
        });
        
    } catch (error) {
        console.error('Update parent error:', error);
        res.status(500).json({ success: false, error: 'Failed to update parent' });
    }
});

// Delete parent from account
app.delete('/api/parents/:parentUuid', authenticateToken, async (req, res) => {
    try {
        const { parentUuid } = req.params;
        const currentUserUuid = req.user.uuid;
        
        console.log(`🗑️ DELETE /api/parents/${parentUuid} - Removing parent`);
        
        const client = await pool.connect();
        
        // Verify parent belongs to current account and is not primary
        const parentCheck = await client.query(`
            SELECT uuid, is_primary, username FROM parents 
            WHERE uuid = $1 AND account_uuid = $2
        `, [parentUuid, currentUserUuid]);
        
        if (parentCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Parent not found or not authorized' 
            });
        }
        
        const parent = parentCheck.rows[0];
        if (parent.is_primary) {
            client.release();
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete primary account holder' 
            });
        }
        
        // Delete the parent
        const result = await client.query(`
            DELETE FROM parents 
            WHERE uuid = $1 AND account_uuid = $2 AND is_primary = false
            RETURNING username
        `, [parentUuid, currentUserUuid]);
        
        client.release();
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Failed to delete parent' 
            });
        }
        
        console.log(`✅ Deleted parent: ${parentUuid} (${result.rows[0].username})`);
        
        res.json({ 
            success: true, 
            message: `Parent ${result.rows[0].username} removed successfully` 
        });
        
    } catch (error) {
        console.error('Delete parent error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete parent' });
    }
});

// Children endpoints
app.get('/api/children', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 GET /api/children - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const client = await pool.connect();
        // ✅ SECURITY: Return only UUID, no sequential IDs
        const result = await client.query(
            `SELECT c.uuid, c.name, c.first_name, c.last_name, c.age, c.grade, c.school, c.interests, c.created_at, c.updated_at,
             CASE 
                WHEN c.first_name IS NOT NULL AND c.last_name IS NOT NULL AND c.last_name != '' 
                THEN CONCAT(c.first_name, ' ', c.last_name)
                WHEN c.first_name IS NOT NULL 
                THEN c.first_name
                ELSE c.name 
             END as display_name
             FROM children c WHERE c.parent_id = $1 ORDER BY c.created_at DESC`,
            [accountUserId]
        );
        client.release();

        console.log(`✅ Found ${result.rows.length} children for account user ID ${accountUserId}`);
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch children' });
    }
});

app.post('/api/children', authenticateToken, async (req, res) => {
    try {
        const { name, first_name, last_name, age, grade, school, interests } = req.body;

        // Handle both old (name) and new (first_name/last_name) formats
        let firstName, lastName, fullName;
        
        if (first_name || last_name) {
            firstName = first_name?.trim() || '';
            lastName = last_name?.trim() || '';
            fullName = `${firstName} ${lastName}`.trim();
        } else if (name) {
            // Legacy support: split name into first and last
            const nameParts = name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            fullName = name.trim();
        } else {
            return res.status(400).json({ success: false, error: 'Child name is required' });
        }

        if (!firstName) {
            return res.status(400).json({ success: false, error: 'First name is required' });
        }

        console.log(`🔍 POST /api/children - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for child creation: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields with UUID
        const result = await client.query(
            'INSERT INTO children (name, first_name, last_name, parent_id, age, grade, school, interests) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING uuid, name, first_name, last_name, age, grade, school, interests, created_at, updated_at',
            [fullName, firstName, lastName, accountUserId, age, grade, school, interests]
        );
        client.release();

        console.log(`✅ Created child: ${fullName} for account user ID ${accountUserId}`);
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create child error:', error);
        res.status(500).json({ success: false, error: 'Failed to create child' });
    }
});

app.delete('/api/children/:id', authenticateToken, async (req, res) => {
    try {
        const childUuid = req.params.id; // Now expecting UUID instead of sequential ID
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Check if the child belongs to this user using UUID
        const child = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [childUuid, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        // ✅ SECURITY: Delete child using UUID (activities will be deleted by CASCADE)
        await client.query('DELETE FROM children WHERE uuid = $1', [childUuid]);
        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete child error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete child' });
    }
});

// Edit child endpoint
app.put('/api/children/:childUuid', authenticateToken, async (req, res) => {
    try {
        const childUuid = req.params.childUuid;
        const { name, first_name, last_name, age, grade, school, interests } = req.body;

        // Handle both old (name) and new (first_name/last_name) formats
        let firstName, lastName, fullName;
        
        if (first_name !== undefined || last_name !== undefined) {
            firstName = first_name?.trim() || '';
            lastName = last_name?.trim() || '';
            fullName = `${firstName} ${lastName}`.trim();
        } else if (name) {
            // Legacy support: split name into first and last
            const nameParts = name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            fullName = name.trim();
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Check if the child belongs to this user using UUID
        const childCheck = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [childUuid, req.user.id]
        );

        if (childCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found or access denied' });
        }

        const childId = childCheck.rows[0].id;

        // Build dynamic update query based on provided fields
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (fullName) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(fullName);
            paramIndex++;
        }
        
        if (firstName !== undefined) {
            updateFields.push(`first_name = $${paramIndex}`);
            updateValues.push(firstName);
            paramIndex++;
        }
        
        if (lastName !== undefined) {
            updateFields.push(`last_name = $${paramIndex}`);
            updateValues.push(lastName);
            paramIndex++;
        }

        if (age !== undefined) {
            updateFields.push(`age = $${paramIndex}`);
            updateValues.push(age);
            paramIndex++;
        }

        if (grade !== undefined) {
            updateFields.push(`grade = $${paramIndex}`);
            updateValues.push(grade);
            paramIndex++;
        }

        if (school !== undefined) {
            updateFields.push(`school = $${paramIndex}`);
            updateValues.push(school);
            paramIndex++;
        }

        if (interests !== undefined) {
            updateFields.push(`interests = $${paramIndex}`);
            updateValues.push(interests);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            client.release();
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);
        
        // Add WHERE clause parameters
        updateValues.push(childId);
        const whereClause = `id = $${paramIndex}`;

        const updateQuery = `
            UPDATE children 
            SET ${updateFields.join(', ')} 
            WHERE ${whereClause}
            RETURNING uuid, name, first_name, last_name, age, grade, school, interests, created_at, updated_at
        `;

        console.log('🔄 Updating child:', { childUuid, updateFields, updateValues });

        const result = await client.query(updateQuery, updateValues);
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update child error:', error);
        res.status(500).json({ success: false, error: 'Failed to update child' });
    }
});

// Activities endpoints

// Update endpoint that frontend expects - PUT /api/activities/:uuid (must be before GET route)
app.put('/api/activities/:activityId', authenticateToken, async (req, res) => {
    console.log(`🚀 PUT /api/activities/${req.params.activityId} - Direct endpoint hit`);
    try {
        const { activityId } = req.params;
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, activity_type } = req.body;
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity belongs to this user using UUID
        const activityCheck = await client.query(
            'SELECT a.id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1 AND c.parent_id = $2',
            [activityId, req.user.id]
        );
        
        if (activityCheck.rows.length === 0) {
            // Check if this is a child UUID - if so, create new activity
            const childCheck = await client.query(
                'SELECT c.id FROM children c WHERE c.uuid = $1 AND c.parent_id = $2',
                [activityId, req.user.id]
            );
            
            if (childCheck.rows.length > 0) {
                // Create new activity for this child
                console.log('🔍 Creating new activity for child UUID:', activityId);
                
                // Convert empty strings to null for time fields  
                const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
                const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
                const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
                const processedCost = cost !== null && cost !== undefined && cost !== '' ? parseFloat(cost) : null;
                const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;
                const processedAutoNotify = auto_notify_new_connections !== undefined ? auto_notify_new_connections : false;
                const processedIsShared = is_shared !== undefined ? is_shared : true;
                
                const createResult = await client.query(
                    `INSERT INTO activities (uuid, child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, activity_type, created_at, updated_at)
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
                     RETURNING id, uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, activity_type, created_at, updated_at`,
                    [childCheck.rows[0].id, name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, processedAutoNotify, processedIsShared, activity_type || null]
                );
                
                console.log('🚨 PUT ENDPOINT: Activity created, checking club logic');
                
                // Call club usage function 
                const activityDbId = createResult.rows[0].id;
                await createOrUpdateClubUsage(
                    client, 
                    activityDbId, 
                    name, 
                    website_url, 
                    activity_type, 
                    location, 
                    start_date, 
                    processedCost
                );
                
                // Create or update club record if activity has website URL and activity type
                if (website_url && website_url.trim() && activity_type && activity_type.trim()) {
                    console.log('✅ CLUB DEBUG PUT: Conditions met, entering club logic');
                    try {
                        const clubData = {
                            name: name.trim(),
                            description: description || null,
                            website_url: website_url.trim(),
                            activity_type: activity_type.trim(),
                            location: location || null,
                            cost: processedCost
                        };
                        
                        console.log('🏢 PUT Club creation check for:', { 
                            website_url: clubData.website_url, 
                            location: clubData.location, 
                            activity_type: clubData.activity_type 
                        });
                        
                        // Check if club already exists
                        const existingClub = await client.query(`
                            SELECT id FROM clubs 
                            WHERE COALESCE(website_url, '') = COALESCE($1, '') 
                            AND COALESCE(location, '') = COALESCE($2, '') 
                            AND activity_type = $3
                        `, [clubData.website_url, clubData.location, clubData.activity_type]);
                        
                        let clubId;
                        if (existingClub.rows.length === 0) {
                            // Fetch website metadata
                            const metadata = await fetchWebsiteMetadata(clubData.website_url);
                            
                            // Get child age for tracking
                            const childAge = await client.query('SELECT age FROM children WHERE id = $1', [childCheck.rows[0].id]);
                            const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                            
                            // Create new club record
                            const newClubResult = await client.query(`
                                INSERT INTO clubs (
                                    name, description, website_url, activity_type, location, cost, 
                                    website_title, website_description, website_favicon, metadata_fetched_at,
                                    usage_count, first_used_date, last_used_date, 
                                    min_child_age, max_child_age, created_at, updated_at
                                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 1, CURRENT_DATE, CURRENT_DATE, $10, $10, NOW(), NOW())
                                RETURNING id
                            `, [
                                clubData.name, clubData.description, clubData.website_url, clubData.activity_type, 
                                clubData.location, clubData.cost, metadata.title, metadata.description, metadata.favicon,
                                currentChildAge
                            ]);
                            clubId = newClubResult.rows[0].id;
                            console.log('✅ PUT Created club record:', clubData.name, 'for', clubData.activity_type);
                        } else {
                            clubId = existingClub.rows[0].id;
                            
                            // Update usage stats
                            const childAge = await client.query('SELECT age FROM children WHERE id = $1', [childCheck.rows[0].id]);
                            const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                            
                            await client.query(`
                                UPDATE clubs SET 
                                    name = $1, description = $2, location = $3, cost = $4, updated_at = NOW(),
                                    usage_count = usage_count + 1, last_used_date = CURRENT_DATE,
                                    first_used_date = COALESCE(first_used_date, CURRENT_DATE)
                                WHERE id = $5
                            `, [clubData.name, clubData.description, clubData.location, clubData.cost, clubId]);
                            console.log('✅ PUT Updated club usage:', clubData.name, 'for', clubData.activity_type);
                        }
                        
                        // Record detailed usage in club_usage table
                        try {
                            const childAge = await client.query('SELECT age FROM children WHERE id = $1', [childCheck.rows[0].id]);
                            const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                            
                            await client.query(`
                                INSERT INTO club_usage (club_id, activity_id, child_id, child_age, usage_date, activity_start_date)
                                VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                                ON CONFLICT (club_id, activity_id, child_id, activity_start_date) DO UPDATE SET
                                    child_age = EXCLUDED.child_age,
                                    usage_date = EXCLUDED.usage_date
                            `, [clubId, createResult.rows[0].id, childCheck.rows[0].id, currentChildAge, start_date]);
                            
                            console.log('📊 PUT Recorded club usage for tracking');
                        } catch (usageError) {
                            console.error('⚠️ PUT Error recording club usage:', usageError);
                        }
                    } catch (clubError) {
                        console.error('❌ CLUB DEBUG PUT: Error in club creation/update:', clubError);
                    }
                } else {
                    console.log('❌ CLUB DEBUG PUT: Conditions NOT met, skipping club logic');
                    console.log('   website_url check:', website_url && website_url.trim());
                    console.log('   activity_type check:', activity_type && activity_type.trim());
                }
                
                client.release();
                return res.json({ success: true, data: createResult.rows[0] });
            } else {
                client.release();
                return res.status(404).json({ success: false, error: 'Activity not found' });
            }
        }
        
        // Convert empty strings to null for time fields  
        const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
        const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
        const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
        const processedCost = cost !== null && cost !== undefined && cost !== '' ? parseFloat(cost) : null;
        const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;
        const processedAutoNotify = auto_notify_new_connections !== undefined ? auto_notify_new_connections : false;
        const processedIsShared = is_shared !== undefined ? is_shared : true;
        
        // ✅ SECURITY: Update using UUID and return minimal data
        const result = await client.query(
            `UPDATE activities SET 
                name = $1, description = $2, start_date = $3, end_date = $4, 
                start_time = $5, end_time = $6, location = $7, website_url = $8, 
                cost = $9, max_participants = $10, auto_notify_new_connections = $11, 
                is_shared = $12, updated_at = NOW()
             WHERE uuid = $13 RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, updated_at`,
            [name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, processedAutoNotify, processedIsShared, activityId]
        );
        
        client.release();
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to update activity' });
    }
});

app.get('/api/activities/:childId', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const childUuid = req.params.childId;
        
        console.log('🔍 GET /api/activities/:childId Debug:', {
            childUuid,
            userId: req.user.id,
            userEmail: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        // Query activities with invitation status from database
        const client = await pool.connect();
        
        try {
            // ✅ SECURITY: First get the child's sequential ID from UUID for authorization using parent UUID
            const childResult = await client.query(
                'SELECT c.id FROM children c JOIN users u ON c.parent_id = u.id WHERE c.uuid = $1 AND u.uuid = $2',
                [childUuid, req.user.uuid]
            );
            
            if (childResult.rows.length === 0) {
                client.release();
                return res.status(404).json({ success: false, error: 'Child not found' });
            }
            
            const childId = childResult.rows[0].id;
            
            // Get activities for the child with invitation status
            const query = `
                SELECT 
                    -- ✅ SECURITY: Return UUID instead of sequential ID
                    a.uuid as activity_uuid,
                    a.name,
                    a.description,
                    a.start_date,
                    a.end_date,
                    a.start_time,
                    a.end_time,
                    a.location,
                    a.website_url,
                    a.cost,
                    a.max_participants,
                    a.auto_notify_new_connections,
                    a.created_at,
                    a.updated_at,
                    ai.status as invitation_status,
                    ai.inviter_parent_id,
                    a.is_shared,
                    CASE 
                        WHEN ai.invited_parent_id = $2 THEN false 
                        ELSE true 
                    END as is_host,
                    false as is_cancelled,
                    -- Simple status change notification count
                    COALESCE((SELECT COUNT(*) FROM activity_invitations ai_status 
                     WHERE ai_status.activity_id = a.id 
                     AND ai_status.inviter_parent_id = $2 
                     AND ai_status.status IN ('accepted', 'rejected')
                     AND ai_status.status_viewed_at IS NULL 
                     AND ai_status.updated_at > ai_status.created_at), 0) as unviewed_status_changes,
                    -- Get distinct statuses for unviewed changes
                    (SELECT string_agg(DISTINCT ai_status.status, ',') FROM activity_invitations ai_status 
                     WHERE ai_status.activity_id = a.id 
                     AND ai_status.inviter_parent_id = $2 
                     AND ai_status.status IN ('accepted', 'rejected')
                     AND ai_status.status_viewed_at IS NULL 
                     AND ai_status.updated_at > ai_status.created_at) as unviewed_statuses
                FROM activities a
                LEFT JOIN activity_invitations ai ON a.id = ai.activity_id 
                    AND ai.invited_parent_id = $2
                WHERE a.child_id = $1
                ORDER BY a.start_date, a.start_time
            `;
            
            const result = await client.query(query, [childId, req.user.id]);
            
            // Process activities to add proper invitation status and pending connections
            const activities = await Promise.all(result.rows.map(async (activity) => {
                // Get pending connections for this activity
                const pendingQuery = `
                    SELECT pending_connection_id
                    FROM pending_activity_invitations 
                    WHERE activity_id = (
                        SELECT id FROM activities WHERE uuid = $1
                    )
                `;
                
                const pendingResult = await client.query(pendingQuery, [activity.activity_uuid]);
                const pendingConnections = pendingResult.rows.map(row => row.pending_connection_id);
                
                return {
                    ...activity,
                    invitation_status: activity.invitation_status || 'none',
                    is_shared: activity.is_shared, // Use the value from the query
                    is_host: activity.is_host, // Use the value from the query
                    is_cancelled: false,
                    pending_connections: pendingConnections // Add pending connections
                };
            }));
            
            console.log('🎯 Retrieved activities from database:', activities.length);
            
            res.json({
                success: true,
                data: activities
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activities' });
    }
});

function getDateForWeekday(currentDate, targetDay) {
    // targetDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const current = new Date(currentDate);
    const currentDay = current.getDay();
    const daysUntilTarget = targetDay - currentDay;
    
    // If the target day is in the past this week, get next week's occurrence
    const adjustedDays = daysUntilTarget < 0 ? daysUntilTarget + 7 : daysUntilTarget;
    
    current.setDate(current.getDate() + adjustedDays);
    return current;
}

app.post('/api/activities/:childId', authenticateToken, async (req, res) => {
    console.log(`🚀 POST /api/activities/${req.params.childId} - Direct endpoint hit`);
    console.log('🚨 ACTIVITY CREATION ENDPOINT HIT!');
    console.log('🚨 Child ID:', req.params.childId);
    console.log('🚨 User ID:', req.user?.id);
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const childUuid = req.params.childId;
        
        // console.log('🎯 Activity creation request received:');
        // console.log('🔍 Child UUID (from params):', childUuid);
        // console.log('🔍 User ID:', req.user.id);
        // console.log('🔍 Request body keys:', Object.keys(req.body));
        // console.log('🔍 joint_host_children in request:', req.body.joint_host_children);
        
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, joint_host_children, series_id, is_recurring, recurring_days, series_start_date, activity_type } = req.body;

        // console.log('🔍 joint_host_children after destructuring:', joint_host_children);

        if (!name || !name.trim() || !start_date) {
            return res.status(400).json({ success: false, error: 'Activity name and start date are required' });
        }

        // console.log('🔔 Creating activity with auto-notify:', auto_notify_new_connections);

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the child belongs to this user using UUIDs
        const child = await client.query(
            'SELECT c.id FROM children c WHERE c.uuid = $1 AND c.parent_id = $2',
            [childUuid, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }
        
        const childId = child.rows[0].id;

        // Convert empty strings to null for time fields
        const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
        const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
        const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
        const processedCost = cost !== null && cost !== undefined && cost !== '' ? parseFloat(cost) : null;
        const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;
        
        // Process recurring fields
        const processedSeriesId = series_id && series_id.trim() ? series_id.trim() : null;
        const processedIsRecurring = is_recurring || false;
        const processedRecurringDays = recurring_days && Array.isArray(recurring_days) ? recurring_days : null;
        const processedSeriesStartDate = series_start_date && series_start_date.trim() ? series_start_date.trim() : null;

        // Determine if activity should be marked as shared
        // Activities are shared if explicitly marked as shared OR if they have auto_notify_new_connections enabled
        const isShared = is_shared || auto_notify_new_connections || false;

        // ✅ SECURITY: Only return necessary fields with UUID
        const result = await client.query(
            'INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, series_id, is_recurring, recurring_days, series_start_date, activity_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, series_id, is_recurring, recurring_days, series_start_date, activity_type, created_at, updated_at',
            [childId, name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, auto_notify_new_connections || false, isShared, processedSeriesId, processedIsRecurring, processedRecurringDays, processedSeriesStartDate, activity_type || null]
        );

        // console.log('🎯 Primary activity created:', result.rows[0].uuid);
        // Add child_uuid to the activity object (use the childUuid parameter from the URL)
        const primaryActivity = { ...result.rows[0], child_uuid: childUuid };
        // console.log('🔍 DEBUG: childUuid parameter:', childUuid);
        // console.log('🔍 DEBUG: primaryActivity child_uuid:', primaryActivity.child_uuid);
        const createdActivities = [primaryActivity];
        
        console.log('🔍 CLUB DEBUG: Checking club creation conditions:');
        console.log('   website_url:', website_url, 'truthy:', !!website_url, 'trimmed:', website_url?.trim());
        console.log('   activity_type:', activity_type, 'truthy:', !!activity_type, 'trimmed:', activity_type?.trim());
        
        // Create or update club record if activity has website URL and activity type
        if (website_url && website_url.trim() && activity_type && activity_type.trim()) {
            console.log('✅ CLUB DEBUG: Conditions met, entering club logic');
            try {
                const clubData = {
                    name: name.trim(),
                    description: description || null,
                    website_url: website_url.trim(),
                    activity_type: activity_type.trim(),
                    location: location || null,
                    cost: processedCost
                };
                
                console.log('🏢 Club creation check for:', { 
                    website_url: clubData.website_url, 
                    location: clubData.location, 
                    activity_type: clubData.activity_type 
                });
                
                console.log('🔍 Searching for existing club with exact match...');
                
                // Check if club already exists with website_url, location, and activity_type (improved deduplication)
                const existingClub = await client.query(`
                    SELECT id FROM clubs 
                    WHERE COALESCE(website_url, '') = COALESCE($1, '') 
                    AND COALESCE(location, '') = COALESCE($2, '') 
                    AND activity_type = $3
                `, [clubData.website_url, clubData.location, clubData.activity_type]);
                
                console.log(`🔍 Found ${existingClub.rows.length} matching clubs for:`, {
                    url: clubData.website_url,
                    location: clubData.location, 
                    type: clubData.activity_type
                });
                
                let clubId;
                if (existingClub.rows.length === 0) {
                    // Fetch website metadata
                    console.log('🌐 Fetching website metadata for new club...');
                    const metadata = await fetchWebsiteMetadata(clubData.website_url);
                    
                    // Get child age for tracking
                    const childAge = await client.query(
                        'SELECT age FROM children WHERE id = $1', [childId]
                    );
                    const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                    
                    // Create new club record with metadata and initial usage tracking
                    const newClubResult = await client.query(`
                        INSERT INTO clubs (
                            name, description, website_url, activity_type, location, cost, 
                            website_title, website_description, website_favicon, metadata_fetched_at,
                            usage_count, first_used_date, last_used_date, 
                            min_child_age, max_child_age, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 1, CURRENT_DATE, CURRENT_DATE, $10, $10, NOW(), NOW())
                        RETURNING id
                    `, [
                        clubData.name, clubData.description, clubData.website_url, clubData.activity_type, 
                        clubData.location, clubData.cost, metadata.title, metadata.description, metadata.favicon,
                        currentChildAge
                    ]);
                    clubId = newClubResult.rows[0].id;
                    console.log('✅ Created club record with metadata and usage tracking:', clubData.name, 'for', clubData.activity_type);
                } else {
                    clubId = existingClub.rows[0].id;
                    
                    // Check if metadata needs refreshing (older than 24 hours or missing)
                    const existingClubDetails = await client.query(
                        'SELECT metadata_fetched_at, usage_count, min_child_age, max_child_age FROM clubs WHERE id = $1',
                        [clubId]
                    );
                    
                    const shouldRefreshMetadata = !existingClubDetails.rows[0].metadata_fetched_at ||
                        (new Date() - new Date(existingClubDetails.rows[0].metadata_fetched_at)) > 24 * 60 * 60 * 1000; // 24 hours
                    
                    // Get child age for tracking
                    const childAge = await client.query(
                        'SELECT age FROM children WHERE id = $1', [childId]
                    );
                    const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                    
                    // Calculate new min/max ages
                    const currentMin = existingClubDetails.rows[0].min_child_age;
                    const currentMax = existingClubDetails.rows[0].max_child_age;
                    const newMin = currentChildAge && currentMin ? Math.min(currentMin, currentChildAge) : (currentChildAge || currentMin);
                    const newMax = currentChildAge && currentMax ? Math.max(currentMax, currentChildAge) : (currentChildAge || currentMax);
                    
                    if (shouldRefreshMetadata) {
                        console.log('🌐 Refreshing website metadata for existing club...');
                        const metadata = await fetchWebsiteMetadata(clubData.website_url);
                        
                        // Update existing club record with latest information, fresh metadata, and updated usage stats
                        await client.query(`
                            UPDATE clubs SET 
                                name = $1, description = $2, location = $3, cost = $4, 
                                website_title = $5, website_description = $6, website_favicon = $7, 
                                metadata_fetched_at = NOW(), updated_at = NOW(),
                                usage_count = usage_count + 1, last_used_date = CURRENT_DATE,
                                first_used_date = COALESCE(first_used_date, CURRENT_DATE),
                                min_child_age = $8, max_child_age = $9
                            WHERE id = $10
                        `, [
                            clubData.name, clubData.description, clubData.location, clubData.cost, 
                            metadata.title, metadata.description, metadata.favicon,
                            newMin, newMax, clubId
                        ]);
                        console.log('✅ Updated club record with fresh metadata and usage tracking:', clubData.name, 'for', clubData.activity_type);
                    } else {
                        // Update existing club record with latest information and usage stats (keep existing metadata)
                        await client.query(`
                            UPDATE clubs SET 
                                name = $1, description = $2, location = $3, cost = $4, updated_at = NOW(),
                                usage_count = usage_count + 1, last_used_date = CURRENT_DATE,
                                first_used_date = COALESCE(first_used_date, CURRENT_DATE),
                                min_child_age = $5, max_child_age = $6
                            WHERE id = $7
                        `, [clubData.name, clubData.description, clubData.location, clubData.cost, newMin, newMax, clubId]);
                        console.log('✅ Updated club record with usage tracking (kept existing metadata):', clubData.name, 'for', clubData.activity_type);
                    }
                }
                
                // Record detailed usage in club_usage table with actual activity start date
                try {
                    const childAge = await client.query('SELECT age FROM children WHERE id = $1', [childId]);
                    const currentChildAge = childAge.rows.length > 0 ? childAge.rows[0].age : null;
                    
                    await client.query(`
                        INSERT INTO club_usage (club_id, activity_id, child_id, child_age, usage_date, activity_start_date)
                        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                        ON CONFLICT (club_id, activity_id, child_id, activity_start_date) DO UPDATE SET
                            child_age = EXCLUDED.child_age,
                            usage_date = EXCLUDED.usage_date
                    `, [clubId, result.rows[0].id, childId, currentChildAge, start_date]);
                    
                    console.log('📊 Recorded club usage for tracking with activity date:', start_date);
                } catch (usageError) {
                    console.error('⚠️ Error recording club usage:', usageError);
                }
            } catch (clubError) {
                console.error('❌ CLUB DEBUG: Error in club creation/update:', clubError);
                console.error('❌ CLUB DEBUG: Stack trace:', clubError.stack);
                // Don't fail the activity creation if club creation fails
            }
        } else {
            console.log('❌ CLUB DEBUG: Conditions NOT met, skipping club logic');
            console.log('   website_url check:', website_url && website_url.trim());
            console.log('   activity_type check:', activity_type && activity_type.trim());
        }

        // Create joint host activities if joint_host_children is provided
        if (joint_host_children && Array.isArray(joint_host_children) && joint_host_children.length > 0) {
            console.log('👥 Creating joint host activities for:', joint_host_children);
            console.log('👥 Current user ID:', req.user.id);

            for (const jointChildUuid of joint_host_children) {
                try {
                    console.log(`🔍 Checking joint child: ${jointChildUuid}`);
                    
                    // Verify the joint child belongs to this user
                    const jointChild = await client.query(
                        'SELECT c.id FROM children c WHERE c.uuid = $1 AND c.parent_id = $2',
                        [jointChildUuid, req.user.id]
                    );

                    console.log(`🔍 Joint child query result:`, {
                        uuid: jointChildUuid,
                        foundRows: jointChild.rows.length,
                        childId: jointChild.rows[0]?.id
                    });

                    if (jointChild.rows.length === 0) {
                        console.log(`⚠️ Joint child ${jointChildUuid} not found or doesn't belong to user ${req.user.id}`);
                        
                        // Additional debug: check if child exists at all
                        const anyChild = await client.query(
                            'SELECT c.id, c.parent_id FROM children c WHERE c.uuid = $1',
                            [jointChildUuid]
                        );
                        
                        if (anyChild.rows.length > 0) {
                            console.log(`🔍 Child exists but belongs to parent_id: ${anyChild.rows[0].parent_id}, current user: ${req.user.id}`);
                        } else {
                            console.log(`❌ Child with UUID ${jointChildUuid} does not exist in database`);
                        }
                        
                        continue;
                    }

                    const jointChildId = jointChild.rows[0].id;

                    // Create activity for joint host child
                    const jointResult = await client.query(
                        'INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, series_id, is_recurring, recurring_days, series_start_date, activity_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, series_id, is_recurring, recurring_days, series_start_date, activity_type, created_at, updated_at',
                        [jointChildId, name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, auto_notify_new_connections || false, isShared, processedSeriesId, processedIsRecurring, processedRecurringDays, processedSeriesStartDate, activity_type || null]
                    );

                    console.log('✅ Joint host activity created:', jointResult.rows[0].uuid, 'for child:', jointChildUuid);
                    // Add child_uuid to the joint activity object
                    const jointActivity = { ...jointResult.rows[0], child_uuid: jointChildUuid };
                    console.log('🔍 DEBUG: jointChildUuid:', jointChildUuid);
                    console.log('🔍 DEBUG: jointActivity child_uuid:', jointActivity.child_uuid);
                    createdActivities.push(jointActivity);
                } catch (jointError) {
                    console.error(`❌ Failed to create joint activity for child ${jointChildUuid}:`, jointError);
                    // Continue with other joint children even if one fails
                }
            }
        }

        client.release();

        const responseData = {
            success: true,
            data: createdActivities[0], // Return primary activity for compatibility
            joint_activities: createdActivities.length > 1 ? createdActivities : undefined, // Include all if joint hosting
            message: createdActivities.length > 1 ? `Activity created for ${createdActivities.length} children` : 'Activity created successfully'
        };
        
        console.log('🔍 DEBUG: Final response being sent:', JSON.stringify(responseData, null, 2));
        console.log('🔍 DEBUG: createdActivities array:', JSON.stringify(createdActivities.map(a => ({ uuid: a.uuid, name: a.name, child_uuid: a.child_uuid })), null, 2));

        res.json(responseData);
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to create activity' });
    }
});

// Calendar endpoint
app.get('/api/calendar/activities', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        console.log(`🔍 GET /api/calendar/activities - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for calendar activities: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const client = await pool.connect();
        
        let query = `
            SELECT DISTINCT
                -- ✅ SECURITY: Use UUIDs instead of sequential IDs
                a.uuid as activity_uuid,
                a.name, 
                a.description,
                a.start_date,
                a.end_date, 
                a.start_time,
                a.end_time,
                a.location,
                a.website_url,
                a.cost,
                a.max_participants,
                a.auto_notify_new_connections,
                a.host_cant_attend,
                a.created_at,
                a.updated_at,
                c.name as child_name,
                -- ✅ SECURITY: Use child UUID instead of ID for activity owner
                c.uuid as child_uuid,
                -- Use stored is_shared value
                a.is_shared,
                -- Determine if user is host (owns the activity)
                CASE WHEN c.parent_id = $1 THEN true ELSE false END as is_host,
                -- Activity invitation status for this user's children
                COALESCE(ai.status, 'none') as invitation_status,
                -- ✅ SECURITY: Use child UUID instead of ID for invited child
                c_invited.uuid as invited_child_uuid,
                -- Debug fields to see what each condition evaluates to
                a.auto_notify_new_connections as debug_auto_notify,
                (SELECT COUNT(*) FROM activity_invitations ai WHERE ai.activity_uuid = a.uuid) as debug_total_invitations,
                (SELECT COUNT(*) FROM activity_invitations ai WHERE ai.activity_uuid = a.uuid AND ai.invited_parent_id = $1 AND ai.status = 'accepted') as debug_user_accepted_invitations,
                -- Status change notification count (only for host's own activities)
                CASE 
                    WHEN c.parent_id = $1 THEN 
                        COALESCE((SELECT COUNT(*) FROM activity_invitations ai_status 
                         WHERE ai_status.activity_uuid = a.uuid 
                         AND ai_status.inviter_parent_id = $1 
                         AND ai_status.status IN ('accepted', 'rejected')
                         AND ai_status.status_viewed_at IS NULL 
                         AND ai_status.updated_at > ai_status.created_at), 0)
                    ELSE 0
                END as unviewed_status_changes,
                -- Get distinct statuses for unviewed changes (only for host's own activities)
                CASE 
                    WHEN c.parent_id = $1 THEN 
                        (SELECT string_agg(DISTINCT ai_status.status, ',') FROM activity_invitations ai_status 
                         WHERE ai_status.activity_uuid = a.uuid 
                         AND ai_status.inviter_parent_id = $1 
                         AND ai_status.status IN ('accepted', 'rejected')
                         AND ai_status.status_viewed_at IS NULL 
                         AND ai_status.updated_at > ai_status.created_at)
                    ELSE NULL
                END as unviewed_statuses
            FROM activities a 
            JOIN children c ON a.child_id = c.id 
            LEFT JOIN activity_invitations ai ON a.id = ai.activity_id 
                AND ai.invited_parent_id = $1 
                AND ai.status IN ('pending', 'accepted')
            LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
            WHERE (
                -- Include owned activities
                c.parent_id = $1 
                OR 
                -- Include activities where user's children are invited (pending or accepted)
                ai.id IS NOT NULL
            )
        `;
        let params = [accountUserId];

        if (start && end) {
            query += ' AND a.start_date BETWEEN $2 AND $3';
            params.push(start, end);
        }

        query += ' ORDER BY a.start_date, a.start_time';

        const result = await client.query(query, params);
        client.release();

        // Debug: Log ALL activities to see what's being returned
        console.log('🔍 Calendar Activities Debug:');
        console.log(`Found ${result.rows.length} activities for account user ${accountUserId} (${req.user.email})`);
        result.rows.forEach((activity, index) => {
            console.log(`${index + 1}. Activity: "${activity.name}" (UUID: ${activity.activity_uuid})`);
            console.log(`   - is_shared: ${activity.is_shared}`);
            console.log(`   - debug_auto_notify: ${activity.debug_auto_notify}`);
            console.log(`   - debug_total_invitations: ${activity.debug_total_invitations}`);
            console.log(`   - debug_user_accepted_invitations: ${activity.debug_user_accepted_invitations}`);
            console.log(`   - child_name: ${activity.child_name}`);
        });
        
        console.log('🔍 DEBUG: First 3 activities child_uuid check:');
        result.rows.slice(0, 3).forEach((activity, index) => {
            console.log(`   ${index + 1}. "${activity.name}": child_uuid=${activity.child_uuid}, child_name=${activity.child_name}`);
        });

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get calendar activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch calendar activities' });
    }
});

// Update activity
app.put('/api/activities/update/:activityId', authenticateToken, async (req, res) => {
    console.log('🚨 ACTIVITY UPDATE ENDPOINT HIT!');
    console.log('🚨 Activity ID:', req.params.activityId);
    console.log('🚨 User ID:', req.user?.id);
    console.log('🚨 Request body keys:', Object.keys(req.body || {}));
    try {
        const { activityId } = req.params;
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, activity_type } = req.body;
        
        console.log('🔍 Update activity request:', {
            activityId,
            userId: req.user.id,
            body: req.body
        });
        
        // Validate required fields
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid name field:', { name, type: typeof name });
            return res.status(400).json({ success: false, error: 'Activity name is required' });
        }
        
        if (!start_date) {
            console.error('❌ Invalid start_date field:', { start_date });
            return res.status(400).json({ success: false, error: 'Start date is required' });
        }
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity belongs to this user using UUID
        const activityCheck = await client.query(
            'SELECT a.id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1 AND c.parent_id = $2',
            [activityId, req.user.id]
        );
        
        console.log('🔍 Activity ownership check:', {
            activityId,
            userId: req.user.id,
            found: activityCheck.rows.length
        });
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        // Convert empty strings to null for time fields  
        const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
        const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
        const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
        const processedCost = cost !== null && cost !== undefined && cost !== '' ? parseFloat(cost) : null;
        const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;

        console.log('🔍 Processed values:', {
            processedStartTime,
            processedEndTime,
            processedEndDate,
            processedCost,
            processedMaxParticipants
        });

        // Prepare parameters array with validation
        const updateParams = [
            name.trim(), 
            description || null, 
            start_date, 
            processedEndDate, 
            processedStartTime, 
            processedEndTime, 
            location || null, 
            website_url || null, 
            processedCost, 
            processedMaxParticipants, 
            activity_type || null,
            activityId
        ];
        
        console.log('🔍 Update parameters:', {
            paramCount: updateParams.length,
            params: updateParams
        });

        // ✅ SECURITY: Update using UUID and return minimal data
        const result = await client.query(
            `UPDATE activities SET 
                name = $1, description = $2, start_date = $3, end_date = $4, 
                start_time = $5, end_time = $6, location = $7, website_url = $8, 
                cost = $9, max_participants = $10, activity_type = $11, updated_at = NOW()
             WHERE uuid = $12 RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, activity_type, updated_at`,
            updateParams
        );
        
        console.log('🔍 Update result:', {
            rowsAffected: result.rowCount,
            returningData: result.rows[0]
        });
        
        // Add club logic after successful update
        console.log('🏢 UPDATE ENDPOINT: Activity updated, checking club logic');
        console.log('🔍 CLUB DEBUG UPDATE: Checking club creation conditions:');
        console.log('   website_url:', website_url, 'truthy:', !!website_url, 'trimmed:', website_url?.trim());
        console.log('   activity_type:', activity_type, 'truthy:', !!activity_type, 'trimmed:', activity_type?.trim());
        
        if (result.rowCount > 0 && website_url && website_url.trim() && activity_type && activity_type.trim()) {
            console.log('✅ CLUB DEBUG UPDATE: Conditions met, entering club logic');
            try {
                // Get the activity ID for club_usage table
                const activityIdResult = await client.query('SELECT id FROM activities WHERE uuid = $1', [activityId]);
                const activityDbId = activityIdResult.rows[0]?.id;
                
                if (activityDbId) {
                    // Find or create club record
                    const existingClub = await client.query(`
                        SELECT id FROM clubs 
                        WHERE COALESCE(website_url, '') = COALESCE($1, '') 
                        AND COALESCE(location, '') = COALESCE($2, '') 
                        AND activity_type = $3
                    `, [website_url.trim(), location || '', activity_type.trim()]);
                    
                    let clubId;
                    if (existingClub.rows.length === 0) {
                        // Create new club
                        console.log('🏢 UPDATE: Creating new club record');
                        const newClubResult = await client.query(`
                            INSERT INTO clubs (name, website_url, activity_type, location, cost, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                            RETURNING id
                        `, [name.trim(), website_url.trim(), activity_type.trim(), location || null, processedCost]);
                        clubId = newClubResult.rows[0].id;
                        console.log('✅ UPDATE: Created club record:', name.trim());
                    } else {
                        clubId = existingClub.rows[0].id;
                        console.log('✅ UPDATE: Found existing club:', clubId);
                    }
                    
                    // Create or update club_usage record
                    await client.query(`
                        INSERT INTO club_usage (club_id, activity_id, usage_date, activity_start_date)
                        VALUES ($1, $2, CURRENT_DATE, $3)
                        ON CONFLICT (club_id, activity_id) DO UPDATE SET
                            usage_date = CURRENT_DATE,
                            activity_start_date = EXCLUDED.activity_start_date
                    `, [clubId, activityDbId, start_date]);
                    console.log('✅ UPDATE: Created/updated club_usage record');
                }
            } catch (clubError) {
                console.error('❌ UPDATE: Club logic error:', clubError);
            }
        } else {
            console.log('❌ CLUB DEBUG UPDATE: Conditions not met - no club logic executed');
        }
        
        client.release();
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Update activity error:', error);
        console.error('❌ Update activity error details:', {
            activityId: req.params.activityId,
            userId: req.user?.id,
            body: req.body,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ success: false, error: 'Failed to update activity', details: error.message });
    }
});


// Get single activity by UUID with pending connections
app.get('/api/activities/details/:activityUuid', authenticateToken, async (req, res) => {
    try {
        const { activityUuid } = req.params;
        
        console.log('🔍 GET /api/activities/details/:activityUuid Debug:', {
            activityUuid,
            userId: req.user.id,
            userEmail: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        const client = await pool.connect();
        
        try {
            // Get activity details with authorization check (owner OR invited guest)
            const activityQuery = `
                SELECT DISTINCT
                    a.uuid as activity_uuid,
                    a.name,
                    a.description,
                    a.start_date,
                    a.end_date,
                    a.start_time,
                    a.end_time,
                    a.location,
                    a.website_url,
                    a.cost,
                    a.max_participants,
                    a.auto_notify_new_connections,
                    a.is_shared,
                    a.created_at,
                    a.updated_at,
                    c.name as child_name,
                    c.uuid as child_uuid,
                    CASE WHEN u.id = $2 THEN true ELSE false END as is_owner
                FROM activities a 
                JOIN children c ON a.child_id = c.id 
                JOIN users u ON c.parent_id = u.id 
                LEFT JOIN activity_invitations ai ON a.id = ai.activity_id AND (ai.invited_parent_id = $2 OR ai.inviter_parent_id = $2)
                WHERE a.uuid = $1 AND (u.id = $2 OR ai.id IS NOT NULL)
            `;
            
            const activityResult = await client.query(activityQuery, [activityUuid, req.user.id]);
            
            if (activityResult.rows.length === 0) {
                client.release();
                return res.status(404).json({ 
                    success: false, 
                    error: 'Activity not found or access denied' 
                });
            }
            
            const activity = activityResult.rows[0];
            
            // Get pending connections for this activity
            const pendingQuery = `
                SELECT pending_connection_id
                FROM pending_activity_invitations 
                WHERE activity_id = (
                    SELECT id FROM activities WHERE uuid = $1
                )
            `;
            
            const pendingResult = await client.query(pendingQuery, [activityUuid]);
            const pendingConnections = pendingResult.rows.map(row => row.pending_connection_id);
            
            // Get user's invitation for this activity (if exists)
            const invitationQuery = `
                SELECT ai.uuid as invitation_uuid, ai.status, ai.message, ai.viewed_at,
                       c_invited.name as invited_child_name, c_invited.uuid as invited_child_uuid
                FROM activity_invitations ai
                LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
                WHERE ai.activity_id = (SELECT id FROM activities WHERE uuid = $1)
                  AND ai.invited_parent_id = $2
            `;
            
            const invitationResult = await client.query(invitationQuery, [activityUuid, req.user.id]);
            const invitation = invitationResult.rows.length > 0 ? invitationResult.rows[0] : null;
            
            console.log('✅ Activity details retrieved:', {
                activityName: activity.name,
                activityUuid: activity.activity_uuid,
                pendingConnectionsCount: pendingConnections.length,
                hasInvitation: !!invitation
            });
            
            // Include pending connections and invitation in response
            const response = {
                ...activity,
                pending_connections: pendingConnections,
                invitation: invitation
            };
            
            client.release();
            res.json({ 
                success: true, 
                data: response 
            });
            
        } catch (dbError) {
            client.release();
            throw dbError;
        }
        
    } catch (error) {
        console.error('❌ Error fetching activity details:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch activity details' 
        });
    }
});

// Delete activity
app.delete('/api/activities/delete/:activityId', authenticateToken, async (req, res) => {
    try {
        const { activityId } = req.params;
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity belongs to this user using UUID
        const activityCheck = await client.query(
            'SELECT a.id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1 AND c.parent_id = $2',
            [activityId, req.user.id]
        );
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        // ✅ SECURITY: Delete using UUID instead of sequential ID
        await client.query('DELETE FROM activities WHERE uuid = $1', [activityId]);
        client.release();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete activity' });
    }
});

// Delete activity series (recurring activities with same name)
app.delete('/api/activities/delete-series', authenticateToken, async (req, res) => {
    try {
        const { activity_name, child_uuid } = req.body;
        
        if (!activity_name || !child_uuid) {
            return res.status(400).json({ 
                success: false, 
                error: 'activity_name and child_uuid are required' 
            });
        }
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the child belongs to this user and get child_id
        const childCheck = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [child_uuid, req.user.id]
        );
        
        if (childCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found or not owned by user' });
        }
        
        const childId = childCheck.rows[0].id;
        
        // Find all activities with the same name for this child
        const seriesCheck = await client.query(
            'SELECT uuid, name, start_date FROM activities WHERE name = $1 AND child_id = $2 ORDER BY start_date',
            [activity_name, childId]
        );
        
        if (seriesCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'No activities found with that name' });
        }
        
        console.log(`🗑️ Deleting series "${activity_name}" for child ${child_uuid}: ${seriesCheck.rows.length} activities`);
        console.log('Activities to delete:', seriesCheck.rows.map(r => ({ uuid: r.uuid, date: r.start_date })));
        
        // ✅ SECURITY: Delete using child ownership verification
        const deleteResult = await client.query(
            'DELETE FROM activities WHERE name = $1 AND child_id = $2',
            [activity_name, childId]
        );
        
        client.release();
        
        const deletedCount = deleteResult.rowCount;
        console.log(`✅ Successfully deleted ${deletedCount} activities from series "${activity_name}"`);
        
        res.json({ 
            success: true, 
            message: `Deleted ${deletedCount} activities from series "${activity_name}"`,
            deleted_count: deletedCount
        });
    } catch (error) {
        console.error('Delete activity series error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete activity series' });
    }
});


// Get connections (all for parent - legacy endpoint)
app.get('/api/connections', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 GET /api/connections - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for connections: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const client = await pool.connect();
        
        // Debug: First check all connections for this account (including blocked ones)
        const allConnections = await client.query(
            `SELECT c.id, c.status, c.created_at,
                    u1.username as child1_parent_name, 
                    u2.username as child2_parent_name,
                    ch1.name as child1_name, ch2.name as child2_name
             FROM connections c
             JOIN children ch1 ON c.child1_id = ch1.id
             JOIN children ch2 ON c.child2_id = ch2.id  
             JOIN users u1 ON ch1.parent_id = u1.id
             JOIN users u2 ON ch2.parent_id = u2.id
             WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1)
             ORDER BY c.created_at DESC`,
            [accountUserId]
        );
        console.log(`🔍 All connections for account user ${accountUserId}:`, allConnections.rows.map(c => ({
            id: c.id,
            child1: c.child1_name,
            child2: c.child2_name,
            status: c.status
        })));
        
        // ✅ SECURITY: Only include child UUIDs for frontend matching, removed child IDs for security
        const result = await client.query(
            `SELECT c.uuid as connection_uuid,
                    c.status, 
                    c.created_at,
                    u1.username as child1_parent_name, 
                    u2.username as child2_parent_name,
                    u1.id as child1_parent_id,
                    u2.id as child2_parent_id,
                    u1.uuid as child1_parent_uuid,
                    u2.uuid as child2_parent_uuid,
                    ch1.name as child1_name, 
                    ch2.name as child2_name,
                    ch1.uuid as child1_uuid, 
                    ch2.uuid as child2_uuid
             FROM connections c
             JOIN children ch1 ON c.child1_id = ch1.id
             JOIN children ch2 ON c.child2_id = ch2.id  
             JOIN users u1 ON ch1.parent_id = u1.id
             JOIN users u2 ON ch2.parent_id = u2.id
             WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1) AND c.status = 'active'
             ORDER BY c.created_at DESC`,
            [accountUserId]
        );
        
        console.log(`✅ Active connections for account user ${accountUserId}:`, result.rows.map(c => ({
            id: c.id,
            child1: c.child1_name,
            child2: c.child2_name,
            status: c.status,
            child1_uuid: c.child1_uuid,
            child2_uuid: c.child2_uuid
        })));
        
        client.release();
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connections' });
    }
});

// Connection endpoints
app.get('/api/connections/requests', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 GET /api/connections/requests - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for connection requests: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const client = await pool.connect();
        
        // First, check all connection requests for this account (debug)
        const allRequestsResult = await client.query(
            `SELECT cr.*, u.username as requester_name 
             FROM connection_requests cr 
             LEFT JOIN users u ON cr.requester_id = u.id 
             WHERE cr.target_parent_id = $1`,
            [accountUserId]
        );
        console.log(`📋 All connection requests for account user ${accountUserId}:`, allRequestsResult.rows);
        
        // Check for any requests with NULL child_uuid
        const nullChildRequests = await client.query(
            `SELECT * FROM connection_requests WHERE target_parent_id = $1 AND child_uuid IS NULL`,
            [accountUserId]
        );
        console.log(`⚠️ Requests with NULL child_uuid:`, nullChildRequests.rows);
        
        // ✅ SECURITY: Only return necessary fields, NO email/phone/address exposure
        const result = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u.username as requester_name,
                    u.family_name as requester_family_name,
                    c1.name as child_name,
                    c1.age as child_age,
                    c1.grade as child_grade,
                    c2.name as target_child_name,
                    c2.uuid as target_child_uuid,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade,
                    u_target.uuid as target_parent_uuid
             FROM connection_requests cr
             JOIN users u ON cr.requester_id = u.id
             JOIN users u_target ON cr.target_parent_id = u_target.id
             LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
             LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
             WHERE cr.target_parent_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [accountUserId]
        );
        console.log(`✅ Final filtered results:`, result.rows);
        
        client.release();

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connection requests' });
    }
});

// Get sent connection requests (for the requester to track their pending requests)
app.get('/api/connections/sent-requests', authenticateToken, async (req, res) => {
    try {
        console.log(`📤 GET /api/connections/sent-requests - User: ${req.user.email} (UUID: ${req.user.uuid})`);
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for sent requests: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields, NO email exposure  
        const result = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u.username as target_parent_name,
                    u.uuid as target_parent_uuid,
                    u.family_name as target_family_name,
                    COALESCE(
                        CASE 
                            WHEN c1.first_name IS NOT NULL THEN 
                                CASE WHEN c1.last_name IS NOT NULL AND c1.last_name != '' 
                                     THEN c1.first_name || ' ' || c1.last_name
                                     ELSE c1.first_name
                                END
                            ELSE c1.name
                        END, 
                        c1.name
                    ) as child_name, 
                    c1.age as child_age, c1.grade as child_grade, c1.school as child_school,
                    COALESCE(
                        CASE 
                            WHEN c2.first_name IS NOT NULL THEN 
                                CASE WHEN c2.last_name IS NOT NULL AND c2.last_name != '' 
                                     THEN c2.first_name || ' ' || c2.last_name
                                     ELSE c2.first_name
                                END
                            ELSE c2.name
                        END, 
                        c2.name
                    ) as target_child_name,
                    c2.uuid as target_child_uuid,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade
             FROM connection_requests cr
             JOIN users u ON cr.target_parent_id = u.id
             JOIN children c1 ON cr.child_uuid = c1.uuid
             LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
             WHERE cr.requester_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [accountUserId]
        );
        console.log(`📤 Found ${result.rows.length} sent requests:`, result.rows);
        
        client.release();

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get sent connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sent connection requests' });
    }
});

app.get('/api/connections/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 3) {
            return res.status(400).json({ success: false, error: 'Search query must be at least 3 characters' });
        }

        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields for connection search, NO email/phone exposure
        const result = await client.query(
            `SELECT u.uuid as user_uuid,
                    u.username,
                    u.family_name,
                    json_agg(
                        CASE WHEN c.id IS NOT NULL 
                        THEN json_build_object(
                            'uuid', c.uuid, 
                            'name', c.name, 
                            'age', c.age,
                            'grade', c.grade
                        ) 
                        ELSE NULL END
                    ) FILTER (WHERE c.id IS NOT NULL) as children
             FROM users u
             LEFT JOIN children c ON u.id = c.parent_id
             WHERE u.id != $1 AND u.is_active = true AND (u.email ILIKE $2 OR u.phone ILIKE $2)
             GROUP BY u.uuid, u.username, u.family_name
             LIMIT 10`,
            [req.user.id, `%${q}%`]
        );
        client.release();

        // Process results to handle null children arrays
        const processedResults = result.rows.map(row => ({
            ...row,
            children: row.children.filter(child => child !== null)
        }));

        res.json({
            success: true,
            data: processedResults
        });
    } catch (error) {
        console.error('Search parents error:', error);
        res.status(500).json({ success: false, error: 'Failed to search parents' });
    }
});

app.post('/api/connections/request', authenticateToken, async (req, res) => {
    try {
        console.log('📝 POST /api/connections/request - Creating connection request:', {
            requester_id: req.user.id,
            requester_email: req.user.email,
            body: req.body
        });
        
        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for connection request: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const { target_parent_id, child_uuid, target_child_uuid, message } = req.body;

        if (!target_parent_id || !child_uuid) {
            return res.status(400).json({ success: false, error: 'Target parent and child are required' });
        }

        const client = await pool.connect();
        
        // Verify the child belongs to this account
        const child = await client.query(
            'SELECT uuid FROM children WHERE uuid = $1 AND parent_id = $2',
            [child_uuid, accountUserId]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        // ✅ SECURITY: Convert UUID to database ID for target parent
        let targetParentDbId;
        if (typeof target_parent_id === 'string' && target_parent_id.includes('-')) {
            // It's a UUID, convert to database ID
            const parentQuery = await client.query(
                'SELECT id FROM users WHERE uuid = $1',
                [target_parent_id]
            );
            if (parentQuery.rows.length === 0) {
                client.release();
                return res.status(404).json({ success: false, error: 'Target parent not found' });
            }
            targetParentDbId = parentQuery.rows[0].id;
        } else {
            // It's already a database ID
            targetParentDbId = target_parent_id;
        }

        // Verify target child exists if provided
        if (target_child_uuid) {
            const targetChildQuery = await client.query(
                'SELECT uuid FROM children WHERE uuid = $1 AND parent_id = $2',
                [target_child_uuid, targetParentDbId]
            );
            if (targetChildQuery.rows.length === 0) {
                client.release();
                return res.status(404).json({ success: false, error: 'Target child not found' });
            }
        }

        // Check for existing pending request to prevent duplicates
        const existingRequest = await client.query(
            'SELECT uuid FROM connection_requests WHERE requester_id = $1 AND target_parent_id = $2 AND child_uuid = $3 AND target_child_uuid = $4 AND status = $5',
            [accountUserId, targetParentDbId, child_uuid, target_child_uuid, 'pending']
        );
        
        if (existingRequest.rows.length > 0) {
            client.release();
            return res.status(409).json({ 
                success: false, 
                error: 'A pending connection request already exists for this combination',
                existingRequestUuid: existingRequest.rows[0].uuid
            });
        }

        // ✅ SECURITY: Only return necessary fields, not RETURNING *
        const result = await client.query(
            'INSERT INTO connection_requests (requester_id, target_parent_id, child_uuid, target_child_uuid, message, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING uuid, message, status, created_at',
            [accountUserId, targetParentDbId, child_uuid, target_child_uuid, message, 'pending']
        );
        
        console.log('✅ Connection request created successfully:', result.rows[0]);

        // ✅ SECURITY: Get response information without exposing emails
        const detailedRequest = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u_req.username as requester_name,
                    u_target.username as target_parent_name,
                    c1.name as child_name,
                    c1.age as child_age,
                    c1.grade as child_grade,
                    c2.name as target_child_name,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade
             FROM connection_requests cr
             JOIN users u_req ON cr.requester_id = u_req.id
             JOIN users u_target ON cr.target_parent_id = u_target.id
             JOIN children c1 ON cr.child_uuid = c1.uuid
             LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
             WHERE cr.id = $1`,
            [result.rows[0].id]
        );
        client.release();

        res.json({
            success: true,
            data: detailedRequest.rows[0],
            message: 'Connection request sent successfully'
        });
    } catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({ success: false, error: 'Failed to send connection request' });
    }
});

app.post('/api/connections/respond/:requestId', authenticateToken, async (req, res) => {
    try {
        console.log('🚨 ENDPOINT HIT: /api/connections/respond/:requestId');
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const requestUuid = req.params.requestId;
        const { action } = req.body;

        console.log(`📝 Connection request response - User: ${req.user.email} (UUID: ${req.user.uuid}):`, { requestUuid, action });

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        // Resolve the account user ID (handles both primary and additional parents)
        const accountUserId = await resolveAccountUserId(req.user.uuid);
        console.log(`📋 Resolved account user ID for connection respond: ${accountUserId}`);
        
        if (!accountUserId) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const client = await pool.connect();
        
        // First, let's see all connection requests for this account
        const allRequests = await client.query(
            'SELECT * FROM connection_requests WHERE target_parent_id = $1',
            [accountUserId]
        );
        console.log('📋 All connection requests for account:', allRequests.rows);
        
        // ✅ SECURITY: Verify the request is for this account using UUID
        const request = await client.query(
            'SELECT * FROM connection_requests WHERE uuid = $1 AND target_parent_id = $2 AND status = $3',
            [requestUuid, accountUserId, 'pending']
        );

        console.log('🔍 Specific request found:', request.rows);

        if (request.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Connection request not found',
                debug: {
                    requestUuid,
                    userId: req.user.uuid,
                    accountUserId,
                    allRequests: allRequests.rows
                }
            });
        }

        const status = action === 'accept' ? 'accepted' : 'rejected';
        console.log('🔄 Updating request status to:', status);
        console.log('🔍 Request row data:', request.rows[0]);
        
        const requestId = request.rows[0].id;
        if (!requestId) {
            throw new Error('Request ID is missing from database record');
        }
        
        const updateResult = await client.query(
            'UPDATE connection_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, requestId]
        );
        
        console.log('✅ Update result:', updateResult);
        
        if (action === 'reject') {
            console.log('🚫 REJECT action completed - skipping connection creation and notifications');
        }

        // If accepted, create the connection
        if (action === 'accept') {
            const req_data = request.rows[0];
            console.log('🤝 Creating connection for accepted request:', req_data);
            console.log('🔍 DEBUGGING v2 - Auto-notification check - target_child_uuid:', req_data.target_child_uuid);
            
            if (req_data.target_child_uuid) {
                // Convert UUIDs to database IDs for the connections table
                const child1Query = await client.query('SELECT id FROM children WHERE uuid = $1', [req_data.child_uuid]);
                const child2Query = await client.query('SELECT id FROM children WHERE uuid = $1', [req_data.target_child_uuid]);
                
                if (child1Query.rows.length > 0 && child2Query.rows.length > 0) {
                    const connectionResult = await client.query(
                        'INSERT INTO connections (child1_id, child2_id, status) VALUES ($1, $2, $3)',
                        [child1Query.rows[0].id, child2Query.rows[0].id, 'active']
                    );
                    console.log('🔗 Connection created:', connectionResult);
                    
                    // 🔔 AUTO-NOTIFICATION: Send auto-notify activities from both users to each other
                    console.log('🔔 STARTING auto-notification processing...');
                    await processAutoNotifications(client, req_data.requester_id, req_data.target_parent_id, child1Query.rows[0].id, child2Query.rows[0].id);
                    console.log('🔔 COMPLETED auto-notification processing');
                    
                    // 🔔 PENDING INVITATIONS: Process pending invitations for this connection
                    console.log('🔍 Checking for pending invitations with request UUID:', req_data.uuid);
                    await processPendingInvitations(client, req_data);
                    console.log('🔔 COMPLETED pending invitations processing');
                } else {
                    console.error('❌ Could not find child IDs for UUIDs:', req_data.child_uuid, req_data.target_child_uuid);
                }
            } else {
                // For general connection requests without specific target child,
                // we don't create a connection until a specific child is chosen
                console.log('❌ Connection request accepted but no specific target child - connection will be created when activity invitation is sent');
                console.log('❌ AUTO-NOTIFICATION SKIPPED - no target_child_id');
                
                // 🔔 PENDING INVITATIONS: Process pending invitations using request UUID
                console.log('🔍 Checking for pending invitations with request UUID:', req_data.uuid);
                await processPendingInvitations(client, req_data);
            }
        }

        client.release();

        res.json({ success: true, action, status });
    } catch (error) {
        console.error('❌ Respond to connection request error:', error);
        // Make sure client is released even if error occurred
        try {
            if (client) {
                client.release();
            }
        } catch (releaseError) {
            console.error('❌ Error releasing client:', releaseError);
        }
        res.status(500).json({ 
            success: false, 
            error: 'Failed to respond to connection request',
            debug: error.message,
            stack: error.stack
        });
    }
});

// Delete connection endpoint
app.delete('/api/connections/:connectionId', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const connectionUuid = req.params.connectionId;
        const userId = req.user.id;

        console.log('🗑️ DELETE connection request:', { connectionUuid, userId });

        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!connectionUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(connectionUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid connection UUID format' });
        }

        const client = await pool.connect();
        
        // First, let's see what connections exist for this user
        const allUserConnections = await client.query(`
            SELECT c.*, 
                   ch1.name as child1_name, ch1.parent_id as child1_parent_id,
                   ch2.name as child2_name, ch2.parent_id as child2_parent_id
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id  
            WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1)
        `, [userId]);
        
        console.log('📋 All connections for user:', allUserConnections.rows);
        
        // ✅ SECURITY: Find connection using UUID instead of sequential ID
        const connection = await client.query(`
            SELECT c.id, c.uuid,
                   ch1.name as child1_name, ch1.parent_id as child1_parent_id,
                   ch2.name as child2_name, ch2.parent_id as child2_parent_id
            FROM connections c
            JOIN children ch1 ON c.child1_id = ch1.id
            JOIN children ch2 ON c.child2_id = ch2.id  
            WHERE c.uuid = $1 
              AND (ch1.parent_id = $2 OR ch2.parent_id = $2) 
              AND c.status = 'active'
        `, [connectionUuid, userId]);

        console.log('🔍 Specific connection found:', connection.rows);

        if (connection.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Connection not found',
                debug: {
                    connectionUuid,
                    userId,
                    allUserConnections: allUserConnections.rows
                }
            });
        }

        const connData = connection.rows[0];
        console.log('✅ Connection to delete:', connData);

        // ✅ SECURITY: Update connection using UUID
        const updateResult = await client.query(
            'UPDATE connections SET status = $1 WHERE uuid = $2',
            ['blocked', connectionUuid]
        );

        console.log('🔄 Update result:', updateResult);

        client.release();

        res.json({
            success: true,
            message: 'Connection deleted successfully',
            deleted_connection: {
                id: connData.id,
                child1_name: connData.child1_name,
                child2_name: connData.child2_name
            }
        });
    } catch (error) {
        console.error('❌ Delete connection error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete connection',
            debug: error.message 
        });
    }
});

// ===== SKELETON ACCOUNTS ===== 
// These handle cases where users search for non-existent accounts

// Create skeleton account when no match found in search
app.post('/api/connections/create-skeleton', authenticateToken, async (req, res) => {
    try {
        const { contact_method, contact_type, my_child_uuid, target_child_name, target_child_birth_year, message } = req.body;
        
        console.log('📝 Creating skeleton account:', {
            contact_method,
            contact_type,
            my_child_uuid,
            target_child_name,
            requester_id: req.user.id
        });

        if (!contact_method || !contact_type || !my_child_uuid || !target_child_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Contact method, type, your child, and target child name are required' 
            });
        }

        if (!['email', 'phone'].includes(contact_type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Contact type must be email or phone' 
            });
        }

        const client = await pool.connect();
        
        // Verify the requester's child exists
        const myChild = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [my_child_uuid, req.user.id]
        );

        if (myChild.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Your child not found' });
        }

        // Check if skeleton account already exists
        let skeletonAccount = await client.query(
            'SELECT * FROM skeleton_accounts WHERE contact_method = $1 AND contact_type = $2 AND is_merged = false',
            [contact_method, contact_type]
        );

        if (skeletonAccount.rows.length === 0) {
            // Create new skeleton account
            const skeletonAccountResult = await client.query(
                'INSERT INTO skeleton_accounts (contact_method, contact_type) VALUES ($1, $2) RETURNING *',
                [contact_method, contact_type]
            );
            skeletonAccount = skeletonAccountResult;
        }

        const skeletonAccountId = skeletonAccount.rows[0].id;

        // Check if skeleton child already exists with this name
        let skeletonChild = await client.query(
            'SELECT * FROM skeleton_children WHERE skeleton_account_id = $1 AND name = $2 AND is_merged = false',
            [skeletonAccountId, target_child_name]
        );

        if (skeletonChild.rows.length === 0) {
            // Create skeleton child
            const skeletonChildResult = await client.query(
                'INSERT INTO skeleton_children (skeleton_account_id, name, birth_year) VALUES ($1, $2, $3) RETURNING *',
                [skeletonAccountId, target_child_name, target_child_birth_year || null]
            );
            skeletonChild = skeletonChildResult;
        }

        const skeletonChildId = skeletonChild.rows[0].id;

        // Check if connection request already exists
        const existingRequest = await client.query(
            'SELECT * FROM skeleton_connection_requests WHERE requester_parent_id = $1 AND requester_child_id = $2 AND skeleton_child_id = $3 AND is_converted = false',
            [req.user.id, myChild.rows[0].id, skeletonChildId]
        );

        if (existingRequest.rows.length > 0) {
            client.release();
            return res.status(409).json({ 
                success: false, 
                error: 'Connection request to this skeleton account already exists' 
            });
        }

        // Create skeleton connection request
        const skeletonRequestResult = await client.query(
            'INSERT INTO skeleton_connection_requests (requester_parent_id, requester_child_id, skeleton_account_id, skeleton_child_id, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, myChild.rows[0].id, skeletonAccountId, skeletonChildId, message || '']
        );

        client.release();

        res.json({
            success: true,
            data: {
                skeleton_account: skeletonAccount.rows[0],
                skeleton_child: skeletonChild.rows[0],
                skeleton_request: skeletonRequestResult.rows[0]
            }
        });

    } catch (error) {
        console.error('❌ Create skeleton account error:', error);
        res.status(500).json({ success: false, error: 'Failed to create skeleton account' });
    }
});

// Get skeleton accounts (for testing/debugging)
app.get('/api/connections/skeleton-accounts', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        
        const result = await client.query(`
            SELECT 
                sa.*,
                json_agg(
                    json_build_object(
                        'id', sc.id,
                        'uuid', sc.uuid,
                        'name', sc.name,
                        'birth_year', sc.birth_year,
                        'is_merged', sc.is_merged
                    )
                ) FILTER (WHERE sc.id IS NOT NULL) as skeleton_children,
                json_agg(DISTINCT
                    json_build_object(
                        'id', scr.id,
                        'uuid', scr.uuid,
                        'requester_parent_id', scr.requester_parent_id,
                        'message', scr.message,
                        'is_converted', scr.is_converted,
                        'created_at', scr.created_at
                    )
                ) FILTER (WHERE scr.id IS NOT NULL) as connection_requests
            FROM skeleton_accounts sa
            LEFT JOIN skeleton_children sc ON sa.id = sc.skeleton_account_id
            LEFT JOIN skeleton_connection_requests scr ON sa.id = scr.skeleton_account_id
            WHERE sa.is_merged = false
            GROUP BY sa.id
            ORDER BY sa.created_at DESC
        `);
        
        client.release();
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('❌ Get skeleton accounts error:', error);
        res.status(500).json({ success: false, error: 'Failed to get skeleton accounts' });
    }
});

// Get connections for a specific child
app.get('/api/connections/:childUuid', authenticateToken, async (req, res) => {
    try {
        const childUuid = req.params.childUuid;
        console.log(`🔍 Getting connections for specific child: ${childUuid}`);
        
        const client = await pool.connect();
        
        // Verify the child belongs to this user
        const childCheck = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [childUuid, req.user.id]
        );
        
        if (childCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }
        
        const childId = childCheck.rows[0].id;
        
        // Get active connections where this specific child is involved
        const activeConnections = await client.query(
            `SELECT c.uuid as connection_uuid,
                    c.status, 
                    c.created_at,
                    -- For child1 side (when our child is child1)
                    CASE WHEN ch1.id = $1 THEN ch2.uuid ELSE ch1.uuid END as connected_child_uuid,
                    CASE WHEN ch1.id = $1 THEN ch2.name ELSE ch1.name END as name,
                    CASE WHEN ch1.id = $1 THEN u2.username ELSE u1.username END as parentName,  
                    CASE WHEN ch1.id = $1 THEN u2.uuid ELSE u1.uuid END as parentUuid
             FROM connections c
             JOIN children ch1 ON c.child1_id = ch1.id
             JOIN children ch2 ON c.child2_id = ch2.id  
             JOIN users u1 ON ch1.parent_id = u1.id
             JOIN users u2 ON ch2.parent_id = u2.id
             WHERE (ch1.id = $1 OR ch2.id = $1) AND c.status = 'active'
             ORDER BY c.created_at DESC`,
            [childId]
        );

        // Get pending connections where this child is the SENDER (not receiver)
        const pendingConnections = await client.query(
            `SELECT cr.uuid as connection_uuid,
                    'pending' as status,
                    cr.created_at,
                    -- Our child is the requester, so we want the target child info
                    c_target.uuid as connected_child_uuid,
                    c_target.name as name,
                    u_target.username as parentName,
                    u_target.uuid as parentUuid
             FROM connection_requests cr
             JOIN children c_requester ON cr.child_uuid = c_requester.uuid
             JOIN children c_target ON cr.target_child_uuid = c_target.uuid
             JOIN users u_target ON c_target.parent_id = u_target.id
             WHERE c_requester.id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [childId]
        );

        // Combine active and pending connections
        const allConnections = [...activeConnections.rows, ...pendingConnections.rows];
        
        console.log(`✅ Found ${activeConnections.rows.length} active + ${pendingConnections.rows.length} pending = ${allConnections.length} total connections for child ${childUuid}`);
        client.release();

        res.json({
            success: true,
            data: allConnections
        });
    } catch (error) {
        console.error('Get child connections error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch child connections' });
    }
});

// Activity Invitation endpoint
app.post('/api/activities/:activityId/invite', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const { activityId } = req.params; // Now expecting UUID
        const { invited_parent_uuid, invited_parent_id, child_uuid, message } = req.body;

        console.log('🎯 Activity invite debug:', {
            activityUuid: activityId,
            invited_parent_uuid,
            invited_parent_id,
            child_uuid,
            message,
            userId: req.user.id
        });

        // Accept either UUID or ID during migration period
        if (!invited_parent_uuid && !invited_parent_id) {
            return res.status(400).json({ success: false, error: 'Invited parent UUID or ID is required' });
        }
        
        // CRITICAL VALIDATION: child_uuid is required and must not be null
        if (!child_uuid) {
            return res.status(400).json({ success: false, error: 'Child UUID is required - cannot create invitation without specifying which child to invite' });
        }

        const client = await pool.connect();
        
        try {
            // Start transaction to ensure atomicity
            await client.query('BEGIN');

            // ✅ SECURITY: Verify the activity exists and belongs to this user's child using UUID
            const activityCheck = await client.query(
                'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
                [activityId]
            );
            
            if (activityCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ success: false, error: 'Activity not found' });
            }
            
            const activity = activityCheck.rows[0];
            if (activity.parent_id !== req.user.id) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(403).json({ success: false, error: 'Not authorized to invite to this activity' });
            }

            // ✅ SECURITY: Verify that the child belongs to the invited parent using UUIDs
            const childCheck = await client.query(
                'SELECT c.id, c.name, c.parent_id, u.uuid as parent_uuid FROM children c JOIN users u ON c.parent_id = u.id WHERE c.uuid = $1',
                [child_uuid]
            );
            
            if (childCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ success: false, error: 'Child not found' });
            }
            
            const child = childCheck.rows[0];
            let finalInvitedParentId;
            let finalInvitedParentUuid;
            
            // Handle both UUID and ID cases during migration
            if (invited_parent_uuid) {
                // UUID case - verify child belongs to this parent
                if (child.parent_uuid !== invited_parent_uuid) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ 
                        success: false, 
                        error: `Child ${child.name} does not belong to the invited parent. Child belongs to parent UUID ${child.parent_uuid}, but invitation is for parent UUID ${invited_parent_uuid}` 
                    });
                }
                
                // Get the invited parent's sequential ID for database operations
                const invitedParentCheck = await client.query(
                    'SELECT id FROM users WHERE uuid = $1',
                    [invited_parent_uuid]
                );
                
                if (invitedParentCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(404).json({ success: false, error: 'Invited parent not found' });
                }
                
                finalInvitedParentId = invitedParentCheck.rows[0].id;
                finalInvitedParentUuid = invited_parent_uuid;
            } else {
                // ID case - verify child belongs to this parent 
                if (child.parent_id !== invited_parent_id) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ 
                        success: false, 
                        error: `Child ${child.name} does not belong to the invited parent. Child belongs to parent ID ${child.parent_id}, but invitation is for parent ID ${invited_parent_id}` 
                    });
                }
                
                finalInvitedParentId = invited_parent_id;
                finalInvitedParentUuid = child.parent_uuid; // Use the UUID from the child's parent
            }

            // FIRST: Clean up any corresponding pending invitation to avoid duplicates
            const pendingConnectionKey = `pending-${finalInvitedParentId}`;
            const cleanupResult = await client.query(
                `DELETE FROM pending_activity_invitations 
                 WHERE activity_id = $1 AND pending_connection_id = $2`,
                [activity.id, pendingConnectionKey]
            );
            
            if (cleanupResult.rowCount > 0) {
                console.log(`🧹 Cleaned up ${cleanupResult.rowCount} pending invitation(s) for activity ${activity.id}, user ${finalInvitedParentId}`);
            }

            // THEN: Create the activity invitation using UUIDs
            console.log('🔧 Attempting to insert invitation with values:', {
                activityUuid: activityId,
                activity_id: activity.id,
                inviter_parent_id: req.user.id,
                inviter_parent_uuid: req.user.uuid,
                invited_parent_id: finalInvitedParentId,
                invited_parent_uuid: finalInvitedParentUuid,
                child_uuid: child_uuid,
                child_id: child.id,
                message
            });

            const invitationResult = await client.query(
                `INSERT INTO activity_invitations 
                 (activity_id, activity_uuid, inviter_parent_id, inviter_parent_uuid, invited_parent_id, invited_parent_uuid, invited_child_id, invited_child_uuid, message, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') 
                 RETURNING uuid`,
                [activity.id, activityId, req.user.id, req.user.uuid, finalInvitedParentId, finalInvitedParentUuid, child.id, child_uuid, message]
            );

            // Commit the transaction
            await client.query('COMMIT');
            client.release();

            res.json({
                success: true,
                data: { 
                    uuid: invitationResult.rows[0].uuid,
                    message: 'Activity invitation sent successfully'
                }
            });

        } catch (error) {
            // Rollback on any error
            await client.query('ROLLBACK');
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Send activity invitation error:', error);
        res.status(500).json({ success: false, error: 'Failed to send activity invitation' });
    }
});

// Create Pending Invitations endpoint
app.post('/api/activities/:activityId/pending-invitations', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        const { pending_connections } = req.body;

        console.log('📝 Creating pending invitations:', {
            activityUuid,
            pending_connections,
            userId: req.user.id
        });

        if (!pending_connections || !Array.isArray(pending_connections) || pending_connections.length === 0) {
            return res.status(400).json({ success: false, error: 'Pending connections array is required' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity exists and belongs to this user's child using UUID
        const activityCheck = await client.query(
            'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
            [activityUuid]
        );
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activity = activityCheck.rows[0];
        if (activity.parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'Not authorized to create pending invitations for this activity' });
        }

        // Insert pending invitations
        const insertedRecords = [];
        for (const pendingConnectionId of pending_connections) {
            try {
                console.log('🔍 Inserting pending invitation:', {
                    activity_id: activity.id,
                    pending_connection_id: pendingConnectionId,
                    pending_connection_type: typeof pendingConnectionId
                });
                
                // Extract parent and child UUIDs from pending connection ID
                let invited_parent_uuid = null;
                let invited_child_uuid = null;
                
                if (pendingConnectionId.startsWith('pending-child-')) {
                    const uuid = pendingConnectionId.replace('pending-child-', '');
                    console.log('🔍 Processing pending-child UUID:', uuid);
                    
                    // Check if this UUID is a child UUID
                    const childCheck = await client.query('SELECT uuid, parent_id FROM children WHERE uuid = $1', [uuid]);
                    if (childCheck.rows.length > 0) {
                        invited_child_uuid = uuid;
                        // Get parent UUID from child's parent_id
                        const parentCheck = await client.query('SELECT uuid FROM users WHERE id = $1', [childCheck.rows[0].parent_id]);
                        if (parentCheck.rows.length > 0) {
                            invited_parent_uuid = parentCheck.rows[0].uuid;
                        } else {
                            console.error('❌ Parent not found for child UUID:', uuid);
                            throw new Error('Parent not found for child');
                        }
                    } else {
                        // It might be a parent UUID - let's check but don't fail if not found
                        // This maintains backward compatibility with the old behavior
                        const parentCheck = await client.query('SELECT uuid FROM users WHERE uuid = $1', [uuid]);
                        if (parentCheck.rows.length > 0) {
                            invited_parent_uuid = uuid;
                            console.log('✅ Resolved as parent UUID:', uuid);
                        } else {
                            // UUID not found in either table - this might be from old data
                            // Instead of failing, just use the UUID as-is for backward compatibility
                            console.warn('⚠️ UUID not found in children or users table, using as-is:', uuid);
                            invited_parent_uuid = uuid;
                        }
                    }
                } else if (pendingConnectionId.startsWith('pending-')) {
                    // Old format - parent UUID only
                    const uuid = pendingConnectionId.replace('pending-', '');
                    console.log('🔍 Processing old format parent UUID:', uuid);
                    
                    // Try to validate that the parent UUID exists, but don't fail for backward compatibility
                    const parentCheck = await client.query('SELECT uuid FROM users WHERE uuid = $1', [uuid]);
                    if (parentCheck.rows.length > 0) {
                        invited_parent_uuid = uuid;
                        console.log('✅ Resolved old format parent UUID:', uuid);
                    } else {
                        // Use UUID as-is for backward compatibility with old data
                        console.warn('⚠️ Old format parent UUID not found in users table, using as-is:', uuid);
                        invited_parent_uuid = uuid;
                    }
                }
                
                console.log('🔍 Resolved pending invitation UUIDs:', {
                    pendingConnectionId,
                    invited_parent_uuid,
                    invited_child_uuid
                });
                
                const result = await client.query(
                    `INSERT INTO pending_activity_invitations (activity_id, pending_connection_id, invited_parent_uuid, invited_child_uuid) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (activity_id, pending_connection_id) DO NOTHING
                     RETURNING uuid`,
                    [activity.id, pendingConnectionId, invited_parent_uuid, invited_child_uuid]
                );
                
                console.log('📊 Insert result:', {
                    rowCount: result.rowCount,
                    rows: result.rows.length,
                    returnedUuid: result.rows[0]?.uuid
                });
                
                if (result.rows.length > 0) {
                    insertedRecords.push({ uuid: result.rows[0].uuid, pending_connection_id: pendingConnectionId });
                }
            } catch (error) {
                console.error(`❌ Failed to insert pending invitation for ${pendingConnectionId}:`, error);
                
                // Only fail on critical database errors, not validation errors
                if (error.message.includes('Parent not found for child')) {
                    client.release();
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Parent not found for child',
                        details: `The parent for child UUID "${pendingConnectionId.replace('pending-child-', '')}" was not found.`
                    });
                }
                
                // For other errors, just log and continue to the next pending connection
                console.error(`⚠️ Skipping pending connection ${pendingConnectionId} due to error:`, error.message);
            }
        }

        // Update the activity to mark it as shared since it now has pending invitations
        if (insertedRecords.length > 0) {
            await client.query(
                'UPDATE activities SET is_shared = true WHERE id = $1',
                [activity.id]
            );
            console.log(`📝 Marked activity ${activity.id} as shared (has pending invitations)`);
        }

        client.release();

        res.json({
            success: true,
            data: { 
                inserted_count: insertedRecords.length,
                pending_invitations: insertedRecords,
                message: `${insertedRecords.length} pending invitations created for activity`
            }
        });
    } catch (error) {
        console.error('Create pending invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to create pending invitations' });
    }
});

// Activity Duplication endpoint
app.post('/api/activities/:activityId/duplicate', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        const { new_start_date, new_end_date } = req.body;

        if (!new_start_date) {
            return res.status(400).json({ success: false, error: 'New start date is required' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Get the original activity and verify ownership using UUID
        const originalActivity = await client.query(
            'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
            [activityUuid]
        );
        
        if (originalActivity.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activity = originalActivity.rows[0];
        if (activity.parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'Not authorized to duplicate this activity' });
        }

        // Create duplicate activity
        const duplicateResult = await client.query(
            `INSERT INTO activities 
             (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, is_shared) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING *`,
            [
                activity.child_id,
                activity.name,
                activity.description,
                new_start_date,
                new_end_date || activity.end_date,
                activity.start_time,
                activity.end_time,
                activity.location,
                activity.website_url,
                activity.cost,
                activity.max_participants,
                activity.is_shared
            ]
        );

        client.release();

        res.json({
            success: true,
            data: duplicateResult.rows[0]
        });
    } catch (error) {
        console.error('Duplicate activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to duplicate activity' });
    }
});

// Connected Activities Calendar endpoint
app.get('/api/calendar/connected-activities', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const client = await pool.connect();
        
        // Get activities from connected families
        const query = `
            SELECT DISTINCT
                a.uuid as activity_uuid,
                a.name,
                a.description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                a.website_url,
                a.cost,
                a.max_participants,
                a.created_at,
                a.updated_at,
                c.name as child_name,
                u.username as parent_name,
                true as is_connected_activity,
                false as is_host
            FROM activities a
            JOIN children c ON a.child_id = c.id
            JOIN users u ON c.parent_id = u.id
            JOIN connections conn ON (
                (conn.child1_id = c.id AND conn.child2_id IN (
                    SELECT id FROM children WHERE parent_id = $1
                )) OR
                (conn.child2_id = c.id AND conn.child1_id IN (
                    SELECT id FROM children WHERE parent_id = $1
                ))
            )
            WHERE conn.status = 'active'
            AND a.start_date >= $2
            AND a.start_date <= $3
            AND c.parent_id != $1
            ORDER BY a.start_date, a.start_time
        `;
        
        const result = await client.query(query, [req.user.id, start, end]);
        client.release();

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get connected activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connected activities' });
    }
});

// Activity Counts endpoint
app.get('/api/calendar/activity-counts', authenticateToken, async (req, res) => {
    try {
        const { start, end, include_connected } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const client = await pool.connect();
        
        let query = `
            SELECT 
                a.start_date::date as date,
                COUNT(*) as count,
                'own' as type
            FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1
            AND a.start_date >= $2
            AND a.start_date <= $3
            GROUP BY a.start_date::date
        `;
        
        const params = [req.user.id, start, end];
        
        // If include_connected is true, add connected activities
        if (include_connected === 'true') {
            query = `
                ${query}
                UNION ALL
                SELECT 
                    a.start_date::date as date,
                    COUNT(*) as count,
                    'connected' as type
                FROM activities a
                JOIN children c ON a.child_id = c.id
                JOIN connections conn ON (
                    (conn.child1_id = c.id AND conn.child2_id IN (
                        SELECT id FROM children WHERE parent_id = $1
                    )) OR
                    (conn.child2_id = c.id AND conn.child1_id IN (
                        SELECT id FROM children WHERE parent_id = $1
                    ))
                )
                WHERE conn.status = 'active'
                AND a.start_date >= $2
                AND a.start_date <= $3
                AND c.parent_id != $1
                GROUP BY a.start_date::date
            `;
        }
        
        query += ' ORDER BY date';
        
        const result = await client.query(query, params);
        client.release();

        // Process results to combine counts by date
        const countsByDate = {};
        result.rows.forEach(row => {
            const dateStr = row.date.toISOString().split('T')[0];
            if (!countsByDate[dateStr]) {
                countsByDate[dateStr] = { date: dateStr, own: 0, connected: 0, total: 0 };
            }
            countsByDate[dateStr][row.type] = parseInt(row.count);
            countsByDate[dateStr].total += parseInt(row.count);
        });

        res.json({ success: true, data: Object.values(countsByDate) });
    } catch (error) {
        console.error('Get activity counts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity counts' });
    }
});

// Get Activity Invitations endpoint
app.get('/api/activity-invitations', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        
        const query = `
            SELECT 
                ai.*,
                a.name as activity_name,
                a.description as activity_description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                c_host.name as host_child_name,
                u_host.family_name as host_family_name,
                u_host.username as host_parent_name,
                c_invited.name as invited_child_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_uuid = a.uuid
            JOIN children c_host ON a.child_id = c_host.id
            JOIN users u_host ON c_host.parent_id = u_host.id
            LEFT JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.invited_parent_id = $1
            AND ai.status = 'pending'
            AND ai.viewed_at IS NULL
            ORDER BY ai.created_at DESC
        `;
        
        console.log(`🔍 Activity invitations query for user ${req.user.id} (pending only)`);
        const result = await client.query(query, [req.user.id]);
        console.log(`📊 Found ${result.rows.length} pending activity invitations`);
        
        client.release();

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get activity invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity invitations' });
    }
});

// Add broad logging middleware for ALL activity-invitations requests
app.use('/api/activity-invitations', (req, res, next) => {
    console.log(`🔍 ACTIVITY-INVITATIONS: ${req.method} ${req.path} ${req.originalUrl}`);
    next();
});

// Mark Activity Invitation as viewed endpoint with explicit UUID pattern
app.post('/api/activity-invitations/:invitationUuid/view', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 POST /api/activity-invitations/UUID/view called with:', req.params.invitationUuid);
        console.log('👤 req.user:', req.user);
        console.log('🆔 req.user.id:', req.user.id);
        console.log('🔗 req.user.uuid:', req.user.uuid);
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationUuid;
        
        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // Get user UUID if not available in JWT
        let userUuid = req.user.uuid;
        if (!userUuid) {
            console.log('🔍 No UUID in JWT, fetching from database...');
            const userResult = await client.query('SELECT uuid FROM users WHERE id = $1', [req.user.id]);
            if (userResult.rows.length > 0) {
                userUuid = userResult.rows[0].uuid;
                console.log('✅ Found user UUID:', userUuid);
            } else {
                client.release();
                return res.status(404).json({ success: false, error: 'User not found' });
            }
        }
        
        // ✅ SECURITY: Verify the invitation exists and user has permission to view it
        // Allow both invited parent (to mark invitation as seen) AND host parent (to mark responses as seen)
        const invitation = await client.query(
            `SELECT ai.* FROM activity_invitations ai 
             JOIN users invited_user ON ai.invited_parent_id = invited_user.id 
             JOIN users host_user ON ai.inviter_parent_id = host_user.id 
             WHERE ai.uuid = $1 AND (invited_user.uuid = $2 OR host_user.uuid = $2)`,
            [invitationUuid, userUuid]
        );
        
        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity invitation not found' });
        }

        // Mark as viewed if not already viewed
        if (!invitation.rows[0].viewed_at) {
            await client.query(
                'UPDATE activity_invitations SET viewed_at = NOW() WHERE uuid = $1',
                [invitationUuid]
            );
        }

        client.release();
        res.json({ success: true, message: 'Invitation marked as viewed' });
    } catch (error) {
        console.error('Mark invitation as viewed error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark invitation as viewed' });
    }
});

// Mark Activity Invitation status change as viewed endpoint (for host notifications)
app.post('/api/activity-invitations/:invitationId/mark-status-viewed', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationId;
        
        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the invitation exists and belongs to this user (as the host) using UUID
        const invitation = await client.query(
            'SELECT * FROM activity_invitations WHERE uuid = $1',
            [invitationUuid]
        );
        
        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Invitation not found' });
        }

        // Verify user is the host (inviter) of this invitation
        if (invitation.rows[0].inviter_parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'You can only mark your own invitations as viewed' });
        }

        // Mark status change as viewed if not already viewed
        if (!invitation.rows[0].status_viewed_at) {
            await client.query(
                'UPDATE activity_invitations SET status_viewed_at = NOW() WHERE uuid = $1',
                [invitationUuid]
            );
        }

        client.release();
        res.json({ success: true, message: 'Status change notification marked as viewed' });
    } catch (error) {
        console.error('Mark status change as viewed error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark status change as viewed' });
    }
});

// Respond to Activity Invitation endpoint
app.post('/api/activity-invitations/:invitationId/respond', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationId;
        const { action } = req.body;

        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Valid action (accept/reject) is required' });
        }

        // ✅ SECURITY: Validate UUID format
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the invitation exists and belongs to this user using UUID
        // Allow responding to pending invitations, changing accepted invitations to rejected, and changing rejected back to accepted
        const invitation = await client.query(
            'SELECT ai.* FROM activity_invitations ai INNER JOIN users u ON ai.invited_parent_id = u.id WHERE ai.uuid = $1 AND u.uuid = $2 AND (ai.status = $3 OR ai.status = $4 OR ai.status = $5)',
            [invitationUuid, req.user.uuid, 'pending', 'accepted', 'rejected']
        );

        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity invitation not found or cannot be modified' });
        }

        // Don't allow accepting an already accepted invitation
        const currentStatus = invitation.rows[0].status;
        if (currentStatus === 'accepted' && action === 'accept') {
            client.release();
            return res.status(400).json({ success: false, error: 'Invitation is already accepted' });
        }

        const status = action === 'accept' ? 'accepted' : 'rejected';
        
        await client.query(
            'UPDATE activity_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP, status_viewed_at = NULL WHERE uuid = $2',
            [status, invitationUuid]
        );

        // If invitation was accepted, create a connection between the children if one doesn't exist
        if (action === 'accept') {
            const invitationData = invitation.rows[0];
            console.log(`🔗 Processing accepted invitation:`, {
                invitationUuid,
                activityId: invitationData.activity_id,
                invitedParentId: invitationData.invited_parent_id,
                invitedChildId: invitationData.invited_child_id,
                inviterParentId: invitationData.inviter_parent_id
            });
            
            // Get the activity's child_id to connect with the invited child
            const activityResult = await client.query(
                'SELECT child_id FROM activities WHERE id = $1',
                [invitationData.activity_id]
            );
            
            if (activityResult.rows.length > 0) {
                const hostChildId = activityResult.rows[0].child_id;
                const invitedChildId = invitationData.invited_child_id;
                
                console.log(`🔍 Checking connection between host child ${hostChildId} and invited child ${invitedChildId}`);
                
                // Check if connection already exists (in either direction)
                const existingConnection = await client.query(
                    `SELECT id FROM connections 
                     WHERE ((child1_id = $1 AND child2_id = $2) OR (child1_id = $2 AND child2_id = $1))
                     AND status = 'active'`,
                    [hostChildId, invitedChildId]
                );
                
                console.log(`📊 Existing connections found: ${existingConnection.rows.length}`);
                
                // Create connection if it doesn't exist
                if (existingConnection.rows.length === 0) {
                    const connectionResult = await client.query(
                        `INSERT INTO connections (child1_id, child2_id, status, created_at) 
                         VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
                         RETURNING uuid`,
                        [hostChildId, invitedChildId]
                    );
                    console.log(`✅ Created connection ${connectionResult.rows[0].uuid} between children ${hostChildId} and ${invitedChildId} after accepting activity invitation`);
                } else {
                    console.log(`ℹ️ Connection already exists between children ${hostChildId} and ${invitedChildId}:`, existingConnection.rows[0]);
                }
            } else {
                console.error(`❌ Could not find activity ${invitationData.activity_id} when processing accepted invitation`);
            }
        }

        client.release();

        res.json({ success: true, message: `Activity invitation ${status}` });
    } catch (error) {
        console.error('Respond to activity invitation error:', error);
        res.status(500).json({ success: false, error: 'Failed to respond to activity invitation' });
    }
});

// REMOVED: Replaced with unified /api/calendar/invitations endpoint
// - /api/calendar/invited-activities (accepted)
// - /api/calendar/pending-invitations (pending)  
// - /api/calendar/declined-invitations (rejected)

// Unified calendar endpoint for all invitations (pending, accepted, declined)
app.get('/api/calendar/invitations', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }
        
        const client = await pool.connect();
        
        const query = `
            SELECT DISTINCT a.uuid as activity_uuid, a.name as activity_name, a.start_date, a.end_date, a.start_time, a.end_time, 
                    a.website_url, a.created_at, a.updated_at, a.description as activity_description, 
                    a.location, a.cost, a.series_id, a.is_recurring, a.recurring_days, a.series_start_date,
                    c.name as child_name, c.uuid as child_uuid,
                    u.username as host_parent_username,
                    ai.message as invitation_message,
                    ai.uuid as invitation_uuid,
                    ai.status,
                    ai.viewed_at,
                    c_invited.name as invited_child_name
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            INNER JOIN users u ON c.parent_id = u.id
            INNER JOIN activity_invitations ai ON a.id = ai.activity_id
            LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
            WHERE (ai.invited_parent_id = $1 OR ai.inviter_parent_id = $1)
              AND a.start_date <= $3
              AND (a.end_date IS NULL OR a.end_date >= $2)
            ORDER BY a.start_date, a.start_time, ai.status
        `;
        
        console.log(`🔍 Calendar invitations query for user ${req.user.id} (${start} to ${end})`);
        
        // Debug: Check ALL activity invitations for this user (no date filter)
        const debugQuery = await client.query(
            'SELECT ai.uuid as invitation_uuid, ai.status, a.name as activity_name, a.start_date FROM activity_invitations ai JOIN activities a ON ai.activity_id = a.id WHERE ai.invited_parent_id = $1 OR ai.inviter_parent_id = $1',
            [req.user.id]
        );
        console.log(`🔍 DEBUG: Found ${debugQuery.rows.length} total activity invitations for user ${req.user.id} (any date):`, 
            debugQuery.rows.map(r => ({
                activity: r.activity_name,
                status: r.status,
                start_date: r.start_date,
                invitation_uuid: r.invitation_uuid
            }))
        );
        
        const result = await client.query(query, [req.user.id, start, end]);
        console.log(`📊 Found ${result.rows.length} total invitations:`, result.rows.map(r => ({
            activity: r.activity_name,
            date: r.start_date,
            child: r.invited_child_name,
            status: r.status,
            invitation_uuid: r.invitation_uuid
        })));
        
        const acceptedInvitations = result.rows.filter(r => r.status === 'accepted');
        console.log(`✅ Found ${acceptedInvitations.length} ACCEPTED invitations:`, acceptedInvitations.map(r => ({
            activity: r.activity_name,
            child: r.invited_child_name,
            invitation_uuid: r.invitation_uuid
        })));
        
        client.release();
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to get invitations' });
    }
});

// Batch endpoint - Get all invitation data in one call
app.get('/api/invitations/batch', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }
        
        const client = await pool.connect();
        
        // Get all calendar invitations (same as /api/calendar/invitations)
        const calendarQuery = `
            SELECT DISTINCT a.uuid as activity_uuid, a.name as activity_name, a.start_date, a.end_date, a.start_time, a.end_time, 
                    a.website_url, a.created_at, a.updated_at, a.description as activity_description, 
                    a.location, a.cost, a.series_id, a.is_recurring, a.recurring_days, a.series_start_date,
                    c.name as child_name, c.uuid as child_uuid,
                    u.username as host_parent_username,
                    ai.message as invitation_message,
                    ai.uuid as invitation_uuid,
                    ai.status,
                    ai.viewed_at,
                    c_invited.name as invited_child_name
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            INNER JOIN users u ON c.parent_id = u.id
            INNER JOIN activity_invitations ai ON a.id = ai.activity_id
            LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
            WHERE (ai.invited_parent_id = $1 OR ai.inviter_parent_id = $1)
              AND a.start_date <= $3
              AND (a.end_date IS NULL OR a.end_date >= $2)
            ORDER BY a.start_date, a.start_time, ai.status
        `;
        
        // Get unviewed pending invitations (same as /api/activity-invitations)
        const pendingQuery = `
            SELECT 
                ai.*,
                a.name as activity_name,
                a.description as activity_description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                c_host.name as host_child_name,
                u_host.family_name as host_family_name,
                u_host.username as host_parent_name,
                c_invited.name as invited_child_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_uuid = a.uuid
            JOIN children c_host ON a.child_id = c_host.id
            JOIN users u_host ON c_host.parent_id = u_host.id
            LEFT JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.invited_parent_id = $1
            AND ai.status = 'pending'
            AND ai.viewed_at IS NULL
            ORDER BY ai.created_at DESC
        `;
        
        console.log(`🔥 BATCH: Getting all invitation data for user ${req.user.id} (${start} to ${end})`);
        
        // Execute both queries in parallel
        const [calendarResult, pendingResult] = await Promise.all([
            client.query(calendarQuery, [req.user.id, start, end]),
            client.query(pendingQuery, [req.user.id])
        ]);
        
        client.release();
        
        const batchData = {
            calendar_invitations: calendarResult.rows,
            pending_invitations: pendingResult.rows,
            stats: {
                total_calendar: calendarResult.rows.length,
                total_pending: pendingResult.rows.length,
                by_status: {}
            }
        };
        
        // Calculate stats by status
        calendarResult.rows.forEach(invitation => {
            const status = invitation.status || 'unknown';
            batchData.stats.by_status[status] = (batchData.stats.by_status[status] || 0) + 1;
        });
        
        console.log(`📊 BATCH: Returning ${batchData.stats.total_calendar} calendar invitations, ${batchData.stats.total_pending} pending`);
        
        res.json({ success: true, data: batchData });
        
    } catch (error) {
        console.error('❌ Error in batch invitations:', error);
        res.status(500).json({ success: false, error: 'Failed to get batch invitations' });
    }
});

// Notification dismissal endpoints
app.post('/api/notifications/dismiss', authenticateToken, async (req, res) => {
    try {
        const { notificationId, type } = req.body;
        const userId = req.user.id;
        
        console.log(`🔕 Dismissing notification: ${notificationId} for user ${userId}`);
        
        if (!notificationId) {
            return res.status(400).json({ success: false, error: 'Notification ID is required' });
        }
        
        const client = await pool.connect();
        
        // Create dismissed_notifications table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS dismissed_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id VARCHAR(255) NOT NULL,
                notification_type VARCHAR(100),
                dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, notification_id)
            )
        `);
        
        // Insert dismissal record (ON CONFLICT DO NOTHING to handle duplicates)
        await client.query(`
            INSERT INTO dismissed_notifications (user_id, notification_id, notification_type)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, notification_id) DO NOTHING
        `, [userId, notificationId, type || 'unknown']);
        
        client.release();
        
        console.log(`✅ Notification ${notificationId} dismissed for user ${userId}`);
        res.json({ success: true, message: 'Notification dismissed' });
        
    } catch (error) {
        console.error('❌ Error dismissing notification:', error);
        res.status(500).json({ success: false, error: 'Failed to dismiss notification' });
    }
});

app.get('/api/notifications/dismissed', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const client = await pool.connect();
        
        // Create dismissed_notifications table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS dismissed_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id VARCHAR(255) NOT NULL,
                notification_type VARCHAR(100),
                dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, notification_id)
            )
        `);
        
        // Get all dismissed notifications for this user
        const result = await client.query(`
            SELECT notification_id, notification_type, dismissed_at
            FROM dismissed_notifications
            WHERE user_id = $1
            ORDER BY dismissed_at DESC
        `, [userId]);
        
        client.release();
        
        const dismissedIds = result.rows.map(row => row.notification_id);
        console.log(`📋 User ${userId} has ${dismissedIds.length} dismissed notifications`);
        
        res.json({ success: true, data: dismissedIds });
        
    } catch (error) {
        console.error('❌ Error getting dismissed notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to get dismissed notifications' });
    }
});

// Get notifications for the notification bell (constructs and filters server-side)
app.get('/api/notifications/bell', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await pool.connect();
        
        // Create dismissed_notifications table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS dismissed_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id VARCHAR(255) NOT NULL,
                notification_type VARCHAR(100),
                dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, notification_id)
            )
        `);
        
        // Get dismissed notification IDs for this user
        const dismissedResult = await client.query(`
            SELECT notification_id FROM dismissed_notifications WHERE user_id = $1
        `, [userId]);
        const dismissedIds = new Set(dismissedResult.rows.map(row => row.notification_id));
        
        console.log(`🔕 User ${userId} has ${dismissedIds.size} dismissed notifications`);
        
        // Get connection requests
        const connectionRequestsResult = await client.query(`
            SELECT cr.*, u.username as requester_username, u.email as requester_email
            FROM connection_requests cr
            JOIN users u ON cr.requester_id = u.id
            WHERE cr.target_parent_id = $1 AND cr.status = 'pending'
            ORDER BY cr.created_at DESC
        `, [userId]);
        
        // Get activity invitations (using same logic as batch endpoint - pending invitations query)
        const invitationsResult = await client.query(`
            SELECT 
                ai.*,
                a.name as activity_name,
                a.description as activity_description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                a.series_id,
                c_host.name as host_child_name,
                u_host.family_name as host_family_name,
                u_host.username as host_parent_name,
                c_invited.name as invited_child_name, c_invited.id as invited_child_id
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_uuid = a.uuid
            JOIN children c_host ON a.child_id = c_host.id
            JOIN users u_host ON c_host.parent_id = u_host.id
            LEFT JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.invited_parent_id = $1
            AND ai.status = 'pending'
            ORDER BY ai.created_at DESC
        `, [userId]);
        
        // Construct notifications (same logic as NotificationBell frontend)
        const allNotifications = [];
        
        // Add connection request notifications
        connectionRequestsResult.rows.forEach(request => {
            const notificationId = `connection_${request.uuid}`;
            if (!dismissedIds.has(notificationId)) {
                allNotifications.push({
                    id: notificationId,
                    type: 'connection_request',
                    title: 'New Connection Request',
                    message: `${request.requester_username} wants to connect`,
                    timestamp: request.created_at,
                    read: false,
                    data: { requestUuid: request.uuid }
                });
            }
        });
        
        // Group recurring invitations (same logic as original frontend)
        const processedSeriesIds = new Set();
        const groupedInvitations = new Map();
        const singleInvitations = [];
        
        // console.log(`🔔 Processing ${invitationsResult.rows.length} pending invitations for user ${userId}`);
        // console.log(`🔔 Sample invitations:`, invitationsResult.rows.slice(0, 3).map(inv => ({
        //     activity_name: inv.activity_name,
        //     series_id: inv.series_id,
        //     status: inv.status
        // })));
        
        invitationsResult.rows.forEach(invitation => {
            const seriesId = invitation.series_id;
            
            if (seriesId && !processedSeriesIds.has(seriesId)) {
                const seriesInvitations = invitationsResult.rows.filter(inv => inv.series_id === seriesId);
                
                console.log(`🔔 Series ${seriesId}: Found ${seriesInvitations.length} invitations for "${invitation.activity_name}"`);
                
                // Any invitation with series_id should be treated as recurring, even if only 1 is pending
                groupedInvitations.set(seriesId, {
                    invitations: seriesInvitations,
                    displayName: invitation.activity_name
                });
                processedSeriesIds.add(seriesId);
                // console.log(`🔔 ✅ Added to grouped invitations: ${seriesId} (recurring series)`);
            } else if (!seriesId) {
                singleInvitations.push(invitation);
                // console.log(`🔔 ➡️ Added to single invitations: "${invitation.activity_name}" (no series_id)`);
            }
        });
        
        // console.log(`🔔 Final grouping: ${groupedInvitations.size} recurring series, ${singleInvitations.length} single invitations`);
        
        // Add single summary notification for all recurring activity groups
        if (groupedInvitations.size > 0) {
            const recurringSeriesCount = groupedInvitations.size;
            const allRecurringInvitations = [];
            
            // Collect all invitations from recurring series
            groupedInvitations.forEach((groupData) => {
                allRecurringInvitations.push(...groupData.invitations);
            });
            
            // Get the most recent timestamp
            const mostRecentTimestamp = allRecurringInvitations
                .map(inv => new Date(inv.created_at).getTime())
                .reduce((max, time) => Math.max(max, time), 0);
            
            const notificationId = 'recurring_activity_invitations_summary';
            if (!dismissedIds.has(notificationId)) {
                allNotifications.push({
                    id: notificationId,
                    type: 'activity_invitation',
                    title: 'Recurring Activity Invitations',
                    message: `${recurringSeriesCount} recurring activity invitation${recurringSeriesCount !== 1 ? 's' : ''}`,
                    timestamp: new Date(mostRecentTimestamp).toISOString(),
                    read: false,
                    data: { 
                        type: 'recurring_summary',
                        seriesCount: recurringSeriesCount,
                        totalActivities: allRecurringInvitations.length,
                        groupedInvitations: Object.fromEntries(groupedInvitations)
                    }
                });
            }
        }
        
        // Add single invitations summary
        if (singleInvitations.length > 0) {
            const notificationId = 'single_activity_invitations_summary';
            if (!dismissedIds.has(notificationId)) {
                allNotifications.push({
                    id: notificationId,
                    type: 'activity_invitation',
                    title: 'Activity Invitations',
                    message: `${singleInvitations.length} new activity invitation${singleInvitations.length !== 1 ? 's' : ''}`,
                    timestamp: singleInvitations[0]?.created_at || new Date().toISOString(),
                    read: false,
                    data: { type: 'single_activities' }
                });
            }
        }
        
        // Get parent children data for hosted activity notifications
        const childrenResult = await client.query('SELECT * FROM children WHERE parent_id = $1', [userId]);
        const parentChildren = childrenResult.rows;
        
        // Load hosted activity notifications (activities where our children are hosts and guests have responded)
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const calendarActivitiesResult = await client.query(`
            SELECT a.*, c.name as child_name, c.uuid as child_uuid,
                   COALESCE((SELECT COUNT(*) FROM activity_invitations ai_status 
                            WHERE ai_status.activity_id = a.id 
                            AND ai_status.inviter_parent_id = $1 
                            AND ai_status.status IN ('accepted', 'rejected')
                            AND ai_status.status_viewed_at IS NULL 
                            AND ai_status.updated_at > ai_status.created_at), 0) as unviewed_status_changes,
                   (SELECT string_agg(DISTINCT ai_status.status, ',') FROM activity_invitations ai_status 
                    WHERE ai_status.activity_id = a.id 
                    AND ai_status.inviter_parent_id = $1 
                    AND ai_status.status IN ('accepted', 'rejected')
                    AND ai_status.status_viewed_at IS NULL 
                    AND ai_status.updated_at > ai_status.created_at) as unviewed_statuses
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1 
              AND a.start_date <= $3
              AND (a.end_date IS NULL OR a.end_date >= $2)
            ORDER BY a.start_date, a.start_time
        `, [userId, startDate, endDate]);
        
        if (calendarActivitiesResult.rows.length > 0) {
            const allActivities = calendarActivitiesResult.rows;
            
            // Count different types of activity responses where our children are hosts
            let totalAcceptances = 0;
            let totalDeclines = 0;
            
            for (const activity of allActivities) {
                const hostChild = parentChildren.find((child) => child.uuid === activity.child_uuid);
                const hasUnviewedResponses = parseInt(activity.unviewed_status_changes || '0') > 0;
                
                if (hostChild && hasUnviewedResponses) {
                    // Try to categorize by status types if available
                    if (activity.unviewed_statuses) {
                        const statuses = activity.unviewed_statuses.split(',');
                        statuses.forEach((status) => {
                            if (status.trim() === 'accepted') {
                                totalAcceptances++;
                            } else if (status.trim() === 'rejected' || status.trim() === 'declined') {
                                totalDeclines++;
                            }
                        });
                    }
                }
            }
            
            // Create summary notifications for activity responses
            if (totalAcceptances > 0) {
                const notificationId = 'activity_acceptances_summary';
                if (!dismissedIds.has(notificationId)) {
                    allNotifications.push({
                        id: notificationId,
                        type: 'activity_invitation',
                        title: 'Activity Acceptances',
                        message: `${totalAcceptances} activity invitation${totalAcceptances !== 1 ? 's' : ''} accepted`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        data: { type: 'acceptances', count: totalAcceptances }
                    });
                }
            }
            
            if (totalDeclines > 0) {
                const notificationId = 'activity_declines_summary';
                if (!dismissedIds.has(notificationId)) {
                    allNotifications.push({
                        id: notificationId,
                        type: 'activity_invitation',
                        title: 'Activity Declines',
                        message: `${totalDeclines} activity invitation${totalDeclines !== 1 ? 's' : ''} declined`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        data: { type: 'declines', count: totalDeclines }
                    });
                }
            }
        }
        
        client.release();
        
        // console.log(`🔔 Constructed ${allNotifications.length} notifications for user ${userId} (${dismissedIds.size} were filtered out)`);
        
        res.json({ success: true, data: allNotifications });
        
    } catch (error) {
        console.error('❌ Error loading bell notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
});

// Test endpoint for debugging
app.get('/api/activities/:activityId/test', (req, res) => {
    console.log(`🧪 TEST ENDPOINT HIT: ActivityID ${req.params.activityId}`);
    res.json({ success: true, message: 'Test endpoint working', activityId: req.params.activityId });
});

// Get activity participants (all invitees and their status)
app.get('/api/activities/:activityId/participants', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        console.log(`🔍 Getting participants for activity ${activityUuid}, user ${req.user.id}`);
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Check if activity exists using UUID
        console.log(`🔍 Checking if activity ${activityUuid} exists`);
        const activityExists = await client.query('SELECT id, name FROM activities WHERE uuid = $1', [activityUuid]);
        console.log(`📊 Activity ${activityUuid} exists:`, activityExists.rows.length > 0, activityExists.rows);
        
        if (activityExists.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activityId = activityExists.rows[0].id; // Get sequential ID for internal queries
        
        // First verify that the user has permission to view this activity (either host, invited, or pending invitation)
        const permissionCheck = await client.query(`
            SELECT 1 FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            WHERE a.id = $1 AND c.parent_id = $2
            UNION
            SELECT 1 FROM activity_invitations ai
            WHERE ai.activity_id = $1 AND ai.invited_parent_id = $2
            UNION
            SELECT 1 FROM pending_activity_invitations pai
            WHERE pai.activity_id = $1 AND pai.pending_connection_id LIKE 'pending-%' 
            AND pai.invited_parent_uuid = (SELECT uuid FROM users WHERE id = $2)
        `, [activityId, req.user.id]);
        
        if (permissionCheck.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        // Get the activity host information (child and parent details)
        const hostQuery = await client.query(`
            SELECT u.username as host_parent_name, 
                   u.id as host_parent_id, 
                   c.name as host_child_name,
                   c.id as host_child_id,
                   a.name as activity_name
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            INNER JOIN users u ON c.parent_id = u.id
            WHERE a.id = $1
        `, [activityId]);
        
        // Get all invitees for this activity (actual invitations)
        const participantsQuery = await client.query(`
            SELECT ai.uuid as invitation_uuid,
                   ai.status,
                   ai.message,
                   ai.created_at as invited_at,
                   ai.updated_at as responded_at,
                   ai.viewed_at,
                   ai.status_viewed_at,
                   u.username as parent_name,
                   c_invited.name as child_name,
                   c_invited.uuid as child_uuid,
                   'sent' as invitation_type
            FROM activity_invitations ai
            INNER JOIN users u ON ai.invited_parent_id = u.id
            INNER JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.activity_uuid = $1
            ORDER BY ai.created_at DESC
        `, [activityUuid]);

        // Get host's child ID to check for connections
        const hostChildQuery = await client.query(`
            SELECT c.id as host_child_id 
            FROM activities a 
            INNER JOIN children c ON a.child_id = c.id 
            WHERE a.id = $1
        `, [activityId]);
        const hostChildId = hostChildQuery.rows[0]?.host_child_id;

        // Also get pending invitations that haven't been sent yet, with connection status
        const pendingInvitationsQuery = await client.query(`
            SELECT pai.uuid as pending_uuid,
                   'pending' as status,
                   CASE 
                       WHEN conn.id IS NOT NULL THEN 'Connected - invitation will be sent automatically'
                       ELSE 'Pending connection - invitation will be sent when connection is accepted'
                   END as message,
                   pai.created_at as invited_at,
                   null as responded_at,
                   null as viewed_at,
                   COALESCE(u_direct.username, u_legacy.username) as parent_name,
                   COALESCE(c_direct.name, c_legacy.name) as child_name,
                   COALESCE(c_direct.uuid, c_legacy.uuid) as child_uuid,
                   CASE 
                       WHEN conn.id IS NOT NULL THEN 'connected_pending_invite'
                       ELSE 'pending_connection'
                   END as invitation_type,
                   conn.status as connection_status
            FROM pending_activity_invitations pai
            -- Direct joins using new columns (preferred)
            LEFT JOIN users u_direct ON pai.invited_parent_uuid = u_direct.uuid
            LEFT JOIN children c_direct ON pai.invited_child_uuid = c_direct.uuid
            -- Legacy joins using pending_connection_id (fallback)
            LEFT JOIN children c_legacy ON (
                pai.invited_parent_uuid IS NULL AND (
                    CASE 
                        -- New format: pending-child-{childUuid} - show specific child only
                        WHEN pai.pending_connection_id LIKE 'pending-child-%' 
                        THEN c_legacy.uuid = REPLACE(pai.pending_connection_id, 'pending-child-', '')::uuid
                        -- Old format: pending-{parentUuid} - show all children from that parent  
                        WHEN pai.pending_connection_id LIKE 'pending-%' AND pai.pending_connection_id NOT LIKE 'pending-child-%'
                        THEN c_legacy.parent_id = (SELECT id FROM users WHERE uuid = REPLACE(pai.pending_connection_id, 'pending-', '')::uuid)
                        ELSE FALSE
                    END
                )
            )
            LEFT JOIN users u_legacy ON c_legacy.parent_id = u_legacy.id
            -- Connection status check
            LEFT JOIN connections conn ON (
                (conn.child1_id = $2 AND conn.child2_id = COALESCE(c_direct.id, c_legacy.id)) OR 
                (conn.child2_id = $2 AND conn.child1_id = COALESCE(c_direct.id, c_legacy.id))
            ) AND conn.status = 'active'
            WHERE pai.activity_id = $1
            ORDER BY pai.created_at DESC
        `, [activityId, hostChildId]);
        
        // Get current user's invitation status for this activity
        const userInvitationQuery = await client.query(`
            SELECT ai.status, ai.uuid as invitation_uuid,
                   c.name as invited_child_name, c.uuid as invited_child_uuid
            FROM activity_invitations ai
            LEFT JOIN children c ON ai.invited_child_id = c.id
            WHERE ai.activity_id = $1 AND ai.invited_parent_id = $2
        `, [activityId, req.user.id]);
        
        const userInvitation = userInvitationQuery.rows.length > 0 ? userInvitationQuery.rows[0] : null;
        
        client.release();
        
        // Combine actual participants and pending invitations
        const allParticipants = [
            ...participantsQuery.rows,
            ...pendingInvitationsQuery.rows
        ];
        
        const result = {
            host: hostQuery.rows[0] || null,
            participants: allParticipants,
            user_invitation: userInvitation
        };
        
        console.log(`📊 Found ${participantsQuery.rows.length} sent invitations + ${pendingInvitationsQuery.rows.length} pending invitations = ${allParticipants.length} total for activity ${activityId}`);
        console.log(`🏠 Host:`, result.host);
        console.log(`👥 All Participants:`, result.participants);
        
        const acceptedParticipants = result.participants.filter(p => p.status === 'accepted');
        console.log(`✅ ACCEPTED participants (${acceptedParticipants.length}):`, acceptedParticipants.map(p => ({
            child_name: p.child_name,
            child_id: p.child_id,
            parent_name: p.parent_name,
            status: p.status,
            invitation_id: p.invitation_id
        })));
        
        const pendingParticipants = result.participants.filter(p => p.status === 'pending');
        console.log(`⏳ PENDING participants (${pendingParticipants.length}):`, pendingParticipants.map(p => ({
            child_name: p.child_name,
            child_id: p.child_id,
            parent_name: p.parent_name,
            status: p.status
        })));
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('🚨 Get activity participants error:', error);
        console.error('🔍 Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail,
            activityId: req.params.activityId,
            userId: req.user.id
        });
        res.status(500).json({ success: false, error: 'Failed to get activity participants' });
    }
});

// Get participants for multiple activities in batch
app.post('/api/activities/batch/participants', authenticateToken, async (req, res) => {
    try {
        const { activityUuids } = req.body;
        console.log(`🔍 Getting batch participants for ${activityUuids?.length || 0} activities, user ${req.user.id}`);
        
        if (!activityUuids || !Array.isArray(activityUuids) || activityUuids.length === 0) {
            return res.status(400).json({ success: false, error: 'Activity UUIDs array is required' });
        }
        
        if (activityUuids.length > 50) {
            return res.status(400).json({ success: false, error: 'Too many activities requested (max 50)' });
        }
        
        const client = await pool.connect();
        const results = {};
        
        for (const activityUuid of activityUuids) {
            try {
                // Check if activity exists
                const activityExists = await client.query('SELECT id, name FROM activities WHERE uuid = $1', [activityUuid]);
                
                if (activityExists.rows.length === 0) {
                    results[activityUuid] = { success: false, error: 'Activity not found' };
                    continue;
                }
                
                const activityId = activityExists.rows[0].id;
                
                // Check permissions
                const permissionCheck = await client.query(`
                    SELECT 1 FROM activities a
                    INNER JOIN children c ON a.child_id = c.id
                    WHERE a.id = $1 AND c.parent_id = $2
                    UNION
                    SELECT 1 FROM activity_invitations ai
                    WHERE ai.activity_id = $1 AND ai.invited_parent_id = $2
                    UNION
                    SELECT 1 FROM pending_activity_invitations pai
                    WHERE pai.activity_id = $1 AND pai.pending_connection_id LIKE 'pending-%' 
                    AND pai.invited_parent_uuid = (SELECT uuid FROM users WHERE id = $2)
                `, [activityId, req.user.id]);
                
                if (permissionCheck.rows.length === 0) {
                    results[activityUuid] = { success: false, error: 'Permission denied' };
                    continue;
                }
                
                // Get host info and participants (same logic as single endpoint but condensed)
                const hostQuery = await client.query(`
                    SELECT u.username as host_parent_name, c.name as host_child_name, a.name as activity_name
                    FROM activities a
                    INNER JOIN children c ON a.child_id = c.id
                    INNER JOIN users u ON c.parent_id = u.id
                    WHERE a.id = $1
                `, [activityId]);
                
                const participantsQuery = await client.query(`
                    SELECT 
                        COALESCE(u_direct.username, u_legacy.username) as parent_name,
                        COALESCE(c_direct.name, c_legacy.name) as child_name,
                        COALESCE(c_direct.uuid, c_legacy.uuid) as child_uuid,
                        'pending' as status
                    FROM pending_activity_invitations pai
                    LEFT JOIN users u_direct ON pai.invited_parent_uuid = u_direct.uuid
                    LEFT JOIN children c_direct ON pai.invited_child_uuid = c_direct.uuid
                    LEFT JOIN children c_legacy ON (pai.invited_parent_uuid IS NULL AND c_legacy.uuid = REPLACE(pai.pending_connection_id, 'pending-child-', '')::uuid)
                    LEFT JOIN users u_legacy ON c_legacy.parent_id = u_legacy.id
                    WHERE pai.activity_id = $1
                    UNION ALL
                    SELECT 
                        u.username as parent_name,
                        c.name as child_name,
                        c.uuid as child_uuid,
                        ai.status
                    FROM activity_invitations ai
                    INNER JOIN children c ON ai.invited_child_id = c.id
                    INNER JOIN users u ON c.parent_id = u.id
                    WHERE ai.activity_id = $1
                `, [activityId]);
                
                results[activityUuid] = {
                    success: true,
                    data: {
                        host: hostQuery.rows[0] || null,
                        participants: participantsQuery.rows || []
                    }
                };
                
            } catch (error) {
                console.error(`Error processing activity ${activityUuid}:`, error);
                results[activityUuid] = { success: false, error: 'Failed to load participants' };
            }
        }
        
        client.release();
        console.log(`✅ Batch participants loaded for ${Object.keys(results).length} activities`);
        res.json({ success: true, data: results });
        
    } catch (error) {
        console.error('🚨 Batch participants error:', error);
        res.status(500).json({ success: false, error: 'Failed to get batch participants' });
    }
});

// Mark activity as "can't attend" by host
app.post('/api/activities/:activityUuid/cant-attend', authenticateToken, async (req, res) => {
    try {
        const activityUuid = req.params.activityUuid;
        const userUuid = req.user.uuid || req.user.id;
        
        console.log(`🚫 Host marking activity ${activityUuid} as can't attend for user ${userUuid}`);
        
        const client = await pool.connect();
        
        // Get user UUID if not in JWT token
        if (!req.user.uuid) {
            console.log('🔍 No UUID in JWT, fetching from database...');
            const userResult = await client.query('SELECT uuid FROM users WHERE id = $1', [req.user.id]);
            if (userResult.rows.length > 0) {
                userUuid = userResult.rows[0].uuid;
                console.log('✅ Found user UUID:', userUuid);
            } else {
                client.release();
                return res.status(404).json({ success: false, error: 'User not found' });
            }
        }
        
        // Verify user owns this activity
        const ownershipCheck = await client.query(`
            SELECT a.id, a.name, a.host_cant_attend, c.parent_id, u.uuid as parent_uuid
            FROM activities a 
            JOIN children c ON a.child_id = c.id 
            JOIN users u ON c.parent_id = u.id 
            WHERE a.uuid = $1 AND u.uuid = $2
        `, [activityUuid, userUuid]);
        
        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'You can only mark your own activities as can\'t attend' });
        }
        
        const activity = ownershipCheck.rows[0];
        const currentStatus = activity.host_cant_attend;
        
        // Toggle the can't attend status
        const newStatus = !currentStatus;
        
        await client.query(`
            UPDATE activities 
            SET host_cant_attend = $1, updated_at = NOW()
            WHERE uuid = $2
        `, [newStatus, activityUuid]);
        
        // Notify all invited guests about host's attendance status change by updating their invitation messages
        if (newStatus) { // Only notify when host marks can't attend (not when they unmark it)
            await client.query(`
                UPDATE activity_invitations 
                SET message = $1, updated_at = NOW()
                WHERE activity_uuid = $2 
                AND status IN ('pending', 'accepted')
            `, [
                `🚫 HOST UPDATE: The host can't attend "${activity.name}" but the activity is still available for you to join with other participants.`,
                activityUuid
            ]);
            
            console.log(`📧 Updated invitation messages to notify guests about host can't attend`);
        }
        
        console.log(`✅ Activity ${activityUuid} host_cant_attend updated from ${currentStatus} to ${newStatus}`);
        
        client.release();
        res.json({ 
            success: true, 
            message: newStatus ? 'Marked as can\'t attend' : 'Marked as can attend',
            host_cant_attend: newStatus
        });
    } catch (error) {
        console.error('🚨 Mark can\'t attend error:', error);
        res.status(500).json({ success: false, error: 'Failed to update attendance status' });
    }
});

// ================================
// ACTIVITY TEMPLATES ENDPOINTS
// ================================

// Get user's activity templates
app.get('/api/activity-templates', authenticateToken, async (req, res) => {
    try {
        const parentId = req.user.id;
        
        // Get parent UUID from parent ID
        const client = await pool.connect();
        const parentResult = await client.query('SELECT uuid FROM users WHERE id = $1', [parentId]);
        if (parentResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Parent not found' });
        }
        const parentUuid = parentResult.rows[0].uuid;
        
        const result = await client.query(`
            SELECT * FROM activity_templates 
            WHERE parent_uuid = $1 
            ORDER BY last_used_at DESC, usage_count DESC, name ASC
        `, [parentUuid]);
        
        client.release();
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('🚨 Get activity templates error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity templates' });
    }
});

// Get activity types (for dropdown)
app.get('/api/activity-types', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT * FROM activity_types 
            ORDER BY name ASC
        `);
        
        client.release();
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('🚨 Get activity types error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity types' });
    }
});

// Create activity template
app.post('/api/activity-templates', authenticateToken, async (req, res) => {
    try {
        const parentId = req.user.id;
        
        // Get parent UUID from parent ID
        const client = await pool.connect();
        const parentResult = await client.query('SELECT uuid FROM users WHERE id = $1', [parentId]);
        if (parentResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Parent not found' });
        }
        const parentUuid = parentResult.rows[0].uuid;
        
        const {
            name,
            description,
            location,
            website_url,
            activity_type,
            cost,
            max_participants,
            typical_duration_hours,
            typical_start_time
        } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Template name is required' });
        }

        const result = await client.query(`
            INSERT INTO activity_templates (
                parent_uuid, name, description, location, website_url, 
                activity_type, cost, max_participants, typical_duration_hours, typical_start_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            parentUuid,
            name.trim(),
            description?.trim() || null,
            location?.trim() || null,
            website_url?.trim() || null,
            activity_type?.trim() || null,
            cost ? parseFloat(cost) : null,
            max_participants ? parseInt(max_participants) : null,
            typical_duration_hours ? parseInt(typical_duration_hours) : null,
            typical_start_time?.trim() || null
        ]);
        
        client.release();
        console.log(`✅ Created activity template: ${name} for parent ${parentUuid}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('🚨 Create activity template error:', error);
        res.status(500).json({ success: false, error: 'Failed to create activity template' });
    }
});

// Update activity template
app.put('/api/activity-templates/:templateUuid', authenticateToken, async (req, res) => {
    try {
        const parentId = req.user.id;
        const templateUuid = req.params.templateUuid;
        
        // Get parent UUID from parent ID
        const client = await pool.connect();
        const parentResult = await client.query('SELECT uuid FROM users WHERE id = $1', [parentId]);
        if (parentResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Parent not found' });
        }
        const parentUuid = parentResult.rows[0].uuid;
        
        const {
            name,
            description,
            location,
            website_url,
            activity_type,
            cost,
            max_participants,
            typical_duration_hours,
            typical_start_time
        } = req.body;

        if (!name || name.trim() === '') {
            client.release();
            return res.status(400).json({ success: false, error: 'Template name is required' });
        }
        
        // Check ownership
        const ownershipCheck = await client.query(`
            SELECT uuid FROM activity_templates 
            WHERE uuid = $1 AND parent_uuid = $2
        `, [templateUuid, parentUuid]);

        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'Template not found or access denied' });
        }

        const result = await client.query(`
            UPDATE activity_templates SET
                name = $3,
                description = $4,
                location = $5,
                website_url = $6,
                activity_type = $7,
                cost = $8,
                max_participants = $9,
                typical_duration_hours = $10,
                typical_start_time = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE uuid = $1 AND parent_uuid = $2
            RETURNING *
        `, [
            templateUuid,
            parentUuid,
            name.trim(),
            description?.trim() || null,
            location?.trim() || null,
            website_url?.trim() || null,
            activity_type?.trim() || null,
            cost ? parseFloat(cost) : null,
            max_participants ? parseInt(max_participants) : null,
            typical_duration_hours ? parseInt(typical_duration_hours) : null,
            typical_start_time?.trim() || null
        ]);
        
        client.release();
        console.log(`✅ Updated activity template: ${templateUuid}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('🚨 Update activity template error:', error);
        res.status(500).json({ success: false, error: 'Failed to update activity template' });
    }
});

// Delete activity template
app.delete('/api/activity-templates/:templateUuid', authenticateToken, async (req, res) => {
    try {
        const parentId = req.user.id;
        const templateUuid = req.params.templateUuid;

        // Get parent UUID from parent ID
        const client = await pool.connect();
        const parentResult = await client.query('SELECT uuid FROM users WHERE id = $1', [parentId]);
        if (parentResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Parent not found' });
        }
        const parentUuid = parentResult.rows[0].uuid;
        
        const result = await client.query(`
            DELETE FROM activity_templates 
            WHERE uuid = $1 AND parent_uuid = $2
            RETURNING name
        `, [templateUuid, parentUuid]);

        if (result.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'Template not found or access denied' });
        }
        
        client.release();
        console.log(`✅ Deleted activity template: ${result.rows[0].name}`);
        res.json({ success: true, message: 'Activity template deleted successfully' });
    } catch (error) {
        console.error('🚨 Delete activity template error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete activity template' });
    }
});

// Use activity template (increment usage count and update last_used_at)
app.post('/api/activity-templates/:templateUuid/use', authenticateToken, async (req, res) => {
    try {
        const parentId = req.user.id;
        const templateUuid = req.params.templateUuid;

        // Get parent UUID from parent ID
        const client = await pool.connect();
        const parentResult = await client.query('SELECT uuid FROM users WHERE id = $1', [parentId]);
        if (parentResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Parent not found' });
        }
        const parentUuid = parentResult.rows[0].uuid;
        
        const result = await client.query(`
            UPDATE activity_templates SET
                usage_count = usage_count + 1,
                last_used_at = CURRENT_TIMESTAMP
            WHERE uuid = $1 AND parent_uuid = $2
            RETURNING *
        `, [templateUuid, parentUuid]);

        if (result.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'Template not found or access denied' });
        }
        
        client.release();
        console.log(`✅ Template usage tracked: ${result.rows[0].name}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('🚨 Use activity template error:', error);
        res.status(500).json({ success: false, error: 'Failed to track template usage' });
    }
});

// Start server
async function createOrUpdateClubUsage(client, activityId, name, website_url, activity_type, location, start_date, cost) {
    console.log('🏢 Creating/updating club usage for:', { name, website_url, activity_type, location });
    
    if (!website_url || !website_url.trim() || !activity_type || !activity_type.trim()) {
        console.log('❌ Missing website_url or activity_type - skipping club logic');
        return;
    }

    try {
        // Find or create club record
        const existingClub = await client.query(`
            SELECT id FROM clubs 
            WHERE COALESCE(website_url, '') = COALESCE($1, '') 
            AND COALESCE(location, '') = COALESCE($2, '') 
            AND activity_type = $3
        `, [website_url.trim(), location || '', activity_type.trim()]);
        
        let clubId;
        if (existingClub.rows.length === 0) {
            // Create new club
            console.log('🏢 Creating new club record');
            const newClubResult = await client.query(`
                INSERT INTO clubs (name, website_url, activity_type, location, cost, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id
            `, [name.trim(), website_url.trim(), activity_type.trim(), location || null, cost || null]);
            clubId = newClubResult.rows[0].id;
            console.log('✅ Created club record:', name.trim());
        } else {
            clubId = existingClub.rows[0].id;
            console.log('✅ Found existing club:', clubId);
        }
        
        // Create or update club_usage record
        await client.query(`
            INSERT INTO club_usage (club_id, activity_id, usage_date, activity_start_date)
            VALUES ($1, $2, CURRENT_DATE, $3)
            ON CONFLICT (club_id, activity_id) DO UPDATE SET
                usage_date = CURRENT_DATE,
                activity_start_date = EXCLUDED.activity_start_date
        `, [clubId, activityId, start_date]);
        console.log('✅ Created/updated club_usage record');
        
    } catch (error) {
        console.error('❌ Club usage error:', error);
    }
}

async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('🚀 SMS & Email Backend Server with PostgreSQL Started!');
            console.log('📡 Server running on http://localhost:' + PORT + ' - v2.1');
            console.log('🔗 Health check: http://localhost:' + PORT + '/health');
            console.log('📱📧 Ready to handle SMS and Email requests');
            console.log('🗄️ Connected to PostgreSQL Database');
            console.log('\n📋 Available endpoints:');
            console.log('  GET  /health - Server health check');
            console.log('  POST /api/auth/login - User authentication');
            console.log('  POST /api/auth/register - User registration');
            console.log('  GET  /api/auth/verify - Token verification');
            console.log('  POST /api/auth/forgot-password - Password reset request');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    try {
        await pool.end();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
    process.exit(0);
});

// 🔔 AUTO-NOTIFICATION: Bidirectional auto-notify function
async function processAutoNotifications(client, requesterId, targetParentId, requesterChildId, targetChildId) {
    console.log('🔔 Processing bidirectional auto-notifications:', {
        requesterId,
        targetParentId,
        requesterChildId,
        targetChildId
    });

    try {
        const today = new Date().toISOString().split('T')[0];
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const endDate = oneYearLater.toISOString().split('T')[0];

        // Direction 1: Get requester's auto-notify activities and send to target parent
        console.log('🔄 Direction 1: Requester → Target');
        const requesterActivities = await client.query(`
            SELECT a.*, c.name as child_name FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1 
              AND a.start_date >= $2
              AND a.start_date <= $3
              AND a.auto_notify_new_connections = true
        `, [requesterId, today, endDate]);

        console.log(`📋 Found ${requesterActivities.rows.length} auto-notify activities from requester`);

        for (const activity of requesterActivities.rows) {
            try {
                console.log(`📧 Sending invitation for "${activity.name}" to target parent ${targetParentId}`);
                await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    activity.id,
                    requesterId,
                    targetParentId,
                    targetChildId,
                    `Welcome to our connection! ${activity.child_name || 'Your child'} would like to invite your child to join: ${activity.name}`,
                    'pending'
                ]);
                console.log(`✅ Invitation sent for "${activity.name}"`);
                
                // Update the activity's invited_children field
                await updateActivityInvitedChildren(client, activity.id);
                
            } catch (inviteError) {
                console.error(`❌ Failed to send invitation for "${activity.name}":`, inviteError);
            }
        }

        // Direction 2: Get target parent's auto-notify activities and send to requester
        console.log('🔄 Direction 2: Target → Requester');
        const targetActivities = await client.query(`
            SELECT a.*, c.name as child_name FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1 
              AND a.start_date >= $2
              AND a.start_date <= $3
              AND a.auto_notify_new_connections = true
        `, [targetParentId, today, endDate]);

        console.log(`📋 Found ${targetActivities.rows.length} auto-notify activities from target parent`);

        for (const activity of targetActivities.rows) {
            try {
                console.log(`📧 Sending invitation for "${activity.name}" to requester ${requesterId}`);
                await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    activity.id,
                    targetParentId,
                    requesterId,
                    requesterChildId,
                    `Welcome to our connection! ${activity.child_name || 'Your child'} would like to invite your child to join: ${activity.name}`,
                    'pending'
                ]);
                console.log(`✅ Invitation sent for "${activity.name}"`);
                
                // Update the activity's invited_children field
                await updateActivityInvitedChildren(client, activity.id);
                
            } catch (inviteError) {
                console.error(`❌ Failed to send invitation for "${activity.name}":`, inviteError);
            }
        }

        // Direction 3: Process pending invitations for both users
        console.log('🔄 Direction 3: Processing pending invitations');
        console.log(`🔍 Looking for pending invitations between:`, {
            requesterParentId: requesterId,
            targetParentId: targetParentId,
            requesterChildId: requesterChildId,
            targetChildId: targetChildId
        });
        
        // Get the new connection ID to map pending connection IDs
        const connectionResult = await client.query(`
            SELECT id FROM connections 
            WHERE (child1_id = $1 AND child2_id = $2) OR (child1_id = $2 AND child2_id = $1)
            ORDER BY created_at DESC 
            LIMIT 1
        `, [requesterChildId, targetChildId]);
        
        if (connectionResult.rows.length > 0) {
            
            // Process pending invitations for requester (activities where target was selected as pending)
            const requesterPendingKey = `pending-${targetParentId}`;
            const requesterPendingInvitations = await client.query(`
                SELECT pai.*, a.*, c.name as child_name FROM pending_activity_invitations pai
                JOIN activities a ON pai.activity_id = a.id
                JOIN children c ON a.child_id = c.id
                WHERE c.parent_id = $1 
                  AND pai.pending_connection_id = $2
                  AND a.start_date >= $3
            `, [requesterId, requesterPendingKey, today]);
            
            console.log(`📋 Found ${requesterPendingInvitations.rows.length} pending invitations from requester for key: ${requesterPendingKey}`);
            if (requesterPendingInvitations.rows.length > 0) {
                console.log(`🔍 Pending invitations details:`, requesterPendingInvitations.rows.map(p => ({
                    activity: p.name,
                    activity_id: p.activity_id,
                    pending_connection_id: p.pending_connection_id,
                    child_name: p.child_name
                })));
            }
            
            for (const pendingInvite of requesterPendingInvitations.rows) {
                try {
                    console.log(`📧 Sending pending invitation for "${pendingInvite.name}" to target parent ${targetParentId}`);
                    await client.query(`
                        INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        pendingInvite.activity_id,
                        requesterId,
                        targetParentId,
                        targetChildId,
                        `${pendingInvite.child_name || 'Your child'} would like to invite your child to join: ${pendingInvite.name}`,
                        'pending'
                    ]);
                    
                    // Remove the pending invitation since it's now been sent
                    await client.query(`
                        DELETE FROM pending_activity_invitations WHERE id = $1
                    `, [pendingInvite.id]);
                    
                    console.log(`✅ Pending invitation sent and removed for "${pendingInvite.name}"`);
                } catch (inviteError) {
                    console.error(`❌ Failed to send pending invitation for "${pendingInvite.name}":`, inviteError);
                }
            }
            
            // Process pending invitations for target (activities where requester was selected as pending)
            const targetPendingKey = `pending-${requesterId}`;
            const targetPendingInvitations = await client.query(`
                SELECT pai.*, a.*, c.name as child_name FROM pending_activity_invitations pai
                JOIN activities a ON pai.activity_id = a.id
                JOIN children c ON a.child_id = c.id
                WHERE c.parent_id = $1 
                  AND pai.pending_connection_id = $2
                  AND a.start_date >= $3
            `, [targetParentId, targetPendingKey, today]);
            
            console.log(`📋 Found ${targetPendingInvitations.rows.length} pending invitations from target parent for key: ${targetPendingKey}`);
            if (targetPendingInvitations.rows.length > 0) {
                console.log(`🔍 Target pending invitations details:`, targetPendingInvitations.rows.map(p => ({
                    activity: p.name,
                    activity_id: p.activity_id,
                    pending_connection_id: p.pending_connection_id,
                    child_name: p.child_name
                })));
            }
            
            for (const pendingInvite of targetPendingInvitations.rows) {
                try {
                    console.log(`📧 Sending pending invitation for "${pendingInvite.name}" to requester ${requesterId}`);
                    await client.query(`
                        INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        pendingInvite.activity_id,
                        targetParentId,
                        requesterId,
                        requesterChildId,
                        `${pendingInvite.child_name || 'Your child'} would like to invite your child to join: ${pendingInvite.name}`,
                        'pending'
                    ]);
                    
                    // Remove the pending invitation since it's now been sent
                    await client.query(`
                        DELETE FROM pending_activity_invitations WHERE id = $1
                    `, [pendingInvite.id]);
                    
                    console.log(`✅ Pending invitation sent and removed for "${pendingInvite.name}"`);
                } catch (inviteError) {
                    console.error(`❌ Failed to send pending invitation for "${pendingInvite.name}":`, inviteError);
                }
            }
        }

        console.log('🎉 Bidirectional auto-notifications and pending invitations complete');
    } catch (error) {
        console.error('❌ Auto-notification processing failed:', error);
    }
}

// 🔔 PENDING INVITATIONS: Process pending invitations when connection request is accepted
async function processPendingInvitations(client, connectionRequestData) {
    console.log('🔍 Processing pending invitations for connection request:', connectionRequestData.uuid);
    
    try {
        // Get the target parent UUID and child UUID to build possible pending keys
        const targetParentQuery = await client.query('SELECT uuid FROM users WHERE id = $1', [connectionRequestData.target_parent_id]);
        if (targetParentQuery.rows.length === 0) {
            console.log('❌ Target parent not found for ID:', connectionRequestData.target_parent_id);
            return;
        }
        
        const targetParentUuid = targetParentQuery.rows[0].uuid;
        
        // Build possible pending keys (old and new formats)
        const pendingKeys = [`pending-${targetParentUuid}`]; // Old format
        
        // Add new format if target child UUID is available
        if (connectionRequestData.target_child_uuid) {
            pendingKeys.push(`pending-child-${connectionRequestData.target_child_uuid}`);
        }
        
        console.log('🔍 Looking for pending invitations with keys:', pendingKeys);
        
        const pendingInvitations = await client.query(`
            SELECT pai.*, a.name as activity_name, a.child_id, a.start_date, a.end_date
            FROM pending_activity_invitations pai
            JOIN activities a ON pai.activity_id = a.id
            WHERE pai.pending_connection_id = ANY($1)
        `, [pendingKeys]);
        
        console.log(`📋 Found ${pendingInvitations.rows.length} pending invitations to process`);
        
        if (pendingInvitations.rows.length === 0) {
            console.log('❌ No pending invitations found for this connection request');
            return;
        }
        
        // Get the requester and target parent details
        const { requester_id, target_parent_id, child_uuid, target_child_uuid } = connectionRequestData;
        
        // Get target child ID if not specified
        let targetChildId = null;
        console.log('🔍 Looking up target child ID with UUID:', connectionRequestData.target_child_uuid);
        if (connectionRequestData.target_child_uuid) {
            const targetChildQuery = await client.query('SELECT id FROM children WHERE uuid = $1', [connectionRequestData.target_child_uuid]);
            if (targetChildQuery.rows.length > 0) {
                targetChildId = targetChildQuery.rows[0].id;
                console.log('✅ Found target child ID:', targetChildId);
            } else {
                console.log('❌ Target child not found with UUID:', connectionRequestData.target_child_uuid);
            }
        } else {
            console.log('🔍 No target child UUID provided, using default child for parent:', connectionRequestData.target_parent_id);
            // Get the first child of the target parent (default behavior)
            const targetChildrenQuery = await client.query('SELECT id FROM children WHERE parent_id = $1 ORDER BY id LIMIT 1', [connectionRequestData.target_parent_id]);
            if (targetChildrenQuery.rows.length > 0) {
                targetChildId = targetChildrenQuery.rows[0].id;
                console.log('✅ Using default target child ID:', targetChildId);
            } else {
                console.log('❌ No children found for target parent:', connectionRequestData.target_parent_id);
            }
        }
        
        if (!targetChildId) {
            console.log('❌ No target child found for pending invitations');
            return;
        }
        
        // Process each pending invitation and track successful ones
        console.log(`🔄 Processing ${pendingInvitations.rows.length} pending invitations...`);
        const successfullyProcessedIds = [];
        
        for (const pending of pendingInvitations.rows) {
            try {
                console.log(`📧 Converting pending invitation to actual invitation for activity: ${pending.activity_name} (ID: ${pending.activity_id})`);
                console.log(`📋 Invitation parameters:`, {
                    activity_id: pending.activity_id,
                    inviter_parent_id: requester_id,
                    invited_parent_id: target_parent_id,
                    invited_child_id: targetChildId,
                    message: `You're invited to join: ${pending.activity_name}`,
                    status: 'pending'
                });
                
                // Create the actual activity invitation
                const insertResult = await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [
                    pending.activity_id,
                    requester_id,
                    target_parent_id,
                    targetChildId,
                    `You're invited to join: ${pending.activity_name}`,
                    'pending'
                ]);
                
                if (insertResult.rows.length > 0) {
                    console.log(`✅ Created invitation for "${pending.activity_name}" (invitation ID: ${insertResult.rows[0].id})`);
                    // Track this pending invitation as successfully processed
                    successfullyProcessedIds.push(pending.id);
                } else {
                    console.log(`⚠️ Invitation for "${pending.activity_name}" already exists (skipped due to conflict)`);
                    // Still mark as processed if it already exists
                    successfullyProcessedIds.push(pending.id);
                }
                
                // Update the activity's invited_children field
                try {
                    await updateActivityInvitedChildren(client, pending.activity_id);
                    console.log(`✅ Updated invited_children field for activity ${pending.activity_id}`);
                } catch (error) {
                    console.log(`⚠️ Could not update invited_children field (column may not exist): ${error.message}`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to process pending invitation for activity ${pending.activity_name}:`, error);
                // Don't add to successfullyProcessedIds if there was an error
            }
        }
        
        // Remove only the successfully processed pending invitations
        if (successfullyProcessedIds.length > 0) {
            await client.query('DELETE FROM pending_activity_invitations WHERE id = ANY($1)', [successfullyProcessedIds]);
            console.log(`🗑️ Removed ${successfullyProcessedIds.length} successfully processed pending invitations (IDs: ${successfullyProcessedIds.join(', ')})`);
        } else {
            console.log('⚠️ No pending invitations were successfully processed, nothing to delete');
        }
        
    } catch (error) {
        console.error('❌ Pending invitations processing failed:', error);
    }
}

// 🔄 UPDATE ACTIVITY INVITED CHILDREN: Update activity's invited_children field when invitations are sent
async function updateActivityInvitedChildren(client, activityId) {
    try {
        // Get all current invitations for this activity
        const invitations = await client.query(`
            SELECT ai.invited_child_id, c.name as child_name, c.uuid as child_uuid, ai.status
            FROM activity_invitations ai
            JOIN children c ON ai.invited_child_id = c.id
            WHERE ai.activity_id = $1
        `, [activityId]);
        
        // Build the invited_children array
        const invitedChildren = invitations.rows.map(inv => ({
            child_id: inv.invited_child_id,
            child_name: inv.child_name,
            child_uuid: inv.child_uuid,
            status: inv.status
        }));
        
        // Update the activity's invited_children field
        await client.query(`
            UPDATE activities 
            SET invited_children = $1 
            WHERE id = $2
        `, [JSON.stringify(invitedChildren), activityId]);
        
        console.log(`✅ Updated invited_children for activity ${activityId} with ${invitedChildren.length} children`);
        
    } catch (error) {
        console.error('❌ Failed to update activity invited_children:', error);
    }
}

// ===== SKELETON ACCOUNT MERGING =====
// Merges skeleton accounts into real accounts during registration
async function mergeSkeletonAccounts(client, newUser, email, phone) {
    try {
        console.log('🔄 Checking for skeleton accounts to merge:', { email, phone, userId: newUser.id });
        
        // Find skeleton accounts matching email or phone
        const skeletonAccountsQuery = await client.query(`
            SELECT * FROM skeleton_accounts 
            WHERE (contact_method = $1 OR contact_method = $2) 
            AND is_merged = false
        `, [email, phone]);
        
        if (skeletonAccountsQuery.rows.length === 0) {
            console.log('✅ No skeleton accounts found to merge');
            return;
        }
        
        console.log(`📋 Found ${skeletonAccountsQuery.rows.length} skeleton accounts to merge`);
        
        for (const skeletonAccount of skeletonAccountsQuery.rows) {
            console.log(`🔄 Merging skeleton account ${skeletonAccount.id} (${skeletonAccount.contact_method})`);
            
            // Get skeleton children for this account
            const skeletonChildren = await client.query(`
                SELECT * FROM skeleton_children 
                WHERE skeleton_account_id = $1 AND is_merged = false
            `, [skeletonAccount.id]);
            
            console.log(`👶 Found ${skeletonChildren.rows.length} skeleton children to merge`);
            
            // Create real children from skeleton children
            const createdChildren = [];
            for (const skeletonChild of skeletonChildren.rows) {
                console.log(`👶 Creating real child: ${skeletonChild.name}`);
                
                const childResult = await client.query(`
                    INSERT INTO children (parent_id, name)
                    VALUES ($1, $2)
                    RETURNING *
                `, [newUser.id, skeletonChild.name]);
                
                const newChild = childResult.rows[0];
                createdChildren.push({ skeleton: skeletonChild, real: newChild });
                
                // Mark skeleton child as merged
                await client.query(`
                    UPDATE skeleton_children 
                    SET is_merged = true, merged_with_child_id = $1
                    WHERE id = $2
                `, [newChild.id, skeletonChild.id]);
                
                console.log(`✅ Created real child ${newChild.name} (${newChild.uuid}) from skeleton ${skeletonChild.id}`);
            }
            
            // Get skeleton connection requests for this account
            const skeletonRequests = await client.query(`
                SELECT scr.*, u.username as requester_username, c.name as requester_child_name, c.uuid as requester_child_uuid
                FROM skeleton_connection_requests scr
                JOIN users u ON scr.requester_parent_id = u.id
                JOIN children c ON scr.requester_child_id = c.id
                WHERE scr.skeleton_account_id = $1 AND scr.is_converted = false
            `, [skeletonAccount.id]);
            
            console.log(`📞 Found ${skeletonRequests.rows.length} skeleton connection requests to convert`);
            
            // Convert skeleton connection requests to real connection requests
            for (const skeletonRequest of skeletonRequests.rows) {
                // Find the matching real child
                const matchingChild = createdChildren.find(child => 
                    child.skeleton.id === skeletonRequest.skeleton_child_id
                );
                
                if (matchingChild) {
                    console.log(`📞 Converting connection request from ${skeletonRequest.requester_username} to real request`);
                    
                    const connectionRequestResult = await client.query(`
                        INSERT INTO connection_requests (
                            requester_id, target_parent_id, child_uuid, target_child_uuid, message, status
                        ) VALUES ($1, $2, $3, $4, $5, 'pending')
                        RETURNING *
                    `, [
                        skeletonRequest.requester_parent_id,
                        newUser.id,
                        skeletonRequest.requester_child_uuid,
                        matchingChild.real.uuid,
                        skeletonRequest.message
                    ]);
                    
                    const realRequest = connectionRequestResult.rows[0];
                    
                    // Mark skeleton request as converted
                    await client.query(`
                        UPDATE skeleton_connection_requests
                        SET is_converted = true, converted_to_request_id = $1
                        WHERE id = $2
                    `, [realRequest.id, skeletonRequest.id]);
                    
                    console.log(`✅ Converted skeleton request ${skeletonRequest.id} to real request ${realRequest.uuid}`);
                } else {
                    console.error(`❌ Could not find matching real child for skeleton request ${skeletonRequest.id}`);
                }
            }
            
            // Mark skeleton account as merged
            await client.query(`
                UPDATE skeleton_accounts
                SET is_merged = true, merged_with_user_id = $1, merged_at = NOW()
                WHERE id = $2
            `, [newUser.id, skeletonAccount.id]);
            
            console.log(`✅ Marked skeleton account ${skeletonAccount.id} as merged`);
        }
        
        console.log(`🎉 Successfully merged ${skeletonAccountsQuery.rows.length} skeleton accounts`);
        
    } catch (error) {
        console.error('❌ Skeleton account merging failed:', error);
        // Don't throw error - let registration succeed even if merging fails
    }
}

// Admin endpoint to cleanup duplicate pending invitations
app.post('/api/admin/cleanup-pending-invitations', authenticateToken, async (req, res) => {
    try {
        console.log('🧹 Admin cleanup: removing duplicate pending invitations');
        
        const client = await pool.connect();
        
        // Find pending invitations that have corresponding activity invitations
        const duplicatesQuery = await client.query(`
            SELECT pai.id as pending_id, pai.activity_id, pai.pending_connection_id,
                   ai.id as actual_invitation_id, ai.invited_parent_id
            FROM pending_activity_invitations pai
            JOIN activity_invitations ai ON pai.activity_id = ai.activity_id
            WHERE CAST(REPLACE(pai.pending_connection_id, 'pending-', '') AS INTEGER) = ai.invited_parent_id
        `);
        
        console.log(`🔍 Found ${duplicatesQuery.rows.length} duplicate pending invitations`);
        
        if (duplicatesQuery.rows.length > 0) {
            // Delete the duplicate pending invitations
            const pendingIdsToDelete = duplicatesQuery.rows.map(row => row.pending_id);
            
            const deleteResult = await client.query(`
                DELETE FROM pending_activity_invitations 
                WHERE id = ANY($1)
                RETURNING id, activity_id, pending_connection_id
            `, [pendingIdsToDelete]);
            
            console.log(`✅ Deleted ${deleteResult.rows.length} duplicate pending invitations`);
            
            client.release();
            
            res.json({
                success: true,
                message: `Cleaned up ${deleteResult.rows.length} duplicate pending invitations`,
                deletedRecords: deleteResult.rows
            });
        } else {
            client.release();
            res.json({
                success: true,
                message: 'No duplicate pending invitations found'
            });
        }
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cleanup pending invitations',
            details: error.message 
        });
    }
});

// Admin endpoint to update club location
app.put('/api/admin/update-club-location', authenticateToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    try {
        const { website_url, location } = req.body;
        
        if (!website_url || !location) {
            return res.status(400).json({ success: false, error: 'website_url and location are required' });
        }
        
        const client = await pool.connect();
        
        // Update club location
        const result = await client.query(
            'UPDATE clubs SET location = $1, updated_at = NOW() WHERE website_url = $2 AND (location IS NULL OR location = \'\') RETURNING *',
            [location, website_url]
        );
        
        client.release();
        
        console.log(`🔧 Updated ${result.rows.length} club records with location:`, location);
        
        res.json({
            success: true,
            message: `Updated ${result.rows.length} club records`,
            updated: result.rows
        });
    } catch (error) {
        console.error('Error updating club location:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin endpoint to backfill club usage data from existing activities
app.post('/api/admin/backfill-club-usage', async (req, res) => {
    // Temporarily public for testing
    
    try {
        const client = await pool.connect();
        
        console.log('🔄 Starting club usage backfill from existing activities...');
        
        // Get all activities that have website_url and activity_type
        const activities = await client.query(`
            SELECT a.id, a.website_url, a.activity_type, a.location, a.start_date, a.child_id,
                   c.age as child_age
            FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE a.website_url IS NOT NULL 
            AND a.website_url != ''
            AND a.activity_type IS NOT NULL
            AND a.activity_type != ''
            ORDER BY a.start_date
        `);
        
        console.log(`📊 Found ${activities.rows.length} activities to process`);
        let processed = 0;
        let skipped = 0;
        
        for (const activity of activities.rows) {
            try {
                // Find or create matching club
                const club = await client.query(`
                    SELECT id FROM clubs 
                    WHERE COALESCE(website_url, '') = COALESCE($1, '') 
                    AND COALESCE(location, '') = COALESCE($2, '') 
                    AND activity_type = $3
                `, [activity.website_url, activity.location, activity.activity_type]);
                
                if (club.rows.length === 0) {
                    console.log(`⚠️ No matching club found for activity ${activity.id}`);
                    skipped++;
                    continue;
                }
                
                const clubId = club.rows[0].id;
                
                // Insert usage record (ignore conflicts)
                await client.query(`
                    INSERT INTO club_usage (club_id, activity_id, child_id, child_age, usage_date, activity_start_date)
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                    ON CONFLICT (club_id, activity_id, child_id, activity_start_date) DO NOTHING
                `, [clubId, activity.id, activity.child_id, activity.child_age, activity.start_date]);
                
                processed++;
                
                if (processed % 50 === 0) {
                    console.log(`📈 Processed ${processed} activities...`);
                }
                
            } catch (activityError) {
                console.error(`Error processing activity ${activity.id}:`, activityError);
                skipped++;
            }
        }
        
        // Update club summary stats
        console.log('🔄 Updating club summary statistics...');
        await client.query(`
            UPDATE clubs SET 
                usage_count = subq.usage_count_6m,
                first_used_date = subq.first_used_date,
                last_used_date = subq.last_used_date,
                min_child_age = subq.min_child_age,
                max_child_age = subq.max_child_age,
                updated_at = NOW()
            FROM (
                SELECT 
                    cu.club_id,
                    COUNT(DISTINCT cu.activity_id) as usage_count_6m,
                    MIN(cu.activity_start_date) as first_used_date,
                    MAX(cu.activity_start_date) as last_used_date,
                    MIN(cu.child_age) FILTER (WHERE cu.child_age IS NOT NULL) as min_child_age,
                    MAX(cu.child_age) FILTER (WHERE cu.child_age IS NOT NULL) as max_child_age
                FROM club_usage cu 
                WHERE cu.activity_start_date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY cu.club_id
            ) subq
            WHERE clubs.id = subq.club_id
        `);
        
        client.release();
        
        console.log(`✅ Backfill completed: ${processed} processed, ${skipped} skipped`);
        
        res.json({
            success: true,
            message: `Backfill completed successfully`,
            stats: {
                total_activities: activities.rows.length,
                processed: processed,
                skipped: skipped
            }
        });
        
    } catch (error) {
        console.error('Error during club usage backfill:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Temporary cleanup endpoint for testing
app.delete('/api/admin/cleanup-recent-requests', authenticateToken, async (req, res) => {
    try {
        console.log('🧹 ADMIN: Cleaning up recent accepted connection requests');
        
        const client = await pool.connect();
        
        // Find recent accepted connection requests
        const acceptedRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.updated_at,
                   u1.email as requester_email,
                   u2.email as target_email
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            WHERE cr.status = 'accepted' 
            AND cr.updated_at > NOW() - INTERVAL '2 hours'
            ORDER BY cr.updated_at DESC
        `);
        
        console.log(`Found ${acceptedRequests.rows.length} recent accepted requests`);
        
        // Delete them
        let deletedRequests = 0;
        for (const req of acceptedRequests.rows) {
            await client.query('DELETE FROM connection_requests WHERE id = $1', [req.id]);
            deletedRequests++;
            console.log(`Deleted request: ${req.requester_email} → ${req.target_email}`);
        }
        
        // Also clean up recent connections
        const recentConnections = await client.query(`
            SELECT c.id, c.uuid, c.created_at,
                   u1.email as parent1_email,
                   u2.email as parent2_email
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id
            LEFT JOIN users u1 ON ch1.parent_id = u1.id
            LEFT JOIN users u2 ON ch2.parent_id = u2.id
            WHERE c.created_at > NOW() - INTERVAL '2 hours'
            AND c.status = 'active'
        `);
        
        let deletedConnections = 0;
        for (const conn of recentConnections.rows) {
            await client.query('DELETE FROM connections WHERE id = $1', [conn.id]);
            deletedConnections++;
            console.log(`Deleted connection: ${conn.parent1_email} ↔ ${conn.parent2_email}`);
        }
        
        client.release();
        
        res.json({
            success: true,
            message: 'Cleanup completed',
            deleted: {
                requests: deletedRequests,
                connections: deletedConnections
            }
        });
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cleanup',
            details: error.message 
        });
    }
});

// Admin endpoint to delete specific test accounts
app.delete('/api/admin/delete-test-account', authenticateToken, async (req, res) => {
    try {
        const { email, user_id } = req.body;
        
        // Must provide either email or user_id
        if (!email && !user_id) {
            return res.status(400).json({
                success: false,
                error: 'Must provide either email or user_id'
            });
        }
        
        console.log('🧹 ADMIN: Deleting test account', { email, user_id });
        
        const client = await pool.connect();
        
        let userQuery;
        let queryParams;
        
        if (email) {
            userQuery = 'SELECT id, email, phone FROM users WHERE email = $1';
            queryParams = [email];
        } else {
            userQuery = 'SELECT id, email, phone FROM users WHERE id = $1';
            queryParams = [user_id];
        }
        
        const userResult = await client.query(userQuery, queryParams);
        
        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        // Safety check: only allow deletion of @example.com accounts
        if (!user.email.endsWith('@example.com')) {
            client.release();
            return res.status(403).json({
                success: false,
                error: 'Can only delete test accounts with @example.com domains'
            });
        }
        
        console.log(`🗑️ Deleting test account: ${user.email} (ID: ${user.id})`);
        
        // Begin transaction for safe deletion
        await client.query('BEGIN');
        
        try {
            // Get all children for this user
            const childrenResult = await client.query('SELECT id FROM children WHERE parent_id = $1', [user.id]);
            const childIds = childrenResult.rows.map(row => row.id);
            
            console.log(`Found ${childIds.length} children to clean up`);
            
            // Delete in order to respect foreign key constraints
            
            // 1. Delete activity invitations for activities created by this user
            await client.query(`
                DELETE FROM activity_invitations 
                WHERE activity_id IN (SELECT id FROM activities WHERE parent_id = $1)
            `, [user.id]);
            
            // 2. Delete pending activity invitations for activities created by this user
            await client.query(`
                DELETE FROM pending_activity_invitations 
                WHERE activity_id IN (SELECT id FROM activities WHERE parent_id = $1)
            `, [user.id]);
            
            // 3. Delete activity invitations where this user was invited
            await client.query('DELETE FROM activity_invitations WHERE invited_parent_id = $1', [user.id]);
            
            // 4. Delete activities created by this user
            const deletedActivitiesResult = await client.query('DELETE FROM activities WHERE parent_id = $1 RETURNING id', [user.id]);
            console.log(`Deleted ${deletedActivitiesResult.rows.length} activities`);
            
            // 5. Delete connections involving this user's children
            if (childIds.length > 0) {
                const deletedConnectionsResult = await client.query(`
                    DELETE FROM connections 
                    WHERE child1_id = ANY($1) OR child2_id = ANY($1)
                    RETURNING id
                `, [childIds]);
                console.log(`Deleted ${deletedConnectionsResult.rows.length} connections`);
            }
            
            // 6. Delete connection requests where this user was involved
            const deletedRequestsResult = await client.query(`
                DELETE FROM connection_requests 
                WHERE requester_id = $1 OR target_parent_id = $1
                RETURNING id
            `, [user.id]);
            console.log(`Deleted ${deletedRequestsResult.rows.length} connection requests`);
            
            // 7. Delete children
            if (childIds.length > 0) {
                await client.query('DELETE FROM children WHERE parent_id = $1', [user.id]);
                console.log(`Deleted ${childIds.length} children`);
            }
            
            // 8. Finally delete the user
            await client.query('DELETE FROM users WHERE id = $1', [user.id]);
            console.log(`Deleted user: ${user.email}`);
            
            // Commit transaction
            await client.query('COMMIT');
            
            client.release();
            
            res.json({
                success: true,
                message: 'Test account deleted successfully',
                deleted: {
                    user: user.email,
                    user_id: user.id,
                    children: childIds.length,
                    activities: deletedActivitiesResult.rows.length,
                    connections: childIds.length > 0 ? deletedConnectionsResult.rows.length : 0,
                    requests: deletedRequestsResult.rows.length
                }
            });
            
        } catch (deleteError) {
            await client.query('ROLLBACK');
            client.release();
            throw deleteError;
        }
        
    } catch (error) {
        console.error('❌ Delete test account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete test account',
            details: error.message
        });
    }
});

// Get clubs data for browsing
app.get('/api/clubs', authenticateToken, async (req, res) => {
    try {
        const { activity_type, search, location } = req.query;
        
        // Updated query to calculate 6-month usage from actual activity dates
        let query = `
            SELECT c.id, c.name, c.description, c.website_url, c.activity_type, c.location, c.cost, 
                   c.website_title, c.website_description, c.website_favicon, c.metadata_fetched_at, c.created_at,
                   c.min_child_age, c.max_child_age,
                   COALESCE(usage_stats.usage_count_6m, 0) as usage_count,
                   usage_stats.first_used_date, 
                   usage_stats.last_used_date
            FROM clubs c
            LEFT JOIN (
                SELECT 
                    cu.club_id,
                    COUNT(DISTINCT cu.activity_id) as usage_count_6m,
                    MIN(cu.activity_start_date) as first_used_date,
                    MAX(cu.activity_start_date) as last_used_date
                FROM club_usage cu 
                WHERE cu.activity_start_date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY cu.club_id
            ) usage_stats ON c.id = usage_stats.club_id`;
        let params = [];
        let conditions = [];
        
        // Filter by activity type if provided
        if (activity_type && activity_type.trim()) {
            conditions.push('activity_type = $' + (params.length + 1));
            params.push(activity_type.trim());
        }
        
        // Filter by search term if provided
        if (search && search.trim()) {
            const searchTerm = '%' + search.trim().toLowerCase() + '%';
            conditions.push('(LOWER(name) LIKE $' + (params.length + 1) + ' OR LOWER(description) LIKE $' + (params.length + 1) + ' OR LOWER(activity_type) LIKE $' + (params.length + 1) + ' OR LOWER(location) LIKE $' + (params.length + 1) + ')');
            params.push(searchTerm);
        }
        
        // Filter by location if provided
        if (location && location.trim()) {
            const locationTerm = '%' + location.trim().toLowerCase() + '%';
            conditions.push('LOWER(location) LIKE $' + (params.length + 1));
            params.push(locationTerm);
        }
        
        // Add WHERE clause if we have conditions
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Order by name
        query += ' ORDER BY name ASC';
        
        console.log('🏢 Getting clubs with query:', query, 'params:', params, 'filters:', { activity_type, search, location });
        
        const client = await pool.connect();
        const result = await client.query(query, params);
        client.release();
        
        console.log('✅ Found', result.rows.length, 'clubs');
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
        
    } catch (error) {
        console.error('Get clubs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clubs' });
    }
});

// Manual refresh metadata endpoint for testing
// Increment club usage and update metadata
app.post('/api/clubs/increment-usage', authenticateToken, async (req, res) => {
    try {
        const { website_url, activity_type, location, child_age, activity_start_date, activity_id } = req.body;
        
        if (!website_url || !activity_type) {
            return res.status(400).json({ success: false, error: 'website_url and activity_type are required' });
        }

        const client = await pool.connect();
        
        try {
            // Find or create club
            const existingClub = await client.query(`
                SELECT id, min_child_age, max_child_age FROM clubs 
                WHERE COALESCE(website_url, '') = COALESCE($1, '') 
                AND COALESCE(location, '') = COALESCE($2, '') 
                AND activity_type = $3
            `, [website_url.trim(), location || '', activity_type.trim()]);
            
            let clubId;
            if (existingClub.rows.length === 0) {
                // Create new club
                const metadata = await fetchWebsiteMetadata(website_url);
                
                const newClubResult = await client.query(`
                    INSERT INTO clubs (
                        name, website_url, activity_type, location,
                        website_title, website_description, website_favicon, metadata_fetched_at,
                        min_child_age, max_child_age, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $8, NOW(), NOW())
                    RETURNING id
                `, [
                    metadata.title || website_url, website_url.trim(), activity_type.trim(), 
                    location || null, metadata.title, metadata.description, metadata.favicon, 
                    child_age || null
                ]);
                clubId = newClubResult.rows[0].id;
                console.log('✅ Created new club:', clubId);
            } else {
                clubId = existingClub.rows[0].id;
                
                // Update age range if child_age provided
                if (child_age) {
                    const currentMin = existingClub.rows[0].min_child_age;
                    const currentMax = existingClub.rows[0].max_child_age;
                    const newMin = currentMin ? Math.min(currentMin, child_age) : child_age;
                    const newMax = currentMax ? Math.max(currentMax, child_age) : child_age;
                    
                    await client.query(`
                        UPDATE clubs SET 
                            min_child_age = $1, max_child_age = $2, updated_at = NOW()
                        WHERE id = $3
                    `, [newMin, newMax, clubId]);
                    console.log('✅ Updated club age range:', { min: newMin, max: newMax });
                }
            }
            
            // Create usage record (this will increment the count via the existing query logic)
            // Check if this activity_id already has a usage record for this club to avoid duplicates
            let usageResult = { rowCount: 0 };
            if (activity_id) {
                const existingUsage = await client.query(`
                    SELECT id FROM club_usage WHERE club_id = $1 AND activity_id = $2
                `, [clubId, activity_id]);
                
                if (existingUsage.rows.length === 0) {
                    usageResult = await client.query(`
                        INSERT INTO club_usage (club_id, activity_id, usage_date, activity_start_date)
                        VALUES ($1, $2, CURRENT_DATE, $3)
                        RETURNING *
                    `, [clubId, activity_id, activity_start_date || new Date().toISOString().split('T')[0]]);
                }
            } else {
                // If no activity_id, we need to generate a placeholder or skip this insert
                // For now, let's just mark it as successful without inserting when no activity_id
                console.log('⚠️ No activity_id provided, skipping club_usage insert but marking club as used');
                usageResult = { rowCount: 1 }; // Mark as successful
            }
            
            console.log('✅ Club usage incremented:', { club_id: clubId, inserted: usageResult.rowCount > 0 });
            
            client.release();
            res.json({ success: true, club_id: clubId, usage_incremented: usageResult.rowCount > 0 });
            
        } catch (error) {
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('❌ Club increment error:', error);
        res.status(500).json({ success: false, error: 'Failed to increment club usage' });
    }
});

app.post('/api/clubs/:clubId/refresh-metadata', authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.params;
        
        console.log('🔄 Manual metadata refresh requested for club:', clubId);
        
        const client = await pool.connect();
        
        // Get club details
        const clubQuery = await client.query(
            'SELECT website_url FROM clubs WHERE id = $1',
            [clubId]
        );
        
        if (clubQuery.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Club not found' });
        }
        
        const websiteUrl = clubQuery.rows[0].website_url;
        console.log('🌐 Refreshing metadata for:', websiteUrl);
        
        // Fetch fresh metadata
        const metadata = await fetchWebsiteMetadata(websiteUrl);
        
        // Update club record with fresh metadata
        await client.query(
            'UPDATE clubs SET website_title = $1, website_description = $2, website_favicon = $3, metadata_fetched_at = NOW(), updated_at = NOW() WHERE id = $4',
            [metadata.title, metadata.description, metadata.favicon, clubId]
        );
        
        client.release();
        
        console.log('✅ Metadata refreshed for club:', clubId);
        
        res.json({
            success: true,
            message: 'Metadata refreshed successfully',
            metadata: metadata
        });
        
    } catch (error) {
        console.error('Refresh metadata error:', error);
        res.status(500).json({ success: false, error: 'Failed to refresh metadata' });
    }
});

startServer();