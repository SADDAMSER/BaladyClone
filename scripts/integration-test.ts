// Use native fetch (Node.js 18+)

// Base URL for the API
const BASE_URL = 'http://localhost:5000';

// Test users credentials
const testUsers = [
  {
    username: 'admin_test',
    password: 'Admin123!',
    expectedRoles: ['admin'],
    expectedAccess: {
      '/api/users': true,
      '/api/applications': true,
      '/api/tasks': true,
      '/api/departments': true
    }
  },
  {
    username: 'engineer_test', 
    password: 'test123',
    expectedRoles: ['engineer'],
    expectedAccess: {
      '/api/users': false, // Should be restricted
      '/api/applications': true,
      '/api/tasks': true,
      '/api/departments': true // Should be allowed
    }
  },
  {
    username: 'manager_test',
    password: 'Manager123!',
    expectedRoles: ['manager'],
    expectedAccess: {
      '/api/users': true, // Manager should see users
      '/api/applications': true,
      '/api/tasks': true,
      '/api/departments': true
    }
  }
];

// Test endpoints to verify RBAC protection
const protectedEndpoints = [
  '/api/users',
  '/api/applications', 
  '/api/tasks',
  '/api/departments',
  '/api/positions'
];

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

class IntegrationTester {
  private results: TestResult[] = [];

  private log(message: string, success: boolean = true) {
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${message}`);
    this.results.push({ success, message });
  }

  private logError(message: string, error: any) {
    console.log(`❌ ${message}`);
    console.log(`   Error: ${error.message || error}`);
    this.results.push({ success: false, message, details: error });
  }

  // Test user login and JWT token structure
  async testLogin(user: typeof testUsers[0]): Promise<string | null> {
    try {
      console.log(`\n🔐 Testing login for: ${user.username}`);
      
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          password: user.password
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      // Check response structure
      if (!data.token) {
        throw new Error('No token in login response');
      }

      if (!data.user) {
        throw new Error('No user data in login response');
      }

      this.log(`Login successful for ${user.username}`);
      
      // Verify user data structure
      const userData = data.user;
      if (userData.username !== user.username) {
        throw new Error(`Username mismatch: expected ${user.username}, got ${userData.username}`);
      }

      // Check for new RBAC fields
      if (userData.roleCodes) {
        this.log(`RBAC roleCodes found: ${userData.roleCodes.join(', ')}`);
        
        // Verify expected roles
        const hasExpectedRoles = user.expectedRoles.every(role => 
          userData.roleCodes.includes(role)
        );
        
        if (hasExpectedRoles) {
          this.log(`Role assignment verified for ${user.username}`);
        } else {
          this.logError(`Role mismatch for ${user.username}`, {
            expected: user.expectedRoles,
            actual: userData.roleCodes
          });
        }
      } else {
        this.log(`Legacy mode: role = ${userData.role}`, false);
      }

      // Check for roles array (full role objects)
      if (userData.roles && Array.isArray(userData.roles)) {
        this.log(`Full role objects found: ${userData.roles.length} roles`);
      }

      return data.token;

    } catch (error) {
      this.logError(`Login failed for ${user.username}`, error);
      return null;
    }
  }

  // Test access to protected endpoints
  async testEndpointAccess(token: string, user: typeof testUsers[0]) {
    console.log(`\n🔒 Testing endpoint access for: ${user.username}`);
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const isAccessAllowed = response.status !== 403 && response.status !== 401;
        const expectedAccess = user.expectedAccess[endpoint] !== false; // Default true if not specified
        
        if (isAccessAllowed === expectedAccess) {
          this.log(`${endpoint}: Access ${isAccessAllowed ? 'allowed' : 'denied'} (expected)`);
        } else {
          this.logError(`${endpoint}: Unexpected access result`, {
            expected: expectedAccess ? 'allowed' : 'denied',
            actual: isAccessAllowed ? 'allowed' : 'denied',
            status: response.status
          });
        }

      } catch (error) {
        this.logError(`${endpoint}: Request failed`, error);
      }
    }
  }

  // Test JWT token structure by decoding (basic check)
  testJWTStructure(token: string, user: typeof testUsers[0]) {
    try {
      console.log(`\n🎫 Testing JWT structure for: ${user.username}`);
      
      // Basic JWT structure check (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT structure');
      }

      // Decode payload (without verification - just for testing structure)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check required fields
      const requiredFields = ['id', 'username'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing JWT fields: ${missingFields.join(', ')}`);
      }

      this.log(`JWT payload structure valid`);

      // Check for new RBAC fields
      if (payload.roleCodes) {
        this.log(`JWT contains roleCodes: ${payload.roleCodes.join(', ')}`);
      } else if (payload.role) {
        this.log(`JWT contains legacy role: ${payload.role}`, false);
      }

      // Check expiration
      if (payload.exp) {
        const expiresAt = new Date(payload.exp * 1000);
        this.log(`JWT expires at: ${expiresAt.toISOString()}`);
      }

    } catch (error) {
      this.logError(`JWT structure test failed`, error);
    }
  }

  // Run all integration tests
  async runAllTests() {
    console.log('🚀 Starting RBAC Integration Tests...\n');
    
    let totalTests = 0;
    let passedTests = 0;

    for (const user of testUsers) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📊 Testing user: ${user.username}`);
      console.log(`${'='.repeat(50)}`);

      // Test login and get token
      const token = await this.testLogin(user);
      
      if (token) {
        // Test JWT structure
        this.testJWTStructure(token, user);
        
        // Test endpoint access
        await this.testEndpointAccess(token, user);
      }
    }

    // Calculate results
    totalTests = this.results.length;
    passedTests = this.results.filter(r => r.success).length;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log('📈 Integration Test Results');
    console.log(`${'='.repeat(50)}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

    if (passedTests === totalTests) {
      console.log('🎉 All integration tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Review the details above.');
      
      // Show failed tests
      const failedTests = this.results.filter(r => !r.success);
      if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(test => {
          console.log(`   - ${test.message}`);
        });
      }
    }

    return { totalTests, passedTests, success: passedTests === totalTests };
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new IntegrationTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Integration test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTester };