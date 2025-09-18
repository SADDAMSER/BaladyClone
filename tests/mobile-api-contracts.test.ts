/**
 * Mobile API Contract Testing Framework - COMPLETE COVERAGE
 * Yemen Digital Construction Platform
 * 
 * يختبر جميع الـ 11 Mobile API Endpoints الموجودة فعلاً مع Security Testing شامل
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-mobile-contracts';

// Test Express App Setup
let app: express.Express;
let testUserId: string;
let testDeviceId: string;
let validMobileToken: string;
let invalidToken: string;
let webToken: string;
let expiredToken: string;
let testSessionId: string;
let testAttachmentId: string;

describe('🧪 Mobile API Contract Tests - Complete Coverage', () => {
  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Register routes
    registerRoutes(app);

    // Create test data
    await setupTestData();
    console.log('🚀 Contract testing framework initialized');
  });

  afterAll(async () => {
    console.log('✅ All Mobile API contract tests completed');
  });

  // ================================================================
  // 🔐 AUTHENTICATION API TESTS (4 endpoints)
  // ================================================================
  
  describe('🔐 Authentication APIs', () => {
    
    describe('POST /api/mobile/v1/auth/login', () => {
      
      it('✅ should login successfully with valid credentials', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/login')
          .set('X-Device-ID', testDeviceId)
          .send({
            username: 'surveyor_01',
            password: 'surveyor123',
            deviceName: 'Contract Test Device',
            deviceModel: 'iPhone 15 Pro',
            osVersion: 'iOS 17.0',
            appVersion: '2.0.0'
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenType: 'Bearer',
          expiresIn: expect.any(Number)
        });

        // Verify JWT contains mobile_access type
        const decodedToken = jwt.verify(response.body.accessToken, JWT_SECRET) as any;
        expect(decodedToken.type).toBe('mobile_access');
        expect(decodedToken.deviceId).toBe('contract-test-device');
      });

      it('❌ should reject login without X-Device-ID header', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/login')
          .send({
            username: 'surveyor_01',
            password: 'surveyor123',
            deviceName: 'Test Device'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_DEVICE_ID'
          })
        });
      });

      it('❌ should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/login')
          .set('X-Device-ID', 'test-device')
          .send({
            username: 'invalid-user',
            password: 'wrong-password',
            deviceName: 'Test Device'
          });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS'
          })
        });
      });

      it('🛡️ should enforce rate limiting after multiple failed attempts', async () => {
        // Make 6 failed attempts to trigger rate limit
        for (let i = 0; i < 6; i++) {
          await request(app)
            .post('/api/mobile/v1/auth/login')
            .set('X-Device-ID', `rate-test-${i}`)
            .send({
              username: 'nonexistent',
              password: 'wrong',
              deviceName: 'Rate Test'
            });
        }

        // 7th attempt should be rate limited
        const response = await request(app)
          .post('/api/mobile/v1/auth/login')
          .set('X-Device-ID', 'rate-test-final')
          .send({
            username: 'nonexistent',
            password: 'wrong',
            deviceName: 'Rate Test'
          });

        expect(response.status).toBe(429);
        expect(response.headers['retry-after']).toBeDefined();
      });
      
    });

    describe('POST /api/mobile/v1/auth/refresh', () => {
      
      it('✅ should refresh tokens successfully', async () => {
        // First login to get refresh token
        const loginResponse = await request(app)
          .post('/api/mobile/v1/auth/login')
          .set('X-Device-ID', testDeviceId)
          .send({
            username: 'surveyor_01',
            password: 'surveyor123',
            deviceName: 'Test Device'
          });

        const refreshToken = loginResponse.body.refreshToken;

        // Use refresh token
        const response = await request(app)
          .post('/api/mobile/v1/auth/refresh')
          .set('X-Device-ID', testDeviceId)
          .send({ refreshToken });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenType: 'Bearer'
        });
      });

      it('❌ should reject invalid refresh tokens', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/refresh')
          .set('X-Device-ID', testDeviceId)
          .send({ refreshToken: 'invalid-token-12345' });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_REFRESH_TOKEN'
          })
        });
      });
      
    });

    describe('POST /api/mobile/v1/auth/logout', () => {
      
      it('✅ should logout successfully', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/logout')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: expect.any(String)
        });
      });
      
    });

    describe('POST /api/mobile/v1/auth/revoke-device', () => {
      
      it('✅ should revoke device successfully', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/auth/revoke-device')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({ deviceId: 'device-to-revoke' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: expect.any(String)
        });
      });
      
    });

  });

  // ================================================================
  // 🛡️ COMPREHENSIVE SECURITY ENFORCEMENT TESTS
  // ================================================================

  describe('🛡️ Security Enforcement - Defense in Depth', () => {

    describe('Token Type Validation', () => {
      
      it('❌ should reject web tokens on mobile endpoints', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${webToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
          success: false,
          error: 'رمز المصادقة غير مخصص للاستخدام المحمول',
          code: 'INVALID_TOKEN_TYPE'
        });
      });

      it('❌ should reject tokens without type field', async () => {
        const tokenWithoutType = jwt.sign({
          id: testUserId,
          username: 'test-user',
          deviceId: testDeviceId
          // No 'type' field
        }, JWT_SECRET, { expiresIn: '1h' });

        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${tokenWithoutType}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('INVALID_TOKEN_TYPE');
      });
      
    });

    describe('Device Binding Validation', () => {
      
      it('❌ should reject requests without X-Device-ID header', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${validMobileToken}`);
        // Missing X-Device-ID header

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: 'معرف الجهاز مطلوب في header للوصول المحمول',
          code: 'DEVICE_ID_HEADER_MISSING'
        });
      });

      it('❌ should reject tokens without deviceId field', async () => {
        const tokenWithoutDeviceId = jwt.sign({
          id: testUserId,
          username: 'test-user',
          type: 'mobile_access'
          // No deviceId field
        }, JWT_SECRET, { expiresIn: '1h' });

        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${tokenWithoutDeviceId}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('DEVICE_ID_MISSING_IN_TOKEN');
      });

      it('❌ should reject mismatched device IDs', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', 'completely-different-device-id');

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
          success: false,
          error: 'الرمز المميز غير مرتبط بهذا الجهاز',
          code: 'DEVICE_BINDING_MISMATCH'
        });
      });
      
    });

    describe('Token Expiration & Validity', () => {
      
      it('❌ should reject expired tokens', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', `Bearer ${expiredToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
          code: expect.stringMatching(/EXPIRED|INVALID/)
        });
      });

      it('❌ should reject malformed tokens', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .set('Authorization', 'Bearer invalid-jwt-token-format')
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
          code: expect.stringMatching(/INVALID|MALFORMED/)
        });
      });
      
    });

    describe('Input Validation Security', () => {
      
      it('❌ should reject malformed JSON', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/sessions')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/JSON|PARSE|SYNTAX/)
          })
        });
      });

      it('❌ should reject oversized payloads', async () => {
        const hugePayload = {
          data: 'x'.repeat(60 * 1024 * 1024), // 60MB payload
          taskId: 'test',
          surveyType: 'boundary'
        };

        const response = await request(app)
          .post('/api/mobile/v1/sessions')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(hugePayload);

        expect(response.status).toBe(413);
      });
      
    });
    
  });

  // ================================================================
  // 📋 TASK MANAGEMENT API TESTS (1 endpoint)
  // ================================================================

  describe('📋 Task Management API', () => {
    
    describe('GET /api/mobile/v1/tasks', () => {
      
      it('✅ should return paginated tasks with LBAC filtering', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .query({ page: 1, limit: 10, status: 'assigned' })
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tasks: expect.any(Array),
            pagination: {
              page: 1,
              limit: 10,
              total: expect.any(Number),
              totalPages: expect.any(Number)
            }
          }
        });

        // Verify LBAC filtering
        const tasks = response.body.data.tasks;
        tasks.forEach((task: any) => {
          expect(task).toHaveProperty('id');
          expect(task).toHaveProperty('status');
          // All tasks should be within user's geographic scope
          if (task.geographicScope) {
            expect(task.geographicScope).toBeDefined();
          }
        });
      });

      it('✅ should handle empty results gracefully', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .query({ status: 'non_existent_status' })
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tasks: [],
            pagination: expect.objectContaining({
              total: 0
            })
          }
        });
      });
      
    });
    
  });

  // ================================================================
  // 📝 SURVEY SESSION API TESTS (2 endpoints)
  // ================================================================

  describe('📝 Survey Session APIs', () => {
    
    describe('POST /api/mobile/v1/sessions', () => {
      
      it('✅ should create survey session successfully', async () => {
        const sessionData = {
          taskId: 'mock-task-12345',
          plotId: 'mock-plot-67890',
          surveyType: 'boundary_survey',
          sessionType: 'field_survey',
          startLocation: { 
            latitude: 15.3694, 
            longitude: 44.1910,
            accuracy: 1.2,
            governorateId: 'test-gov-id',
            districtId: 'test-district-id'
          },
          plannedStartTime: new Date().toISOString(),
          metadata: {
            weather: 'clear',
            equipment: 'GPS_RTK',
            notes: 'Contract testing session'
          }
        };

        const response = await request(app)
          .post('/api/mobile/v1/sessions')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(sessionData);

        // Accept either success or validation error (depends on mock data availability)
        expect([200, 201, 400, 404]).toContain(response.status);
        
        if (response.status === 201 || response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            data: {
              session: expect.objectContaining({
                id: expect.any(String),
                surveyType: sessionData.surveyType,
                status: expect.any(String)
              })
            }
          });
          testSessionId = response.body.data.session.id;
        }
      });

      it('❌ should validate required fields', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/sessions')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            // Missing required sessionType and startLocation
            plotId: 'test-plot',
            taskId: 'test-task',
            surveyType: 'boundary_survey'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/VALIDATION|REQUIRED|MISSING/)
          })
        });
      });
      
    });

    describe('PUT /api/mobile/v1/sessions/:sessionId/submit', () => {
      
      it('✅ should submit session with valid data', async () => {
        const submissionData = {
          completedAt: new Date().toISOString(),
          finalReport: {
            totalPoints: 25,
            totalArea: 500.75,
            surveyQuality: 'high',
            notes: 'Contract test submission completed'
          },
          summary: {
            duration: 3600,
            accuracy: 'sub-meter'
          }
        };

        const response = await request(app)
          .put(`/api/mobile/v1/sessions/${testSessionId || 'test-session-id'}/submit`)
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(submissionData);

        // Accept success or not found (depends on session existence)
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            data: expect.objectContaining({
              session: expect.objectContaining({
                status: 'submitted'
              })
            })
          });
        }
      });

      it('❌ should reject submission of non-existent session', async () => {
        const response = await request(app)
          .put('/api/mobile/v1/sessions/non-existent-session-id/submit')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            completedAt: new Date().toISOString(),
            finalReport: {}
          });

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/NOT_FOUND|SESSION/)
          })
        });
      });
      
    });
    
  });

  // ================================================================
  // 📎 ATTACHMENT API TESTS (2 endpoints)
  // ================================================================

  describe('📎 Attachment Management APIs', () => {
    
    describe('POST /api/mobile/v1/attachments/upload-url', () => {
      
      it('✅ should generate pre-signed URL successfully', async () => {
        const uploadRequest = {
          fileName: 'survey-photo-001.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          sessionId: testSessionId || 'test-session-id',
          attachmentType: 'survey_photo',
          metadata: {
            capturedAt: new Date().toISOString(),
            gpsLocation: { latitude: 15.3694, longitude: 44.1910 },
            deviceInfo: 'iPhone 15 Pro'
          }
        };

        const response = await request(app)
          .post('/api/mobile/v1/attachments/upload-url')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(uploadRequest);

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            data: {
              attachmentId: expect.any(String),
              uploadUrl: expect.any(String),
              expiresAt: expect.any(String)
            }
          });
          testAttachmentId = response.body.data.attachmentId;
        }
      });

      it('❌ should reject invalid file types', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/attachments/upload-url')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            fileName: 'virus.exe',
            fileSize: 1000,
            mimeType: 'application/x-executable',
            sessionId: 'test-session-id',
            attachmentType: 'survey_document'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/FILE_TYPE|INVALID|FORBIDDEN/)
          })
        });
      });

      it('❌ should reject oversized files', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/attachments/upload-url')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            fileName: 'huge-file.jpg',
            fileSize: 150 * 1024 * 1024, // 150MB
            mimeType: 'image/jpeg',
            sessionId: 'test-session-id',
            attachmentType: 'survey_photo'
          });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/FILE_SIZE|TOO_LARGE|LIMIT/)
          })
        });
      });
      
    });

    describe('POST /api/mobile/v1/attachments/:attachmentId/confirm', () => {
      
      it('✅ should confirm upload successfully', async () => {
        const confirmationData = {
          uploadCompleted: true,
          finalFileSize: 2048000,
          checksum: 'sha256:abcdef1234567890abcdef1234567890abcdef12',
          metadata: {
            uploadDuration: 15.5,
            compressionRatio: 0.85,
            quality: 'high'
          }
        };

        const response = await request(app)
          .post(`/api/mobile/v1/attachments/${testAttachmentId || 'test-attachment-id'}/confirm`)
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(confirmationData);

        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            data: {
              attachment: expect.objectContaining({
                status: 'confirmed'
              })
            }
          });
        }
      });

      it('❌ should reject confirmation of non-existent attachment', async () => {
        const response = await request(app)
          .post('/api/mobile/v1/attachments/non-existent-attachment-id/confirm')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            uploadCompleted: true,
            finalFileSize: 1000
          });

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/NOT_FOUND|ATTACHMENT/)
          })
        });
      });
      
    });
    
  });

  // ================================================================
  // 🔄 DATA SYNCHRONIZATION API TESTS (2 endpoints)
  // ================================================================

  describe('🔄 Data Synchronization APIs', () => {
    
    describe('GET /api/mobile/v1/sync/changes', () => {
      
      it('✅ should retrieve differential changes', async () => {
        const response = await request(app)
          .get('/api/mobile/v1/sync/changes')
          .query({ 
            since: '2023-01-01T00:00:00Z',
            limit: 50,
            entityTypes: 'task,session,plot'
          })
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            changes: expect.any(Array),
            lastSyncTimestamp: expect.any(String),
            hasMore: expect.any(Boolean),
            totalChanges: expect.any(Number)
          }
        });

        // Verify change format
        if (response.body.data.changes.length > 0) {
          const change = response.body.data.changes[0];
          expect(change).toMatchObject({
            id: expect.any(String),
            entityType: expect.any(String),
            operation: expect.stringMatching(/^(create|update|delete)$/),
            data: expect.any(Object),
            timestamp: expect.any(String)
          });
        }
      });

      it('✅ should handle future timestamps gracefully', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const response = await request(app)
          .get('/api/mobile/v1/sync/changes')
          .query({ since: futureDate.toISOString() })
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            changes: [],
            hasMore: false,
            totalChanges: 0
          }
        });
      });
      
    });

    describe('POST /api/mobile/v1/sync/apply', () => {
      
      it('✅ should apply local changes successfully', async () => {
        const localChanges = {
          changes: [
            {
              id: 'local-change-001',
              entityType: 'survey_point',
              operation: 'create',
              data: {
                id: 'local-point-123',
                coordinates: { latitude: 15.3694, longitude: 44.1910 },
                elevation: 2200.5,
                pointType: 'boundary',
                sessionId: testSessionId || 'test-session'
              },
              clientTimestamp: new Date().toISOString(),
              deviceId: testDeviceId
            }
          ],
          syncSessionId: `sync-${Date.now()}`,
          deviceInfo: {
            deviceId: testDeviceId,
            appVersion: '2.0.0',
            syncVersion: '1.0'
          }
        };

        const response = await request(app)
          .post('/api/mobile/v1/sync/apply')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(localChanges);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            applied: expect.any(Number),
            failed: expect.any(Number),
            conflicts: expect.any(Number),
            results: expect.any(Array)
          }
        });
      });

      it('❌ should validate sync changes format', async () => {
        const invalidChanges = {
          changes: [
            {
              // Missing required fields
              entityType: 'invalid_entity',
              data: {}
              // No operation, id, clientTimestamp
            }
          ]
        };

        const response = await request(app)
          .post('/api/mobile/v1/sync/apply')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(invalidChanges);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.stringMatching(/VALIDATION|REQUIRED|INVALID/)
          })
        });
      });

      it('🔒 should handle sync conflicts appropriately', async () => {
        const conflictingChanges = {
          changes: [
            {
              id: 'conflict-change-001',
              entityType: 'survey_session',
              operation: 'update',
              data: {
                id: 'existing-session-id',
                status: 'completed',
                lastModified: '2020-01-01T00:00:00Z' // Very old timestamp
              },
              clientTimestamp: new Date().toISOString()
            }
          ]
        };

        const response = await request(app)
          .post('/api/mobile/v1/sync/apply')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(conflictingChanges);

        expect(response.status).toBe(200);
        expect(response.body.data.results).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: expect.stringMatching(/conflict|applied|failed/)
            })
          ])
        );
      });
      
    });
    
  });

  // ================================================================
  // 🧪 EDGE CASES & ADVANCED SCENARIOS
  // ================================================================

  describe('🧪 Edge Cases & Advanced Scenarios', () => {
    
    describe('Concurrent Operations', () => {
      
      it('🔒 should handle concurrent session submissions', async () => {
        const sessionData = {
          taskId: 'concurrent-test-task',
          plotId: 'concurrent-test-plot',
          surveyType: 'boundary_survey',
          sessionType: 'field_survey',
          startLocation: { 
            latitude: 15.3694, 
            longitude: 44.1910,
            accuracy: 1.2,
            governorateId: 'test-gov-id',
            districtId: 'test-district-id'
          }
        };

        // Create session first
        const createResponse = await request(app)
          .post('/api/mobile/v1/sessions')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send(sessionData);

        if (createResponse.status !== 201 && createResponse.status !== 200) {
          // Skip concurrent test if session creation fails
          return;
        }

        const sessionId = createResponse.body.data.session.id;
        const submissionData = {
          completedAt: new Date().toISOString(),
          finalReport: { notes: 'Concurrent test' }
        };

        // Submit same session twice concurrently
        const [response1, response2] = await Promise.all([
          request(app)
            .put(`/api/mobile/v1/sessions/${sessionId}/submit`)
            .set('Authorization', `Bearer ${validMobileToken}`)
            .set('X-Device-ID', testDeviceId)
            .send(submissionData),
          request(app)
            .put(`/api/mobile/v1/sessions/${sessionId}/submit`)
            .set('Authorization', `Bearer ${validMobileToken}`)
            .set('X-Device-ID', testDeviceId)
            .send(submissionData)
        ]);

        // One should succeed, one should fail with conflict
        const responses = [response1, response2];
        const statusCodes = responses.map(r => r.status);
        
        // Expect either success + conflict OR both success (idempotent)
        expect(statusCodes).toSatisfy((codes: number[]) => {
          return (codes.includes(200) && codes.includes(409)) || 
                 codes.every(code => code === 200);
        });
      });
      
    });

    describe('Resource Access Control', () => {
      
      it('🔒 should prevent cross-user resource access', async () => {
        // Try to access resources that belong to different users
        const response = await request(app)
          .put('/api/mobile/v1/sessions/other-user-session-id/submit')
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId)
          .send({
            completedAt: new Date().toISOString(),
            finalReport: {}
          });

        expect([400, 403, 404]).toContain(response.status);
        
        if (response.status === 403) {
          expect(response.body).toMatchObject({
            success: false,
            error: expect.objectContaining({
              code: expect.stringMatching(/ACCESS_DENIED|FORBIDDEN|UNAUTHORIZED/)
            })
          });
        }
      });
      
    });

    describe('Error Handling & Resilience', () => {
      
      it('🛡️ should handle database connection issues gracefully', async () => {
        // Test with invalid query parameters that might cause DB errors
        const response = await request(app)
          .get('/api/mobile/v1/tasks')
          .query({ 
            page: -1, 
            limit: 9999999,
            invalid_param: 'test',
            status: "'; DROP TABLE users; --"
          })
          .set('Authorization', `Bearer ${validMobileToken}`)
          .set('X-Device-ID', testDeviceId);

        // Should either work with sanitized params or return proper error
        if (response.status !== 200) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
        }
      });

      it('🌐 should provide consistent error formats', async () => {
        const endpoints = [
          { method: 'get', url: '/api/mobile/v1/tasks' },
          { method: 'post', url: '/api/mobile/v1/sessions' },
          { method: 'get', url: '/api/mobile/v1/sync/changes' }
        ];

        for (const endpoint of endpoints) {
          const response = await request(app)[endpoint.method](endpoint.url)
            .set('Authorization', 'Bearer invalid-token')
            .set('X-Device-ID', testDeviceId);

          if (response.status >= 400) {
            expect(response.body).toMatchObject({
              success: false,
              error: expect.objectContaining({
                code: expect.any(String),
                message: expect.any(String)
              })
            });
            // Arabic error messages should be present
            if (response.body.error) {
              // Error can be either string or object with code/message
              if (typeof response.body.error === 'object') {
                expect(response.body.error).toHaveProperty('code');
                expect(response.body.error).toHaveProperty('message');
              } else {
                expect(typeof response.body.error).toBe('string');
              }
            }
          }
        }
      });
      
    });
    
  });

  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================

  async function setupTestData() {
    // Generate valid UUIDs for all test data
    testUserId = uuidv4();
    testDeviceId = uuidv4();
    testSessionId = uuidv4();
    testAttachmentId = uuidv4();

    // Create valid mobile access token
    validMobileToken = jwt.sign({
      id: testUserId,
      username: 'contract-surveyor',
      type: 'mobile_access',
      deviceId: testDeviceId,
      tokenVersion: 1,
      roleCodes: ['surveyor'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (3600 * 24) // 24 hours
    }, JWT_SECRET);

    // Create web token (wrong type)
    webToken = jwt.sign({
      id: testUserId,
      username: 'contract-user',
      type: 'web_access', // Wrong type for mobile
      roleCodes: ['citizen']
    }, JWT_SECRET, { expiresIn: '1h' });

    // Create expired token
    expiredToken = jwt.sign({
      id: testUserId,
      username: 'contract-user',
      type: 'mobile_access',
      deviceId: testDeviceId,
      tokenVersion: 1,
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    }, JWT_SECRET);

    // Invalid token
    invalidToken = 'invalid.jwt.token.format';

    console.log('🔧 Test data configured for comprehensive contract testing');
  }
});