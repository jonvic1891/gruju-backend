#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Database Query Validation');
console.log('============================\n');

// Database schema from our audit
const schema = {
    users: ['id', 'username', 'email', 'phone', 'password_hash', 'role', 'is_active', 'family_name', 'created_at', 'updated_at'],
    children: ['id', 'name', 'parent_id', 'age', 'grade', 'school', 'interests', 'created_at', 'updated_at'],
    activities: ['id', 'child_id', 'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'website_url', 'cost', 'max_participants', 'created_at', 'updated_at'],
    connections: ['id', 'parent1_id', 'parent2_id', 'status', 'created_at', 'child1_id', 'child2_id'],
    connection_requests: ['id', 'requester_id', 'target_parent_id', 'child_id', 'target_child_id', 'status', 'message', 'created_at', 'updated_at'],
    activity_invitations: ['id', 'activity_id', 'inviter_parent_id', 'invited_parent_id', 'child_id', 'status', 'message', 'created_at', 'updated_at'],
    system_logs: ['id', 'level', 'message', 'user_id', 'metadata', 'ip_address', 'user_agent', 'created_at']
};

// Read backend code
const backendPath = path.join(__dirname, 'postgres-backend.js');
const backendContent = fs.readFileSync(backendPath, 'utf8');

// Find all SQL queries
const sqlQueries = [];
const queryPatterns = [
    /client\.query\(\s*['`]([^'`]+)['`]/g,
    /client\.query\(\s*`([^`]+)`/g,
    /client\.query\(\s*"([^"]+)"/g
];

queryPatterns.forEach(pattern => {
    const matches = backendContent.matchAll(pattern);
    for (const match of matches) {
        const query = match[1].trim();
        if (query.length > 0) {
            sqlQueries.push(query);
        }
    }
});

console.log(`📋 Found ${sqlQueries.length} SQL queries\n`);

// Analyze queries
const issues = [];

sqlQueries.forEach((query, index) => {
    const queryUpper = query.toUpperCase();
    
    // Skip system queries
    if (queryUpper.includes('INFORMATION_SCHEMA') || queryUpper.includes('CREATE TABLE') || queryUpper.includes('CURRENT_TIMESTAMP')) {
        return;
    }
    
    console.log(`🔍 Query ${index + 1}:`);
    console.log(`   ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
    
    // Extract table names
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    const insertMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
    const updateMatch = query.match(/UPDATE\s+(\w+)/i);
    const deleteMatch = query.match(/DELETE\s+FROM\s+(\w+)/i);
    
    const tableName = fromMatch?.[1] || insertMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1];
    
    if (tableName && schema[tableName]) {
        console.log(`   📊 Table: ${tableName}`);
        
        // Extract column references
        const columnReferences = [];
        
        // SELECT columns
        const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/is);
        if (selectMatch) {
            const selectPart = selectMatch[1];
            if (selectPart !== '*') {
                const columns = selectPart.split(',').map(col => 
                    col.trim()
                        .replace(/\w+\./g, '') // Remove table prefixes
                        .replace(/\s+AS\s+\w+/gi, '') // Remove AS aliases
                        .replace(/^\w+\(/g, '') // Remove function calls
                        .replace(/\)$/g, '')
                        .trim()
                );
                columnReferences.push(...columns);
            }
        }
        
        // INSERT columns
        const insertColMatch = query.match(/INSERT\s+INTO\s+\w+\s*\((.*?)\)/i);
        if (insertColMatch) {
            const insertCols = insertColMatch[1].split(',').map(col => col.trim());
            columnReferences.push(...insertCols);
        }
        
        // WHERE clause columns
        const whereMatches = query.matchAll(/(\w+)\s*[=<>!]/g);
        for (const whereMatch of whereMatches) {
            if (!whereMatch[1].match(/^\d+$/)) { // Skip numbers
                columnReferences.push(whereMatch[1]);
            }
        }
        
        // UPDATE SET columns
        const setMatches = query.matchAll(/(\w+)\s*=/g);
        for (const setMatch of setMatches) {
            if (!setMatch[1].match(/^\d+$/)) { // Skip numbers
                columnReferences.push(setMatch[1]);
            }
        }
        
        // Check if all referenced columns exist
        const uniqueColumns = [...new Set(columnReferences)];
        const invalidColumns = uniqueColumns.filter(col => 
            col && 
            col !== '*' && 
            !col.includes('$') && // Skip parameter placeholders
            !schema[tableName].includes(col)
        );
        
        if (invalidColumns.length > 0) {
            const issue = `❌ Invalid columns in table '${tableName}': ${invalidColumns.join(', ')}`;
            console.log(`   ${issue}`);
            issues.push({
                query: query.substring(0, 100),
                table: tableName,
                invalidColumns
            });
        } else {
            console.log(`   ✅ All columns valid`);
        }
    } else if (tableName) {
        console.log(`   ⚠️ Unknown table: ${tableName}`);
    }
    
    console.log('');
});

console.log('📊 Summary:');
console.log(`- Total queries analyzed: ${sqlQueries.length}`);
console.log(`- Issues found: ${issues.length}`);

if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach((issue, i) => {
        console.log(`${i + 1}. Table '${issue.table}': Invalid columns [${issue.invalidColumns.join(', ')}]`);
        console.log(`   Query: ${issue.query}...`);
    });
    console.log('\n⚠️ Please review and fix these database query issues');
} else {
    console.log('\n🎉 All database queries appear to use valid columns!');
}

// Check for JOIN consistency
console.log('\n🔗 JOIN Analysis:');
const joinQueries = sqlQueries.filter(q => q.toUpperCase().includes('JOIN'));
console.log(`Found ${joinQueries.length} queries with JOINs`);

joinQueries.forEach((query, i) => {
    console.log(`\n${i + 1}. ${query.substring(0, 150)}${query.length > 150 ? '...' : ''}`);
    
    // Check for foreign key relationships
    const fkRelationships = [
        { table: 'activities', column: 'child_id', references: 'children.id' },
        { table: 'children', column: 'parent_id', references: 'users.id' },
        { table: 'connection_requests', column: 'requester_id', references: 'users.id' },
        { table: 'connection_requests', column: 'target_parent_id', references: 'users.id' },
        { table: 'connections', column: 'parent1_id', references: 'users.id' },
        { table: 'connections', column: 'parent2_id', references: 'users.id' },
        { table: 'activity_invitations', column: 'activity_id', references: 'activities.id' },
        { table: 'activity_invitations', column: 'inviter_parent_id', references: 'users.id' },
        { table: 'activity_invitations', column: 'invited_parent_id', references: 'users.id' }
    ];
    
    // Basic JOIN validation would go here - checking if JOIN conditions match FK relationships
});

console.log('\n✅ Database query validation complete!');