-- Activity Templates Schema
-- This allows users to save activity details as reusable templates

-- Create activity_templates table
CREATE TABLE IF NOT EXISTS activity_templates (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::varchar,
    parent_uuid VARCHAR(36) NOT NULL REFERENCES parents(uuid) ON DELETE CASCADE,
    
    -- Template details (reusable across activities)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    website_url VARCHAR(500),
    activity_type VARCHAR(100), -- e.g., 'sports', 'education', 'arts', 'outdoor', etc.
    cost DECIMAL(10,2),
    max_participants INTEGER,
    
    -- Typical duration info (optional defaults)
    typical_duration_hours INTEGER, -- How long activities of this type usually last
    typical_start_time TIME, -- Common start time for this activity type
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0, -- Track how often this template is used
    
    -- Indexes
    INDEX idx_activity_templates_parent (parent_uuid),
    INDEX idx_activity_templates_type (activity_type),
    INDEX idx_activity_templates_last_used (last_used_at DESC),
    INDEX idx_activity_templates_usage_count (usage_count DESC)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_activity_template_updated_at
    BEFORE UPDATE ON activity_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_template_updated_at();

-- Insert some example templates for common activity types
INSERT INTO activity_templates (parent_uuid, name, description, location, activity_type, cost, max_participants, typical_duration_hours, typical_start_time) VALUES
-- These will be inserted when a user first creates templates, but here are examples:
-- ('sample-parent-uuid', 'Soccer Practice', 'Weekly soccer training session', 'Local Soccer Field', 'sports', 0.00, 20, 2, '16:00'),
-- ('sample-parent-uuid', 'Piano Lessons', 'Individual piano instruction', 'Music Academy', 'music', 50.00, 1, 1, '15:00'),
-- ('sample-parent-uuid', 'Swimming Class', 'Learn to swim group lessons', 'Community Pool', 'sports', 25.00, 8, 1, '10:00');

-- Create some example activity types for reference (optional)
CREATE TABLE IF NOT EXISTS activity_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- emoji or icon identifier
    color VARCHAR(7) DEFAULT '#007bff', -- hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO activity_types (name, description, icon, color) VALUES
('sports', 'Physical activities and sports', '⚽', '#28a745'),
('education', 'Learning and educational activities', '📚', '#007bff'),
('arts', 'Creative and artistic activities', '🎨', '#e83e8c'),
('music', 'Musical activities and lessons', '🎵', '#6f42c1'),
('outdoor', 'Outdoor adventures and nature activities', '🏕️', '#20c997'),
('social', 'Social gatherings and parties', '🎉', '#fd7e14'),
('technology', 'STEM and technology activities', '💻', '#6c757d'),
('health', 'Health and wellness activities', '🏥', '#dc3545')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_templates TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_types TO postgres;
GRANT USAGE, SELECT ON SEQUENCE activity_templates_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE activity_types_id_seq TO postgres;