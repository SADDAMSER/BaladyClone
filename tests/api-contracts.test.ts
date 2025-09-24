/**
 * API Contract Testing Framework - Task 0.1: Foundation Safety Net
 * Yemen Digital Construction Platform - Surveying Decision Service
 * 
 * اختبارات شاملة لجميع نقاط النهاية الخاصة بخدمة القرار المساحي
 * Tests all endpoints for the Surveying Decision Service with comprehensive scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'test-surveying-decision-service-secret';

// Test Express App Setup
let app: express.Express;

// Test User Data for LBAC Testing
interface TestUser {
  id: string;
  username: string;
  password: string;
  role: string;
  token: string;
  geographicAccess: {
    governorateId: string;
    districtId: string;
    neighborhoodId: string;
  };
}

let testUsers: {
  citizen: TestUser;
  employee: TestUser;
  manager: TestUser;
  admin: TestUser;
  crossBoundaryEmployee: TestUser;
};

// Test Data IDs  
let testApplicationId: string;
let testSurveyingDecisionId: string;
let testTaskId: string;

describe('🧪 API Contract Tests - Surveying Decision Service (Task 0.1)', () => {
  
  beforeAll(async () => {
    // Initialize test application
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Register all routes
    registerRoutes(app);
    
    // Setup test users with different LBAC contexts
    await setupTestUsers();
    
    // Create test data
    await setupTestData();
    
    console.log('🚀 API Contract Testing Framework initialized for Surveying Decision Service');
  });

  afterAll(async () => {
    console.log('✅ All API contract tests completed for Surveying Decision Service');
  });

  // ================================================================
  // 📋 TEST ENDPOINT 1: GET /api/applications (LBAC + Pagination)
  // ================================================================
  
  describe('📋 GET /api/applications - LBAC & Pagination', () => {
    
    it('✅ should return applications within user geographic access', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            status: expect.any(String),
            // LBAC: Should only see applications within employee's geographic scope
            geographicContext: expect.objectContaining({
              governorateId: testUsers.employee.geographicAccess.governorateId
            })
          })
        ])
      );
    });

    it('❌ should NOT return applications outside user geographic access', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${testUsers.crossBoundaryEmployee.token}`)
        .expect(200);

      // Verify LBAC filtering - should not see applications outside geographic scope
      const unauthorizedApplications = response.body.filter((app: any) => 
        app.geographicContext?.governorateId !== testUsers.crossBoundaryEmployee.geographicAccess.governorateId
      );
      
      expect(unauthorizedApplications).toHaveLength(0);
    });

    it('✅ should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/applications/paginated')
        .query({
          page: 1,
          limit: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${testUsers.manager.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 5,
          total: expect.any(Number),
          totalPages: expect.any(Number),
          hasNext: expect.any(Boolean),
          hasPrev: expect.any(Boolean)
        }
      });

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('✅ should filter by status', async () => {
      const response = await request(app)
        .get('/api/applications')
        .query({ status: 'submitted' })
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect(200);

      response.body.forEach((application: any) => {
        expect(application.status).toBe('submitted');
      });
    });

    it('❌ should require authentication', async () => {
      await request(app)
        .get('/api/applications')
        .expect(401);
    });

    it('❌ should reject invalid token', async () => {
      await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

  });

  // ================================================================
  // 📝 TEST ENDPOINT 2: POST /api/applications (Validation + Authorization)
  // ================================================================

  describe('📝 POST /api/applications - Validation & Authorization', () => {

    const validApplicationData = {
      applicantName: 'محمد أحمد علي',
      applicantPhone: '+967-771234567',
      applicantEmail: 'mohammed.ali@example.com',
      propertyAddress: 'شارع الثورة، صنعاء',
      serviceType: 'surveying_decision',
      propertyType: 'residential',
      plotArea: 250.5,
      geographicContext: {
        governorateId: 'gov_sanaa',
        districtId: 'dist_altahrir',
        neighborhoodId: 'neigh_alsabeen'
      },
      requestedServices: ['plot_survey', 'boundary_verification']
    };

    it('✅ should create application with valid data', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send(validApplicationData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        applicantName: validApplicationData.applicantName,
        status: 'draft',
        serviceType: 'surveying_decision',
        geographicContext: validApplicationData.geographicContext
      });

      // Store for later tests
      testApplicationId = response.body.id;
    });

    it('❌ should reject missing required fields', async () => {
      const invalidData = {
        // Missing required fields: applicantName and serviceType
        applicantPhone: validApplicationData.applicantPhone,
        applicantEmail: validApplicationData.applicantEmail,
        propertyAddress: validApplicationData.propertyAddress
      };

      await request(app)
        .post('/api/applications')
        .send(invalidData)
        .expect(400);
    });

    it('❌ should validate phone number format', async () => {
      const invalidData = { 
        ...validApplicationData, 
        applicantPhone: 'invalid-phone'
      };

      await request(app)
        .post('/api/applications')
        .send(invalidData)
        .expect(400);
    });

    it('❌ should validate email format', async () => {
      const invalidData = { 
        ...validApplicationData, 
        applicantEmail: 'invalid-email'
      };

      await request(app)
        .post('/api/applications')
        .send(invalidData)
        .expect(400);
    });

    it('❌ should validate geographic context', async () => {
      const invalidData = { 
        ...validApplicationData, 
        geographicContext: {
          governorateId: '', // Empty required field
          districtId: 'invalid'
        }
      };

      await request(app)
        .post('/api/applications')
        .send(invalidData)
        .expect(400);
    });

    it('❌ should reject malformed JSON', async () => {
      await request(app)
        .post('/api/applications')
        .send('invalid-json')
        .expect(400);
    });

    it('❌ should reject oversized payload', async () => {
      const oversizedData = {
        ...validApplicationData,
        oversizedField: 'x'.repeat(60 * 1024 * 1024) // 60MB
      };

      await request(app)
        .post('/api/applications')
        .send(oversizedData)
        .expect(413);
    });

  });

  // ================================================================
  // 🔄 TEST ENDPOINT 3: POST /api/applications/:id/status-change (State Transitions)
  // ================================================================

  describe('🔄 POST /api/applications/:id/status-change - State Transitions', () => {

    it('✅ should allow valid state transitions', async () => {
      // Valid transition: draft → submitted
      const response = await request(app)
        .post(`/api/applications/${testApplicationId}/status-change`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .send({
          newStatus: 'submitted',
          reason: 'Application completed and ready for review'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testApplicationId,
        status: 'submitted'
      });
    });

    it('✅ should create audit trail for status changes', async () => {
      // Get status history
      const historyResponse = await request(app)
        .get(`/api/applications/${testApplicationId}/status-history`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect(200);

      expect(historyResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fromStatus: 'draft',
            toStatus: 'submitted',
            reason: 'Application completed and ready for review',
            changedBy: testUsers.employee.id,
            changedAt: expect.any(String)
          })
        ])
      );
    });

    it('❌ should reject invalid state transitions', async () => {
      // Invalid transition: submitted → draft (backward transition)
      await request(app)
        .post(`/api/applications/${testApplicationId}/status-change`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .send({
          newStatus: 'draft',
          reason: 'Attempting invalid backward transition'
        })
        .expect(400);
    });

    it('❌ should enforce LBAC on status changes', async () => {
      // Employee from different geographic area should not modify
      await request(app)
        .post(`/api/applications/${testApplicationId}/status-change`)
        .set('Authorization', `Bearer ${testUsers.crossBoundaryEmployee.token}`)
        .send({
          newStatus: 'under_review',
          reason: 'Unauthorized geographic access attempt'
        })
        .expect(403);
    });

    it('❌ should require authentication for status changes', async () => {
      await request(app)
        .post(`/api/applications/${testApplicationId}/status-change`)
        .send({
          newStatus: 'under_review'
        })
        .expect(401);
    });

    it('❌ should reject status change without reason', async () => {
      await request(app)
        .post(`/api/applications/${testApplicationId}/status-change`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .send({
          newStatus: 'under_review'
          // Missing reason
        })
        .expect(400);
    });

  });

  // ================================================================
  // 🗺️ TEST ENDPOINT 4: GET /api/surveying-decisions (Workflow Integration)
  // ================================================================

  describe('🗺️ GET /api/surveying-decisions - Workflow Integration', () => {

    it('✅ should return surveying decisions with workflow context', async () => {
      const response = await request(app)
        .get('/api/surveying-decisions')
        .set('Authorization', `Bearer ${testUsers.manager.token}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            applicationId: expect.any(String),
            decisionType: expect.any(String),
            status: expect.any(String),
            // Workflow integration fields
            workflow: expect.objectContaining({
              currentStep: expect.any(String),
              assignedTo: expect.any(String),
              estimatedDuration: expect.any(Number)
            })
          })
        ])
      );
    });

    it('✅ should filter by decision status', async () => {
      const response = await request(app)
        .get('/api/surveying-decisions')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${testUsers.manager.token}`)
        .expect(200);

      response.body.forEach((decision: any) => {
        expect(decision.status).toBe('pending');
      });
    });

    it('✅ should respect LBAC for surveying decisions', async () => {
      const response = await request(app)
        .get('/api/surveying-decisions')
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect(200);

      // All decisions should be within employee's geographic scope
      response.body.forEach((decision: any) => {
        expect(decision.geographicContext?.governorateId)
          .toBe(testUsers.employee.geographicAccess.governorateId);
      });
    });

    it('❌ should require appropriate role (employee+)', async () => {
      await request(app)
        .get('/api/surveying-decisions')
        .set('Authorization', `Bearer ${testUsers.citizen.token}`)
        .expect(403);
    });

  });

  // ================================================================
  // ✅ TEST ENDPOINT 5: PUT /api/tasks/:id (Assignment Verification)
  // ================================================================

  describe('✅ PUT /api/tasks/:id - Assignment Verification', () => {

    it('✅ should complete task when properly assigned', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .send({
          status: 'completed',
          result: {
            surveyCompleted: true,
            findings: 'Property boundaries verified and documented',
            attachments: ['survey_report.pdf', 'boundary_map.jpg']
          },
          completedAt: new Date().toISOString()
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testTaskId,
        status: 'completed',
        result: expect.objectContaining({
          surveyCompleted: true,
          findings: expect.any(String)
        })
      });
    });

    it('❌ should reject completion by non-assigned user', async () => {
      // Different employee trying to complete task not assigned to them
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${testUsers.crossBoundaryEmployee.token}`)
        .send({
          status: 'completed',
          result: { findings: 'Unauthorized completion attempt' }
        })
        .expect([403, 404]); // 403 for authorization failure, 404 if task not found
    });

    it('❌ should enforce LBAC on task updates', async () => {
      // Task in different geographic area
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${testUsers.crossBoundaryEmployee.token}`)
        .send({
          status: 'in_progress',
          notes: 'Geographic boundary violation attempt'
        })
        .expect([403, 404]); // 403 for authorization failure, 404 if task not found
    });

    it('❌ should validate task completion data', async () => {
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .send({
          status: 'completed'
          // Missing required result data
        })
        .expect(400);
    });

    it('❌ should require authentication', async () => {
      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({
          status: 'completed'
        })
        .expect(401);
    });

  });

  // ================================================================
  // 🔒 SECURITY & ERROR HANDLING TESTS
  // ================================================================

  describe('🔒 Security & Error Handling', () => {

    const validApplicationData = {
      applicantName: 'محمد أحمد علي',
      applicantPhone: '+967-771234567',
      applicantEmail: 'mohammed.ali@example.com',
      propertyAddress: 'شارع الثورة، صنعاء',
      serviceType: 'surveying_decision',
      propertyType: 'residential',
      plotArea: 250.5,
      geographicContext: {
        governorateId: 'gov_sanaa',
        districtId: 'dist_altahrir',
        neighborhoodId: 'neigh_alsabeen'
      },
      requestedServices: ['plot_survey', 'boundary_verification']
    };

    it('❌ should reject SQL injection attempts', async () => {
      await request(app)
        .get('/api/applications')
        .query({ 
          status: "'; DROP TABLE applications; --"
        })
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect([400, 403]); // 403 for LBAC denial, 400 for input validation
    });

    it('❌ should reject XSS attempts', async () => {
      await request(app)
        .post('/api/applications')
        .send({
          ...validApplicationData,
          applicantName: '<script>alert("xss")</script>'
        })
        .expect(400);
    });

    it('❌ should handle non-existent endpoints gracefully', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect(404);
    });

    it('❌ should handle malformed IDs', async () => {
      await request(app)
        .get('/api/applications/invalid-id-format')
        .set('Authorization', `Bearer ${testUsers.employee.token}`)
        .expect([400, 403, 404]); // 403 for LBAC, 400 for bad request, or 404 for not found
    });

  });

});

// ================================================================
// 🔧 HELPER FUNCTIONS
// ================================================================

async function setupTestUsers() {
  // CRITICAL: Get actual user IDs from database to create matching JWT tokens
  const mockStorage = (await import('../server/storage')).storage as any;
  const existingUsers = await mockStorage.getUsers();
  
  // Map database users to test user IDs
  const actualUserIds = {
    citizen: existingUsers.find((u: any) => u.username === 'citizen_mohammed')?.id,
    employee: existingUsers.find((u: any) => u.username === 'employee_ahmed')?.id,
    manager: existingUsers.find((u: any) => u.username === 'manager_fatima')?.id,
    admin: existingUsers.find((u: any) => u.username === 'admin_super')?.id,
    crossBoundaryEmployee: existingUsers.find((u: any) => u.username === 'employee_cross')?.id,
  };

  // Create JWT tokens for different user types with LBAC contexts using actual database IDs
  const createTestUser = (userData: Omit<TestUser, 'token'>) => ({
    ...userData,
    token: jwt.sign(
      {
        userId: userData.id, // Use actual database ID
        role: userData.role,
        geographic: userData.geographicAccess
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    )
  });

  testUsers = {
    citizen: createTestUser({
      id: actualUserIds.citizen || uuidv4(), // Use actual DB ID or fallback
      username: 'citizen_mohammed',
      password: 'citizen123',
      role: 'citizen',
      geographicAccess: {
        governorateId: 'gov_sanaa',
        districtId: 'dist_altahrir',
        neighborhoodId: 'neigh_alsabeen'
      }
    }),
    
    employee: createTestUser({
      id: actualUserIds.employee || uuidv4(), // Use actual DB ID or fallback
      username: 'employee_ahmed',
      password: 'employee123',
      role: 'employee',
      geographicAccess: {
        governorateId: 'gov_sanaa',
        districtId: 'dist_altahrir',
        neighborhoodId: 'neigh_alsabeen'
      }
    }),

    manager: createTestUser({
      id: actualUserIds.manager || uuidv4(), // Use actual DB ID or fallback 
      username: 'manager_fatima',
      password: 'manager123',
      role: 'manager',
      geographicAccess: {
        governorateId: 'gov_sanaa',
        districtId: 'dist_altahrir',
        neighborhoodId: 'neigh_alsabeen'
      }
    }),

    admin: createTestUser({
      id: actualUserIds.admin || uuidv4(), // Use actual DB ID or fallback
      username: 'admin_super',
      password: 'admin123',
      role: 'admin',
      geographicAccess: {
        governorateId: '*', // Admin has access to all areas
        districtId: '*',
        neighborhoodId: '*'
      }
    }),

    crossBoundaryEmployee: createTestUser({
      id: actualUserIds.crossBoundaryEmployee || uuidv4(), // Use actual DB ID or fallback
      username: 'employee_cross',
      password: 'employee123',
      role: 'employee',
      geographicAccess: {
        governorateId: 'gov_aden', // Different governorate for LBAC testing
        districtId: 'dist_crater',
        neighborhoodId: 'neigh_maalla'
      }
    })
  };

  console.log('🔑 Test user IDs mapped:', {
    citizen: actualUserIds.citizen,
    employee: actualUserIds.employee,
    manager: actualUserIds.manager,
    admin: actualUserIds.admin,
    crossBoundaryEmployee: actualUserIds.crossBoundaryEmployee
  });
}

async function setupTestData() {
  // Create real test data in the database for comprehensive testing
  testApplicationId = uuidv4();
  testSurveyingDecisionId = uuidv4();  
  testTaskId = uuidv4();
  const testServiceId = uuidv4(); // Create a service ID for testing
  
  // Mock storage.createApplication with test data
  const mockStorage = (await import('../server/storage')).storage as any;
  
  try {
    // CRITICAL: First create actual test users in database
    for (const [userType, userData] of Object.entries(testUsers)) {
      try {
        await mockStorage.createUser({
          id: userData.id,
          username: userData.username,
          email: `${userData.username}@yemenplatform.gov.ye`,
          fullName: `Test User ${userData.username}`,
          password: '$2b$10$test.hash.for.testing', // Fixed field name
          role: userData.role.toUpperCase(),
          departmentId: null,
          positionId: null,
          isActive: true,
          phone: `+967-${Math.random().toString().substr(2, 8)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created test user: ${userType} (${userData.id})`);
      } catch (error) {
        console.log(`ℹ️ Test user ${userType} may already exist:`, error);
      }
    }

    // CRITICAL: Create geographic assignments for users (LBAC setup)
    // Use actual governorate/district UUIDs from database instead of string codes
    const geographicMappings = {
      'gov_sanaa': '6cb4d669-b015-485c-995c-62f0b465705f', // صنعاء
      'gov_aden': '2444ec74-fb5f-45b8-aba0-308181620743'   // عدن
    };

    // CRITICAL: Get actual user IDs from database instead of using generated ones
    const existingUsers = await mockStorage.getUsers();
    const userIdMappings: { [key: string]: string } = {};
    
    for (const dbUser of existingUsers) {
      if (dbUser.username === 'citizen_mohammed') userIdMappings.citizen = dbUser.id;
      if (dbUser.username === 'employee_ahmed') userIdMappings.employee = dbUser.id; 
      if (dbUser.username === 'manager_fatima') userIdMappings.manager = dbUser.id;
      if (dbUser.username === 'admin_super') userIdMappings.admin = dbUser.id;
      if (dbUser.username === 'employee_cross') userIdMappings.crossBoundaryEmployee = dbUser.id;
    }
    
    for (const [userType, userData] of Object.entries(testUsers)) {
      try {
        // Skip admin with '*' access - they don't need specific geographic assignments
        if (userData.role === 'admin') continue;
        
        const actualUserId = userIdMappings[userType];
        if (!actualUserId) {
          console.log(`⚠️ No actual user ID found for: ${userType}`);
          continue;
        }
        
        const governorateUuid = geographicMappings[userData.geographicAccess.governorateId as keyof typeof geographicMappings];
        if (!governorateUuid) {
          console.log(`⚠️ No UUID mapping for governorate: ${userData.geographicAccess.governorateId}`);
          continue;
        }
        
        await mockStorage.createUserGeographicAssignment({
          id: uuidv4(),
          userId: actualUserId, // Use actual DB user ID
          governorateId: governorateUuid, // Use actual UUID
          districtId: null, // Simplified - assign at governorate level for now
          subDistrictId: null,
          neighborhoodId: null,
          assignmentLevel: 'governorate', // Changed to match actual assignment
          assignmentType: 'permanent',
          canRead: true,
          canWrite: true,
          canApprove: userData.role === 'manager',
          isActive: true,
          startDate: new Date(),
          endDate: null,
          createdAt: new Date()
        });
        console.log(`✅ Created geographic assignment: ${userType} (${actualUserId}) -> ${governorateUuid}`);
      } catch (error) {
        console.log(`ℹ️ Geographic assignment for ${userType} may already exist:`, error);
      }
    }
    // Create test application with all required fields
    await mockStorage.createApplication({
      id: testApplicationId,
      applicationNumber: `APP-2025-TEST-${Date.now()}`, // Unique application number
      serviceId: testServiceId, // Required field
      applicantId: testUsers.citizen.id, // Required field (was citizenId)
      status: 'submitted',
      currentStage: 'initial_review',
      applicationData: {
        buildingType: 'residential',
        plotArea: 500,
        buildingArea: 300,
        floors: 2,
        purpose: 'family_residence'
      },
      assignedToId: testUsers.employee.id,
      isPaid: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create test surveying decision
    await mockStorage.createSurveyingDecision({
      id: testSurveyingDecisionId,
      applicationId: testApplicationId,
      decisionType: 'site_survey',
      status: 'pending',
      assignedSurveyorId: testUsers.employee.id,
      geographicContext: {
        governorateId: testUsers.employee.geographicAccess.governorateId,
        districtId: testUsers.employee.geographicAccess.districtId,
        neighborhoodId: testUsers.employee.geographicAccess.neighborhoodId,
      },
      workflow: {
        currentStep: 'field_survey',
        assignedTo: testUsers.employee.id,
        estimatedDuration: 7
      }
    });

    // Create test task assigned to employee
    await mockStorage.createTask({
      id: testTaskId,
      title: 'Site Survey for Building Permit',
      description: 'Conduct comprehensive site survey for residential building permit application',
      applicationId: testApplicationId,
      assignedToId: testUsers.employee.id, // Fixed field name from assigneeId
      assignedById: testUsers.manager.id, // Fixed field name from createdById
      status: 'assigned',
      priority: 'medium',
      estimatedDuration: 7,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('📊 Real test data seeded successfully:', {
      applicationId: testApplicationId,
      surveyingDecisionId: testSurveyingDecisionId,
      taskId: testTaskId
    });
  } catch (error) {
    console.warn('⚠️  Test data seeding failed - tests will run with minimal data:', error);
  }
}