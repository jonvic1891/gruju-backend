/**
 * Test Setup File
 * Configures the test environment for consistent testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_MODE = 'production'; // Use real database for integration tests

// Console log control for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Suppress server startup logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.log = (...args) => {
    const message = args.join(' ');
    // Allow test-specific logs and error logs
    if (message.includes('[TEST]') || message.includes('ERROR') || message.includes('FAIL')) {
      originalConsoleLog(...args);
    }
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    // Allow error logs but suppress routine database connection messages during tests
    if (!message.includes('Database connection test query successful')) {
      originalConsoleError(...args);
    }
  };
}

// Global test timeout
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});