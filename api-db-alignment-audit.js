#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 API-Database Alignment Audit');
console.log('================================\n');

// Read backend endpoints
const backendPath = path.join(__dirname, 'postgres-backend.js');
const backendContent = fs.readFileSync(backendPath, 'utf8');

// Read frontend API calls
const frontendApiPath = path.join(__dirname, 'parent-activity-web/src/services/api.ts');
const frontendApiContent = fs.readFileSync(frontendApiPath, 'utf8');

// Extract backend endpoints
const backendEndpoints = [];
const backendMatches = backendContent.matchAll(/app\.(get|post|put|delete)\('([^']+)'.*?\)/g);
for (const match of backendMatches) {
    const [, method, endpoint] = match;
    if (endpoint.startsWith('/api/')) {
        backendEndpoints.push({ method: method.toUpperCase(), endpoint });
    }
}

// Extract frontend API calls
const frontendCalls = [];
const frontendMatches = frontendApiContent.matchAll(/this\.request.*?'(get|post|put|delete)',\s*['`]([^'`]+)['`]/g);
for (const match of frontendMatches) {
    const [, method, endpoint] = match;
    if (endpoint.startsWith('/api/')) {
        frontendCalls.push({ method: method.toUpperCase(), endpoint });
    }
}

console.log('📡 Backend Endpoints Found:');
backendEndpoints.forEach((ep, i) => {
    console.log(`${i + 1}. ${ep.method} ${ep.endpoint}`);
});

console.log('\n📱 Frontend API Calls Found:');
frontendCalls.forEach((call, i) => {
    console.log(`${i + 1}. ${call.method} ${call.endpoint}`);
});

// Check alignment
console.log('\n🔍 Alignment Analysis:');
console.log('======================');

// Find frontend calls without corresponding backend endpoints
const missingBackendEndpoints = [];
frontendCalls.forEach(frontendCall => {
    // Handle parameterized endpoints
    const normalizedFrontend = frontendCall.endpoint
        .replace(/\/\d+/g, '/:id')
        .replace(/\/\$\{[^}]+\}/g, '/:param')
        .replace(/\?.*$/, '');
    
    const hasBackend = backendEndpoints.some(backendEp => {
        const normalizedBackend = backendEp.endpoint
            .replace(/:[\w]+/g, ':param');
        
        return backendEp.method === frontendCall.method && 
               normalizedBackend === normalizedFrontend;
    });
    
    if (!hasBackend) {
        missingBackendEndpoints.push(frontendCall);
    }
});

// Find backend endpoints not used by frontend
const unusedBackendEndpoints = [];
backendEndpoints.forEach(backendEp => {
    const normalizedBackend = backendEp.endpoint
        .replace(/:[\w]+/g, ':param');
    
    const hasFrontend = frontendCalls.some(frontendCall => {
        const normalizedFrontend = frontendCall.endpoint
            .replace(/\/\d+/g, '/:param')
            .replace(/\/\$\{[^}]+\}/g, '/:param')
            .replace(/\?.*$/, '');
        
        return frontendCall.method === backendEp.method && 
               normalizedFrontend === normalizedBackend;
    });
    
    if (!hasFrontend) {
        unusedBackendEndpoints.push(backendEp);
    }
});

if (missingBackendEndpoints.length > 0) {
    console.log('\n❌ Frontend calls missing backend endpoints:');
    missingBackendEndpoints.forEach((call, i) => {
        console.log(`${i + 1}. ${call.method} ${call.endpoint}`);
    });
} else {
    console.log('\n✅ All frontend calls have corresponding backend endpoints');
}

if (unusedBackendEndpoints.length > 0) {
    console.log('\n⚠️ Backend endpoints not used by frontend:');
    unusedBackendEndpoints.forEach((ep, i) => {
        console.log(`${i + 1}. ${ep.method} ${ep.endpoint}`);
    });
} else {
    console.log('\n✅ All backend endpoints are used by frontend');
}

// Database table analysis
console.log('\n📊 Database Tables vs API Usage:');
console.log('==================================');

const tables = [
    'users', 'children', 'activities', 'connections', 
    'connection_requests', 'activity_invitations', 'system_logs'
];

tables.forEach(table => {
    const relatedEndpoints = backendEndpoints.filter(ep => 
        ep.endpoint.toLowerCase().includes(table.replace(/_/g, '-')) ||
        ep.endpoint.toLowerCase().includes(table.replace(/s$/, '')) ||
        (table === 'connection_requests' && ep.endpoint.includes('/connections/'))
    );
    
    console.log(`\n🗄️ Table: ${table}`);
    if (relatedEndpoints.length > 0) {
        relatedEndpoints.forEach(ep => {
            console.log(`  - ${ep.method} ${ep.endpoint}`);
        });
    } else {
        console.log(`  ⚠️ No obvious API endpoints found for this table`);
    }
});

console.log('\n🔍 Summary:');
console.log(`- Backend endpoints: ${backendEndpoints.length}`);
console.log(`- Frontend API calls: ${frontendCalls.length}`);
console.log(`- Missing backend endpoints: ${missingBackendEndpoints.length}`);
console.log(`- Unused backend endpoints: ${unusedBackendEndpoints.length}`);
console.log(`- Database tables: ${tables.length}`);

if (missingBackendEndpoints.length === 0 && unusedBackendEndpoints.length === 0) {
    console.log('\n🎉 API alignment looks good!');
} else {
    console.log('\n⚠️ API alignment issues found - review above');
}