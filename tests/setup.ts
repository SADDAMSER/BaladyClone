/**
 * Test Setup Configuration for Mobile API Contract Testing
 * Yemen Digital Construction Platform
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mobile-contract-testing-jwt-secret-key-2024';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/yemen_construction_test';

// Suppress some console logs during testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args: any[]) => {
  // Filter out noisy logs during testing
  const message = args.join(' ');
  if (
    message.includes('[express] serving') ||
    message.includes('Browserslist') ||
    message.includes('vite') ||
    message.includes('Re-optimizing')
  ) {
    return;
  }
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  // Still show errors, but filter test-related ones
  const message = args.join(' ');
  if (message.includes('Test data setup') || message.includes('cleanup')) {
    return;
  }
  originalConsoleError(...args);
};

// Global test configuration
console.log('🧪 Mobile API Contract Testing Environment Initialized');
console.log('🏗️  Platform: Yemen Digital Construction Platform');
console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing');
console.log('🗄️  Database:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('📱 Testing 11 Mobile API Endpoints with Comprehensive Security Coverage');

export {};