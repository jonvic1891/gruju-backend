const jwt = require('jsonwebtoken');

// Use the same JWT secret as the backend
const JWT_SECRET = process.env.JWT_SECRET || 'gruju_jwt_secret_2024_super_secure_random_string_for_production_use_only';

// Admin user data (ID: 1 from database)
const adminUser = {
    id: 1,
    email: 'admin@parentactivityapp.com',
    role: 'user',
    username: 'admin'
};

// Generate JWT token
const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '24h' });

console.log('🔑 Generated admin token:');
console.log(token);
console.log('\n📋 Use this token to test invitation-based activities:');
console.log(`Authorization: Bearer ${token}`);
console.log('\n🎯 Test with child ID 36 (admin\'s child)');
console.log('curl -H "Authorization: Bearer ' + token + '" https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/36');