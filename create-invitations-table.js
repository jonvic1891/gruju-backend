const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function createInvitationsTable() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // First, let's see what tables exist
        const existingTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('📋 Existing tables:', existingTables.rows.map(row => row.table_name));

        // Check if activity_invitations table exists
        const invitationTableExists = existingTables.rows.some(row => row.table_name === 'activity_invitations');
        
        if (!invitationTableExists) {
            console.log('🔨 Creating activity_invitations table...');
            
            await client.query(`
                CREATE TABLE activity_invitations (
                    id SERIAL PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    inviter_parent_id INTEGER NOT NULL,
                    invited_parent_id INTEGER NOT NULL,
                    child_id INTEGER,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
                    message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                    FOREIGN KEY (inviter_parent_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (invited_parent_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
                );
            `);
            
            console.log('✅ activity_invitations table created successfully!');
        } else {
            console.log('📋 activity_invitations table already exists');
        }

        // Create index for better performance
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_activity_invitations_activity_id ON activity_invitations(activity_id);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_activity_invitations_invited_parent_id ON activity_invitations(invited_parent_id);
            `);
            console.log('✅ Indexes created for activity_invitations table');
        } catch (indexError) {
            console.log('📋 Indexes might already exist:', indexError.message);
        }

        console.log('🎉 Database schema ready for activity invitations!');

    } catch (error) {
        console.error('❌ Error creating invitations table:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createInvitationsTable();