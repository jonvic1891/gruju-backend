const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTables() {
  try {
    const client = await pool.connect();
    
    console.log('🔄 Creating activity templates tables...');
    
    // Create activity_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_templates (
          id SERIAL PRIMARY KEY,
          uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::varchar,
          parent_uuid VARCHAR(36) NOT NULL REFERENCES parents(uuid) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(500),
          website_url VARCHAR(500),
          activity_type VARCHAR(100),
          cost DECIMAL(10,2),
          max_participants INTEGER,
          typical_duration_hours INTEGER,
          typical_start_time TIME,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_templates_parent ON activity_templates(parent_uuid)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_templates_type ON activity_templates(activity_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_templates_last_used ON activity_templates(last_used_at DESC)`);
    
    // Create activity_types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          color VARCHAR(7) DEFAULT '#007bff',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default activity types
    await client.query(`
      INSERT INTO activity_types (name, description, icon, color) VALUES
      ('sports', 'Physical activities and sports', '⚽', '#28a745'),
      ('education', 'Learning and educational activities', '📚', '#007bff'),
      ('arts', 'Creative and artistic activities', '🎨', '#e83e8c'),
      ('music', 'Musical activities and lessons', '🎵', '#6f42c1'),
      ('outdoor', 'Outdoor adventures and nature activities', '🏕️', '#20c997'),
      ('social', 'Social gatherings and parties', '🎉', '#fd7e14'),
      ('technology', 'STEM and technology activities', '💻', '#6c757d'),
      ('health', 'Health and wellness activities', '🏥', '#dc3545')
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('✅ Activity templates tables created successfully!');
    client.release();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();