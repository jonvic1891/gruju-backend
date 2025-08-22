-- Database schema additions for skeleton accounts flow

-- 1. Add phone field to users table if not exists (for phone number lookup)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 2. Create skeleton_accounts table to track placeholder accounts
CREATE TABLE IF NOT EXISTS skeleton_accounts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    contact_method VARCHAR(255) NOT NULL, -- email or phone number
    contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('email', 'phone')),
    created_at TIMESTAMP DEFAULT NOW(),
    is_merged BOOLEAN DEFAULT FALSE,
    merged_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    merged_at TIMESTAMP,
    UNIQUE(contact_method, contact_type)
);

-- 3. Create skeleton_children table for placeholder children
CREATE TABLE IF NOT EXISTS skeleton_children (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    skeleton_account_id INTEGER REFERENCES skeleton_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    birth_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    -- When merged, this will point to the real child
    merged_with_child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
    is_merged BOOLEAN DEFAULT FALSE
);

-- 4. Create skeleton_connection_requests table to track pending connections to skeleton accounts
CREATE TABLE IF NOT EXISTS skeleton_connection_requests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    requester_parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requester_child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    skeleton_account_id INTEGER REFERENCES skeleton_accounts(id) ON DELETE CASCADE,
    skeleton_child_id INTEGER REFERENCES skeleton_children(id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    -- When skeleton account becomes real, this becomes a regular connection request
    converted_to_request_id INTEGER REFERENCES connection_requests(id) ON DELETE SET NULL,
    is_converted BOOLEAN DEFAULT FALSE
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_skeleton_accounts_contact ON skeleton_accounts(contact_method, contact_type);
CREATE INDEX IF NOT EXISTS idx_skeleton_accounts_merged ON skeleton_accounts(is_merged);
CREATE INDEX IF NOT EXISTS idx_skeleton_children_account ON skeleton_children(skeleton_account_id);
CREATE INDEX IF NOT EXISTS idx_skeleton_connection_requests_skeleton ON skeleton_connection_requests(skeleton_account_id);
CREATE INDEX IF NOT EXISTS idx_skeleton_connection_requests_requester ON skeleton_connection_requests(requester_parent_id);

-- 6. Add phone index to users table for lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

COMMENT ON TABLE skeleton_accounts IS 'Placeholder accounts created when searching for non-existent users';
COMMENT ON TABLE skeleton_children IS 'Placeholder children for skeleton accounts';
COMMENT ON TABLE skeleton_connection_requests IS 'Connection requests to skeleton accounts that will be converted when the account becomes real';