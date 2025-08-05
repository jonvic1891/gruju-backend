/**
 * Smoke Test
 * Basic test to verify Jest is working correctly
 */

describe('Test Setup Smoke Test', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('Test helpers can be imported', () => {
    const { TEST_USERS, TEST_CHILDREN } = require('./helpers/testHelpers');
    
    expect(TEST_USERS).toBeDefined();
    expect(TEST_CHILDREN).toBeDefined();
    expect(TEST_USERS.johnson).toHaveProperty('id');
    expect(TEST_USERS.johnson).toHaveProperty('email');
  });
  
  test('Environment variables are set correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});

console.log('[TEST] Smoke test loaded successfully');