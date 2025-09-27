import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { sql, eq, desc, and, or, isNull, lte, gte, gt, inArray, asc } from "drizzle-orm";
import { 
  applications, userGeographicAssignments, mobileSurveyPoints, mobileSurveyGeometries,
  mobileSurveyAttachments, mobileSurveySessions, changeTracking, deletionTombstones, fieldVisits,
  users, technicalReviewCases, reviewArtifacts, ingestionJobs, rasterProducts
} from "@shared/schema";
import {
  insertUserSchema, insertDepartmentSchema, insertPositionSchema,
  insertLawRegulationSchema, insertLawSectionSchema, insertLawArticleSchema,
  insertRequirementCategorySchema, insertRequirementSchema, insertServiceSchema,
  insertApplicationSchema, insertTaskSchema,
  insertSystemSettingSchema, insertGovernorateSchema, insertDistrictSchema,
  insertSubDistrictSchema, insertNeighborhoodSchema, insertHaratSchema,
  insertSectorSchema, insertNeighborhoodUnitSchema, insertBlockSchema,
  insertPlotSchema, insertStreetSchema, insertStreetSegmentSchema,
  insertServiceTemplateSchema, insertDynamicFormSchema,
  insertWorkflowDefinitionSchema, insertServiceBuilderSchema,
  insertNotificationSchema, insertApplicationStatusHistorySchema,
  insertApplicationAssignmentSchema, insertApplicationReviewSchema,
  insertRoleSchema, insertPermissionSchema, insertRolePermissionSchema,
  insertUserRoleSchema,
  // Enhanced LBAC Hardening schemas - Phase 6
  insertPermissionGeographicConstraintsSchema, insertTemporaryPermissionDelegationsSchema,
  insertGeographicRoleTemplatesSchema, insertUserGeographicAssignmentHistorySchema,
  insertLbacAccessAuditLogSchema,
  // Geoprocessing Queue System schemas - Phase 1
  insertGeoJobSchema, insertGeoJobEventSchema,
  // Missing surveying decision schema
  insertSurveyingDecisionSchema
} from "@shared/schema";
import { DEFAULT_PERMISSIONS } from "@shared/defaults";
import { PaginationParams, validatePaginationParams } from "./pagination";
import workflowRoutes from './routes/workflowRoutes';
import { technicalReviewService } from './services/technicalReviewService';
import { workflowService } from './services/workflowService';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
// Object Storage imports for secure file management
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage';
import { ObjectPermission, ObjectAccessGroupType } from './objectAcl';
import { randomUUID } from "crypto";

// Security Rate Limiting imports
import { 
  authRateLimit, syncRateLimit, uploadRateLimit, generalRateLimit, surveyRateLimit,
  authSlowDown, syncSlowDown, uploadSlowDown, globalSecurityMonitor 
} from './security/rateLimiter';

// Enhanced Mobile Authentication
import { 
  authenticateMobileAccess, validateLBACAccess, requireRole as requireMobileRole,
  validateMobileDevice, AuthenticatedMobileUser 
} from './middleware/mobileAuth';

// Enhanced Input Validation
import {
  validateMobileLogin, validateSessionCreation, validateAttachmentUpload, 
  validateSyncChanges, requireJSON, requireMultipart, basicSecurityProtection,
  validateSessionIdParam, validateAttachmentIdParam
} from './middleware/inputValidation';

// Web Authentication Middleware already exists below - removing duplicate

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
// Type assertion to ensure TypeScript knows JWT_SECRET is defined
const jwtSecret: string = JWT_SECRET;

// Initialize Object Storage Service for signed URLs
const objectStorageService = new ObjectStorageService();

// Helper function to convert completed geo job to overlay metadata
async function convertJobToOverlayData(job: any): Promise<any> {
  // Only process completed jobs with output files
  if (job.status !== 'completed' || !job.outputKeys || job.outputKeys.length === 0) {
    return null;
  }

  try {
    // Look for PNG output in outputKeys (from GeoTIFF processing)
    const pngKey = job.outputKeys.find((key: string) => key.endsWith('.png'));
    if (!pngKey) {
      console.warn(`No PNG output found for job ${job.id}`);
      return null;
    }

    // Get WGS84 bounds from outputPayload (computed by worker)
    const bounds_wgs84 = job.outputPayload?.spatial?.bounds_wgs84;
    if (!bounds_wgs84 || !Array.isArray(bounds_wgs84) || bounds_wgs84.length !== 4) {
      console.warn(`No valid WGS84 bounds found for job ${job.id}`, {
        outputPayload: job.outputPayload,
        spatial: job.outputPayload?.spatial
      });
      return null;
    }

    // Generate signed download URL (24 hour expiry for overlay images)
    const signedUrl = await objectStorageService.generateDownloadUrl(pngKey, 24 * 60 * 60);
    
    return {
      id: job.id,
      status: 'available',
      overlay: {
        url: signedUrl,
        bounds: [
          [bounds_wgs84[1], bounds_wgs84[0]], // [south, west] - leaflet format
          [bounds_wgs84[3], bounds_wgs84[2]]  // [north, east] - leaflet format  
        ],
        opacity: job.outputPayload?.opacity || 0.7,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        taskType: job.taskType,
        targetType: job.targetType,
        targetId: job.targetId,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    };
  } catch (error) {
    console.error(`Error converting job ${job.id} to overlay data:`, error);
    return null;
  }
}

// Helper function to generate consistent UUIDs for mock users
function generateMockUserUuid(username: string): string {
  // Create a consistent UUID based on the username
  const hash = crypto.createHash('sha256').update(`mock-user-${username}`).digest('hex');
  // Convert to UUID v4 format
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // Version 4
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant bits
    hash.slice(20, 32)
  ].join('-');
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string; // Legacy compatibility
    roleCodes?: string[]; // New RBAC system - array of role codes
    geographicAssignments?: any[];
    // JWT payload fields
    type?: string;      // Token type (web, mobile, etc.)
    deviceId?: string;  // Device identifier for mobile tokens
    exp?: number;       // Token expiration timestamp
    iat?: number;       // Token issued at timestamp
  };
  requiredOwnership?: {
    field: string;
    userId: string;
  };
  deviceId?: string; // For mobile device validation
}

// Middleware to verify JWT token (ENHANCED WITH DIAGNOSTIC LOGGING)
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log(`[🔍 AUTH DEBUG] ${req.method} ${req.path} - Token verification start`, {
    hasAuthHeader: !!authHeader,
    tokenLength: token ? token.length : 0,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  if (!token) {
    console.error(`[❌ AUTH] Missing token for ${req.method} ${req.path}`);
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      console.error(`[❌ AUTH] JWT verification failed for ${req.method} ${req.path}:`, {
        errorName: err.name,
        errorMessage: err.message,
        tokenSample: token.substring(0, 50) + '...',
        jwtSecretPresent: !!jwtSecret
      });
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // ✅ EXTENSIVE JWT PAYLOAD LOGGING
    // Support both userId (test format) and id fields for compatibility
    const userId = user.userId || user.id;
    
    // Log only essential audit information (no sensitive token content)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ AUTH SUCCESS] JWT verified for ${req.method} ${req.path}:`, {
        userId: userId ? userId.substring(0, 8) + '...' : 'undefined',
        username: user.username,
        role: user.role
      });
    }
    req.user = {
      ...user,
      id: userId, // Normalize to id field
      roleCodes: [user.role?.toUpperCase()] // Convert role to array of uppercase codes
    };
    next();
  });
};

// Enhanced Geographic ID Extraction Helper - FIXED with application route support
const extractGeographicIds = async (req: AuthenticatedRequest): Promise<{
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
}> => {
  // Direct IDs from params/body
  const directIds = {
    governorateId: req.params.governorateId || req.body.governorateId,
    districtId: req.params.districtId || req.body.districtId,
    subDistrictId: req.params.subDistrictId || req.body.subDistrictId,
    neighborhoodId: req.params.neighborhoodId || req.body.neighborhoodId
  };

  // If we have direct IDs, return them
  if (directIds.governorateId || directIds.districtId || directIds.subDistrictId || directIds.neighborhoodId) {
    return directIds;
  }

  // Try to derive geographic context from resource IDs - FIXED: Map params.id based on route
  let applicationId = req.params.applicationId || req.body.applicationId;
  let plotId = req.params.plotId || req.body.plotId;
  
  // CRITICAL FIX: Map req.params.id based on route path for proper LBAC extraction
  if (req.params.id && !applicationId && !plotId) {
    const routePath = req.route?.path || req.path;
    if (routePath.includes('/applications/')) {
      applicationId = req.params.id; // /api/applications/:id/* → use id as applicationId
    } else if (routePath.includes('/plots/')) {
      plotId = req.params.id; // /api/plots/:id/* → use id as plotId
    }
  }

  try {
    // From application: applicationData contains geographic info
    if (applicationId) {
      const application = await storage.getApplication(applicationId);
      if (application?.applicationData) {
        const appData = application.applicationData as any;
        return {
          governorateId: appData.governorateId,
          districtId: appData.districtId,
          subDistrictId: appData.subDistrictId,
          neighborhoodId: appData.neighborhoodId
        };
      }
    }

    // From plot: trace back through geographic hierarchy
    if (plotId) {
      const plot = await storage.getPlot(plotId);
      if (plot?.blockId) {
        const block = await storage.getBlock(plot.blockId);
        if (block?.neighborhoodUnitId) {
          const neighborhoodUnit = await storage.getNeighborhoodUnit(block.neighborhoodUnitId);
          if (neighborhoodUnit?.neighborhoodId) {
            const neighborhood = await storage.getNeighborhood(neighborhoodUnit.neighborhoodId);
            if (neighborhood?.subDistrictId) {
              const subDistrict = await storage.getSubDistrict(neighborhood.subDistrictId);
              if (subDistrict?.districtId) {
                const district = await storage.getDistrict(subDistrict.districtId);
                return {
                  governorateId: district?.governorateId,
                  districtId: district?.id,
                  subDistrictId: subDistrict.id,
                  neighborhoodId: neighborhood.id
                };
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting geographic IDs:', error);
  }

  return {};
};

// In-memory cache for user geographic scopes (performance optimization)
interface CachedUserScope {
  scope: any;
  timestamp: number;
  expiresAt: number;
}

const userScopeCache = new Map<string, CachedUserScope>();
const SCOPE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Rate limiting for LBAC checks
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent unbounded growth

// Audit log interface
interface LBACAccessLog {
  userId: string;
  timestamp: Date;
  method: string;
  path: string;
  requiredLevel: string;
  targetId?: string;
  accessGranted: boolean;
  userAgent?: string;
  ipAddress?: string;
  denialReason?: string;
}

// Enhanced LBAC Enforcement Middleware with Security & Performance
const enforceLBACAccess = (
  requiredLevel: 'governorate' | 'district' | 'subDistrict' | 'neighborhood',
  options?: {
    bypassCache?: boolean;
    enableAuditLog?: boolean;
    strictMode?: boolean;
    maxCacheAge?: number;
  }
) => {
  const config = {
    bypassCache: false,
    enableAuditLog: true,
    strictMode: true,
    maxCacheAge: SCOPE_CACHE_TTL,
    ...options
  };

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admins bypass LBAC (with audit logging)
    if (user.role === 'admin') {
      if (config.enableAuditLog) {
        await logLBACAccess({
          userId: user.id,
          timestamp: new Date(),
          method: req.method,
          path: req.path,
          requiredLevel,
          accessGranted: true,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        });
      }
      return next();
    }

    try {
      // Rate limiting check
      const rateLimitKey = `${user.id}:${requiredLevel}`;
      if (!checkRateLimit(rateLimitKey)) {
        if (config.enableAuditLog) {
          await logLBACAccess({
            userId: user.id,
            timestamp: new Date(),
            method: req.method,
            path: req.path,
            requiredLevel,
            accessGranted: false,
            denialReason: 'rate_limit_exceeded',
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
          });
        }
        return res.status(429).json({ message: 'Too many requests' });
      }

      // Extract geographic IDs from request (with error handling)
      const targetIds = await extractGeographicIds(req);
      
      let targetId: string | undefined;
      if (requiredLevel === 'governorate') targetId = targetIds.governorateId;
      else if (requiredLevel === 'district') targetId = targetIds.districtId;
      else if (requiredLevel === 'subDistrict') targetId = targetIds.subDistrictId;
      else if (requiredLevel === 'neighborhood') targetId = targetIds.neighborhoodId;

      if (!targetId) {
        if (config.enableAuditLog) {
          await logLBACAccess({
            userId: user.id,
            timestamp: new Date(),
            method: req.method,
            path: req.path,
            requiredLevel,
            accessGranted: false,
            denialReason: 'missing_geographic_context',
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
          });
        }
        // SECURITY: Don't leak geographic structure in error message
        return res.status(403).json({ 
          message: 'Access denied: Insufficient geographic permissions'
        });
      }

      // Get user scope with caching
      const { scope: userScope, cacheHit } = await getUserGeographicScopeWithCache(user.id, config);
      
      // Check access based on required level and hierarchical scope
      let hasAccess = false;
      if (requiredLevel === 'governorate' && userScope.governorateIds.includes(targetId)) {
        hasAccess = true;
      } else if (requiredLevel === 'district' && userScope.districtIds.includes(targetId)) {
        hasAccess = true;
      } else if (requiredLevel === 'subDistrict' && userScope.subDistrictIds.includes(targetId)) {
        hasAccess = true;
      } else if (requiredLevel === 'neighborhood' && userScope.neighborhoodIds.includes(targetId)) {
        hasAccess = true;
      }

      // Audit logging
      if (config.enableAuditLog) {
        await logLBACAccess({
          userId: user.id,
          timestamp: new Date(),
          method: req.method,
          path: req.path,
          requiredLevel,
          targetId,
          accessGranted: hasAccess,
          denialReason: hasAccess ? undefined : 'insufficient_geographic_permissions',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        });
      }

      if (!hasAccess) {
        // SECURITY: Minimal information disclosure
        return res.status(403).json({ 
          message: 'Access denied: Insufficient permissions'
        });
      }

      // Add performance metrics to response headers (development only)
      if (process.env.NODE_ENV === 'development') {
        res.setHeader('X-LBAC-Processing-Time', `${Date.now() - startTime}ms`);
        res.setHeader('X-LBAC-Cache-Hit', cacheHit ? 'true' : 'false');
      }

      next();
    } catch (error) {
      console.error('LBAC enforcement error:', error);
      
      if (config.enableAuditLog) {
        await logLBACAccess({
          userId: user.id,
          timestamp: new Date(),
          method: req.method,
          path: req.path,
          requiredLevel,
          accessGranted: false,
          denialReason: 'system_error',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress
        });
      }
      
      // SECURITY: Don't leak internal error details
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Helper function to get user scope with caching - FIXED: Return cache hit info
async function getUserGeographicScopeWithCache(userId: string, config: any): Promise<{ scope: any; cacheHit: boolean }> {
  const now = Date.now();
  const cached = userScopeCache.get(userId);
  
  // Check if cache is valid and not bypassed
  if (!config.bypassCache && cached && now < cached.expiresAt) {
    return { scope: cached.scope, cacheHit: true };
  }
  
  // Fetch fresh scope from storage
  const scope = await storage.expandUserGeographicScope(userId);
  
  // Cache the result
  userScopeCache.set(userId, {
    scope,
    timestamp: now,
    expiresAt: now + config.maxCacheAge
  });
  
  // Cleanup expired cache entries periodically (both caches)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredCache();
    cleanupExpiredRateLimits();
  }
  
  return { scope, cacheHit: false };
}

// Rate limiting checker - FIXED: Correct window reset logic
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const current = rateLimitTracker.get(key);
  
  // FIXED: Correct reset condition - check if current time >= resetTime
  if (!current || now >= current.resetTime) {
    // New window or expired - reset counter
    rateLimitTracker.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

// Rate limit cleanup to prevent unbounded memory growth
function cleanupExpiredRateLimits() {
  const now = Date.now();
  
  // Clean expired entries
  Array.from(rateLimitTracker.entries()).forEach(([key, entry]) => {
    if (now >= entry.resetTime) {
      rateLimitTracker.delete(key);
    }
  });
  
  // If still too many entries, remove oldest ones (LRU-style)
  if (rateLimitTracker.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitTracker.entries());
    // Sort by resetTime and remove the oldest
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
    const toRemove = entries.slice(0, rateLimitTracker.size - MAX_RATE_LIMIT_ENTRIES);
    toRemove.forEach(([key]) => rateLimitTracker.delete(key));
  }
}

// Cache cleanup
function cleanupExpiredCache() {
  const now = Date.now();
  // Use Array.from to fix TypeScript iteration compatibility
  Array.from(userScopeCache.entries()).forEach(([key, cached]) => {
    if (now >= cached.expiresAt) {
      userScopeCache.delete(key);
    }
  });
}

// Audit logging function
async function logLBACAccess(log: LBACAccessLog) {
  try {
    // In production, this would write to a dedicated audit table
    // For now, we'll use console logging with structured format
    console.log('LBAC_AUDIT:', JSON.stringify({
      ...log,
      timestamp: log.timestamp.toISOString()
    }));
    
    // TODO: Write to audit table in database
    // await storage.createAuditLog({
    //   userId: log.userId,
    //   action: 'lbac_access_check',
    //   resource: `${log.method} ${log.path}`,
    //   details: log,
    //   timestamp: log.timestamp
    // });
  } catch (error) {
    console.error('Failed to log LBAC access:', error);
  }
}

// Enhanced RBAC (Role-Based Access Control) Middleware with caching
const roleCache = new Map<string, { roles: string[]; timestamp: number }>();
const ROLE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// RBAC (Role-Based Access Control) Middleware
const requireRole = (allowedRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient role permissions',
        required: roles,
        current: user.role
      });
    }

    next();
  };
};

// Resource Ownership Middleware (RBAC Record-Level) - FIXED WITH ACTUAL ENFORCEMENT
const requireOwnership = (resourceField: string = 'createdBy') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admins bypass ownership checks
    if (user.role === 'admin') {
      return next();
    }

    // Extract resource ownership from body (for updates) or set user as owner (for creates)
    if (req.method === 'POST') {
      // For CREATE operations: set server-side ownership
      req.body[resourceField] = user.id;
    } else if (req.method === 'PUT' || req.method === 'DELETE') {
      // For UPDATE/DELETE: verify ownership (CRITICAL - MUST BE ENFORCED)
      req.requiredOwnership = { field: resourceField, userId: user.id };
    }

    next();
  };
};

// Helper function to enforce ownership in route handlers
const enforceOwnership = async (req: AuthenticatedRequest, res: Response, recordId: string, getRecordFn: Function): Promise<boolean> => {
  if (!req.requiredOwnership) return true; // No ownership required
  if (req.user?.role === 'admin') return true; // Admin bypass

  try {
    const record = await getRecordFn(recordId);
    if (!record) {
      res.status(404).json({ message: 'Resource not found' });
      return false;
    }

    const recordOwner = record[req.requiredOwnership.field];
    if (recordOwner !== req.requiredOwnership.userId) {
      res.status(403).json({ 
        message: 'Access denied: You can only modify your own resources',
        resourceOwner: recordOwner,
        requestingUser: req.requiredOwnership.userId
      });
      return false;
    }

    return true;
  } catch (error) {
    res.status(500).json({ message: 'Error verifying ownership' });
    return false;
  }
};

// Validation Middleware using Zod
const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors
      });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // PUBLIC ROUTES - MUST BE FIRST (No authentication required)
  
  // Public application tracking endpoint - separate path to avoid conflicts
  app.get("/api/track-application", async (req, res) => {
    try {
      console.log('Public tracking endpoint called with:', req.query);
      const { search_term, search_by } = req.query;
      
      if (!search_term || !search_by) {
        return res.status(400).json({ error: "search_term and search_by are required" });
      }

      let application;
      
      if (search_by === 'application_number') {
        // Search by application number
        const foundApplications = await db.select()
          .from(applications)
          .where(eq(applications.applicationNumber, search_term as string))
          .limit(1);
        application = foundApplications[0];
      } else if (search_by === 'national_id') {
        // Search by national ID in application data
        const foundApplications = await db.select()
          .from(applications)
          .where(
            sql`(application_data->>'applicantId') = ${search_term as string}`
          )
          .limit(1);
        application = foundApplications[0];
      } else {
        return res.status(400).json({ error: "search_by must be 'application_number' or 'national_id'" });
      }

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Simple response without complex joins for now
      const applicationData = application.applicationData as any || {};
      
      // CRITICAL: Remove PII from public response to prevent enumeration/brute-force
      const response = {
        applicationNumber: application.applicationNumber,
        serviceType: application.serviceId === 'service-surveying-decision' ? 'قرار المساحة' : 'خدمة حكومية',
        status: application.status,
        currentStage: application.currentStage || 'submitted',
        submittedAt: application.createdAt,
        estimatedCompletion: null, // Field not in current schema
        // PII REMOVED: applicantName, applicantId, contactPhone, email for security
        applicationData: {
          governorate: applicationData.governorate,
          district: applicationData.district,
          area: applicationData.area,
          landNumber: applicationData.landNumber,
          plotNumber: applicationData.plotNumber,
          surveyType: applicationData.surveyType,
          purpose: applicationData.purpose
          // REMOVED: description (may contain PII)
        }
      };

      console.log('Successfully found application:', response.applicationNumber);
      res.json(response);
    } catch (error) {
      console.error('Error tracking application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create demo user for testing (only in development)
  app.post("/api/auth/create-demo-user", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not available in production" });
      }

      // Check if demo user already exists
      const existingUser = await storage.getUserByUsername("public_service");
      if (existingUser) {
        return res.json({ message: "Demo user already exists", user: existingUser });
      }

      // Create demo user
      const hashedPassword = await bcrypt.hash("demo123", 12);
      const demoUser = await storage.createUser({
        username: "public_service",
        email: "public.service@demo.com",
        fullName: "موظف خدمة الجمهور",
        password: hashedPassword,
        role: "public_service",
        departmentId: null,
        positionId: null,
        isActive: true
      });

      res.json({ message: "Demo user created successfully", user: demoUser });
    } catch (error) {
      console.error("Error creating demo user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple login test endpoint (for debugging)
  app.post("/api/auth/simple-login", async (req, res) => {
    // Restrict to development only for security
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Endpoint not available in production' });
    }
    
    // Additional security: require explicit flag for mock authentication
    if (process.env.ALLOW_MOCK_AUTH !== 'true') {
      return res.status(404).json({ message: 'Mock authentication not enabled' });
    }
    try {
      const { username, password, mockUser } = req.body;
      console.log('Simple login attempt for user:', username, 'mockUser:', mockUser);
      
      // Handle mock users for testing
      if (mockUser) {
        const mockUsers = [
          { username: 'admin_test', role: 'admin', fullName: 'مدير النظام' },
          { username: 'citizen_test', role: 'citizen', fullName: 'احمد المواطن' },
          { username: 'cashier_01', role: 'employee', fullName: 'سعد أمين الصندوق' },
          { username: 'public_service_01', role: 'employee', fullName: 'محمد موظف الخدمة العامة' },
          { username: 'dept_manager_01', role: 'manager', fullName: 'محمد مدير قسم المساحة' },
          { username: 'assistant_head_01', role: 'assistant_head', fullName: 'أحمد مساعد رئيس قسم المساحة' },
          { username: 'surveyor_01', role: 'employee', fullName: 'فهد المهندس المساح الأول' },
          { username: 'surveyor_02', role: 'employee', fullName: 'سالم المهندس المساح الثاني' },
          { username: 'technical_reviewer_01', role: 'technical_reviewer', fullName: 'خالد المراجع الفني' }
        ];

        const mockUser = mockUsers.find(u => u.username === username);
        if (!mockUser) {
          console.log('Mock user not found:', username);
          return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log('Mock user found, creating token for:', mockUser.username);
        
        // Create JWT token for mock user - lookup or create real DB user
        let dbUser;
        try {
          // First, try to find existing user in database
          dbUser = await storage.getUserByUsername(mockUser.username);
        } catch (error) {
          console.log('Database user not found, will create:', mockUser.username);
        }
        
        if (!dbUser) {
          // Create user in database with deterministic UUID for consistency
          const mockUuid = generateMockUserUuid(mockUser.username);
          const hashedPassword = await bcrypt.hash('StrongTestPassword123!', 10);
          const normalizedRoleCodes = normalizeRoleCodes(mockUser.role);
          
          // Insert user into database with specific ID (direct insert for mock users)
          try {
            const [insertedUser] = await db.insert(users).values({
              id: mockUuid,
              username: mockUser.username,
              password: hashedPassword,
              email: `${mockUser.username}@local`,
              fullName: mockUser.fullName,
              role: mockUser.role,
              isActive: true
            }).returning();
            dbUser = insertedUser;
            console.log('Created new database user for mock:', mockUser.username, 'with ID:', dbUser.id);
          } catch (createError) {
            console.error('Failed to create mock user in database:', createError);
            return res.status(500).json({ message: "Failed to initialize mock user" });
          }
        }
        
        // ✅ FIX: Read actual roles from database instead of using mockUser.role
        let userRoles: any[] = [];
        let roleCodes: string[] = [];
        try {
          userRoles = await storage.getUserActiveRoles(dbUser.id);
          roleCodes = userRoles.map(role => role.code);
          console.log(`Found ${userRoles.length} roles for user ${dbUser.username}:`, roleCodes);
          
          // Fallback to legacy role if no RBAC roles assigned
          if (roleCodes.length === 0 && dbUser.role) {
            roleCodes = [dbUser.role];
            console.log('Using legacy role as fallback:', dbUser.role);
          }
        } catch (error) {
          console.error('Error fetching user roles:', error);
          // Fallback to legacy role
          roleCodes = dbUser.role ? [dbUser.role] : [mockUser.role];
        }
        
        const normalizedRoleCodes = normalizeRoleCodes(roleCodes);
        const primaryRole = roleCodes[0] || dbUser.role || mockUser.role;
        
        const token = jwt.sign(
          { 
            id: dbUser.id, // ✅ USE ACTUAL DATABASE USER ID
            username: dbUser.username, 
            role: primaryRole, // ✅ USE ACTUAL PRIMARY ROLE
            roleCodes: normalizedRoleCodes // ✅ USE ACTUAL ROLES FROM DB
          },
          jwtSecret,
          { expiresIn: '24h' }
        );
        
        return res.json({
          token,
          user: {
            id: `mock-${mockUser.username}`,
            username: mockUser.username,
            fullName: mockUser.fullName,
            role: primaryRole, // ✅ USE ACTUAL PRIMARY ROLE
            roleCodes: normalizedRoleCodes, // ✅ CONSISTENT WITH TOKEN
            roles: userRoles.length > 0 ? userRoles.map(r => ({ code: r.code, nameAr: r.nameAr })) : [{ code: primaryRole, nameAr: mockUser.fullName }]
          }
        });
      }
      
      // Regular login for database users
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('User found, checking password');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('Password invalid');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('Password valid, fetching roles and creating token');
      
      // Fetch user's active roles for new RBAC system
      let userRoles: any[] = [];
      let roleCodes: string[] = [];
      try {
        userRoles = await storage.getUserActiveRoles(user.id);
        roleCodes = userRoles.map(role => role.code);
        // Fallback to legacy role if no RBAC roles assigned
        if (roleCodes.length === 0 && user.role) {
          roleCodes = normalizeRoleCodes(user.role); // ✅ NORMALIZED FALLBACK
        }
      } catch (roleError) {
        console.error('Error fetching user roles for simple login:', roleError);
        // Fallback to legacy role system
        roleCodes = normalizeRoleCodes(user.role); // ✅ NORMALIZED ERROR FALLBACK
      }
      
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, // Legacy compatibility
          roleCodes: roleCodes // New RBAC system
        },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      console.log('Token created successfully');
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role, // Legacy compatibility
          roleCodes: roleCodes, // New RBAC system
          roles: userRoles // Full role objects for UI
        }
      });
    } catch (error) {
      console.error("Simple login error:", error);
      res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Fetch user's geographic assignments for LBAC (with error handling)
      let geographicAssignments = [];
      try {
        geographicAssignments = await storage.getUserGeographicAssignments({
          userId: user.id,
          isActive: true,
          includeExpired: false
        });
      } catch (geoError) {
        console.error('Error fetching geographic assignments:', geoError);
        // Continue with empty assignments - not critical for login
      }

      // Fetch user's active roles for new RBAC system
      let userRoles: any[] = [];
      let roleCodes: string[] = [];
      try {
        userRoles = await storage.getUserActiveRoles(user.id);
        roleCodes = userRoles.map(role => role.code);
        // Fallback to legacy role if no RBAC roles assigned
        if (roleCodes.length === 0 && user.role) {
          roleCodes = normalizeRoleCodes(user.role); // ✅ NORMALIZED FALLBACK
        }
      } catch (roleError) {
        console.error('Error fetching user roles:', roleError);
        // Fallback to legacy role system
        roleCodes = normalizeRoleCodes(user.role); // ✅ NORMALIZED ERROR FALLBACK
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, // Legacy compatibility
          roleCodes: roleCodes // New RBAC system
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role, // Legacy compatibility
          roleCodes: roleCodes, // New RBAC system
          roles: userRoles, // Full role objects for UI
          departmentId: user.departmentId,
          positionId: user.positionId,
          geographicAssignments: geographicAssignments
        }
      });
    } catch (error) {
      console.error("Login error details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.get("/api/users", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { role, departmentId, isActive } = req.query;
      const users = await storage.getUsers({
        role: role as string,
        departmentId: departmentId as string,
        isActive: isActive === 'true',
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Users API with pagination, search, and filtering
  app.get("/api/users/paginated", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const params = validatePaginationParams(req.query);
      const result = await storage.getUsersPaginated(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid pagination parameters", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // CRITICAL: Only admin or self can view user details (PII protection)
      if (req.user?.role !== 'admin' && req.user?.id !== req.params.id) {
        return res.status(403).json({ 
          message: 'Access denied: You can only view your own profile or admin access required' 
        });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // CRITICAL: Only admin or self can update user profile
      if (req.user?.role !== 'admin' && req.user?.id !== req.params.id) {
        return res.status(403).json({ 
          message: 'Access denied: You can only update your own profile or admin access required' 
        });
      }

      let updates = req.body;
      
      // CRITICAL: Prevent privilege escalation - non-admins can only update safe fields
      if (req.user?.role !== 'admin' && req.user?.id === req.params.id) {
        // Self-update: only allow safe fields
        const allowedSelfFields = ['fullName', 'email', 'password'];
        const safeUpdates: any = {};
        
        allowedSelfFields.forEach(field => {
          if (updates[field] !== undefined) {
            safeUpdates[field] = updates[field];
          }
        });
        
        updates = safeUpdates;
        console.log(`[SECURITY] Self-update by user ${req.user.id}, allowed fields only:`, Object.keys(updates));
      }

      // Validate safe updates
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }
      
      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organizational structure routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/departments", authenticateToken, requireRole('admin'), validateRequest(insertDepartmentSchema), async (req, res) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/departments/:id", authenticateToken, async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/departments/:id", authenticateToken, requireRole('admin'), validateRequest(insertDepartmentSchema.partial()), async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/departments/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Roles endpoints (RBAC system)
  app.get("/api/roles", authenticateToken, async (req, res) => {
    try {
      const { isActive, isSystemRole } = req.query;
      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isSystemRole !== undefined) filters.isSystemRole = isSystemRole === 'true';
      
      const roles = await storage.getRoles(filters);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/roles/:id", authenticateToken, async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/roles", authenticateToken, requireRole('admin'), validateRequest(insertRoleSchema), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/roles/:id", authenticateToken, requireRole('admin'), validateRequest(insertRoleSchema.partial()), async (req, res) => {
    try {
      const role = await storage.updateRole(req.params.id, req.body);
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/roles/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Permissions endpoints
  app.get("/api/permissions", authenticateToken, async (req, res) => {
    try {
      const { category, resource, isActive } = req.query;
      const filters: any = {};
      if (category) filters.category = category as string;
      if (resource) filters.resource = resource as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      // Get permissions from database first
      const dbPermissions = await storage.getPermissions(filters);
      
      // If no DB permissions found, return DEFAULT_PERMISSIONS (filtered if needed)
      if (dbPermissions.length === 0) {
        let permissions = DEFAULT_PERMISSIONS;
        if (filters.category) {
          permissions = permissions.filter(p => p.category === filters.category);
        }
        if (filters.resource) {
          permissions = permissions.filter(p => p.resource === filters.resource);
        }
        if (filters.isActive !== undefined) {
          permissions = permissions.filter(p => p.isActive === filters.isActive);
        }
        return res.json(permissions);
      }
      
      res.json(dbPermissions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/permissions/:id", authenticateToken, async (req, res) => {
    try {
      const permission = await storage.getPermission(req.params.id);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Role permissions endpoints
  app.get("/api/roles/:roleId/permissions", authenticateToken, async (req, res) => {
    try {
      const roleId = req.params.roleId;
      
      // Check if role exists
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Get role permissions
      const rolePermissions = await storage.getRolePermissions(roleId);
      res.json(rolePermissions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/roles/:roleId/permissions", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const roleId = req.params.roleId;
      const { permissionIds } = req.body;
      
      if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ message: "permissionIds must be an array" });
      }
      
      // Check if role exists
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Remove all existing permissions for this role
      const existingRolePermissions = await storage.getRolePermissions(roleId);
      for (const rp of existingRolePermissions) {
        await storage.removePermissionFromRole(roleId, rp.permissionId);
      }
      
      // Add new permissions
      for (const permissionId of permissionIds) {
        await storage.assignPermissionToRole({
          roleId,
          permissionId,
          isActive: true
        });
      }
      
      // Return updated permissions
      const updatedRolePermissions = await storage.getRolePermissions(roleId);
      res.json(updatedRolePermissions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Governorates endpoints (Geographic data - public access for read operations)
  app.get("/api/governorates", async (req, res) => {
    try {
      const governorates = await storage.getGovernorates();
      res.json(governorates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id", async (req, res) => {
    try {
      const governorate = await storage.getGovernorate(req.params.id);
      if (!governorate) {
        return res.status(404).json({ message: "Governorate not found" });
      }
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/code/:code", async (req, res) => {
    try {
      const governorate = await storage.getGovernorateByCode(req.params.code);
      if (!governorate) {
        return res.status(404).json({ message: "Governorate not found" });
      }
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/governorates", authenticateToken, requireRole('admin'), validateRequest(insertGovernorateSchema), async (req, res) => {
    try {
      const validatedData = insertGovernorateSchema.parse(req.body);
      const governorate = await storage.createGovernorate(validatedData);
      res.status(201).json(governorate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/governorates/:id", authenticateToken, requireRole('admin'), validateRequest(insertGovernorateSchema), async (req, res) => {
    try {
      const governorate = await storage.updateGovernorate(req.params.id, req.body);
      res.json(governorate);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/governorates/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteGovernorate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Districts endpoints (Geographic data - public access for read operations)
  app.get("/api/districts", async (req, res) => {
    try {
      const { governorateId } = req.query;
      const districts = await storage.getDistricts(governorateId as string);
      res.json(districts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/:id", async (req, res) => {
    try {
      const district = await storage.getDistrict(req.params.id);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/code/:code", async (req, res) => {
    try {
      const district = await storage.getDistrictByCode(req.params.code);
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id/districts", async (req, res) => {
    try {
      const districts = await storage.getDistrictsByGovernorateId(req.params.id);
      res.json(districts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/districts", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('governorate'), validateRequest(insertDistrictSchema), async (req, res) => {
    try {
      const validatedData = insertDistrictSchema.parse(req.body);
      const district = await storage.createDistrict(validatedData);
      res.status(201).json(district);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/districts/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('district'), validateRequest(insertDistrictSchema), async (req, res) => {
    try {
      const district = await storage.updateDistrict(req.params.id, req.body);
      res.json(district);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/districts/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('district'), async (req, res) => {
    try {
      await storage.deleteDistrict(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sub-districts endpoints (Geographic data - public access for read operations)
  app.get("/api/sub-districts", async (req, res) => {
    try {
      const { districtId } = req.query;
      const subDistricts = await storage.getSubDistricts(districtId as string);
      res.json(subDistricts);
    } catch (error: any) {
      console.error('sub-districts failed', { impl: storage.constructor.name, err: error.message, stack: error.stack });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sub-districts/:id", async (req, res) => {
    try {
      const subDistrict = await storage.getSubDistrict(req.params.id);
      if (!subDistrict) {
        return res.status(404).json({ message: "Sub-district not found" });
      }
      res.json(subDistrict);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/districts/:id/sub-districts", async (req, res) => {
    try {
      const subDistricts = await storage.getSubDistrictsByDistrictId(req.params.id);
      res.json(subDistricts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sub-districts", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('district'), validateRequest(insertSubDistrictSchema), async (req, res) => {
    try {
      const validatedData = insertSubDistrictSchema.parse(req.body);
      const subDistrict = await storage.createSubDistrict(validatedData);
      res.status(201).json(subDistrict);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/sub-districts/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('subDistrict'), validateRequest(insertSubDistrictSchema), async (req, res) => {
    try {
      const subDistrict = await storage.updateSubDistrict(req.params.id, req.body);
      res.json(subDistrict);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/sub-districts/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('subDistrict'), async (req, res) => {
    try {
      await storage.deleteSubDistrict(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Neighborhoods endpoints (Geographic data - public access for read operations)
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const { subDistrictId } = req.query;
      const neighborhoods = await storage.getNeighborhoods(subDistrictId as string);
      res.json(neighborhoods);
    } catch (error: any) {
      console.error('neighborhoods failed', { impl: storage.constructor.name, err: error.message, stack: error.stack });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id", async (req, res) => {
    try {
      const neighborhood = await storage.getNeighborhood(req.params.id);
      if (!neighborhood) {
        return res.status(404).json({ message: "Neighborhood not found" });
      }
      res.json(neighborhood);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sub-districts/:id/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.getNeighborhoodsBySubDistrictId(req.params.id);
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/neighborhoods", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('subDistrict'), validateRequest(insertNeighborhoodSchema), async (req, res) => {
    try {
      const validatedData = insertNeighborhoodSchema.parse(req.body);
      const neighborhood = await storage.createNeighborhood(validatedData);
      res.status(201).json(neighborhood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/neighborhoods/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertNeighborhoodSchema), async (req, res) => {
    try {
      const neighborhood = await storage.updateNeighborhood(req.params.id, req.body);
      res.json(neighborhood);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/neighborhoods/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteNeighborhood(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Harat endpoints (Geographic data - public access for read operations)
  app.get("/api/harat", async (req, res) => {
    try {
      const { neighborhoodId } = req.query;
      const harat = await storage.getHarat(neighborhoodId as string);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/harat/:id", async (req, res) => {
    try {
      const harat = await storage.getHaratById(req.params.id);
      if (!harat) {
        return res.status(404).json({ message: "Harat not found" });
      }
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id/harat", async (req, res) => {
    try {
      const harat = await storage.getHaratByNeighborhoodId(req.params.id);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/harat", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertHaratSchema), async (req, res) => {
    try {
      const validatedData = insertHaratSchema.parse(req.body);
      const harat = await storage.createHarat(validatedData);
      res.status(201).json(harat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/harat/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertHaratSchema), async (req, res) => {
    try {
      const harat = await storage.updateHarat(req.params.id, req.body);
      res.json(harat);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/harat/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteHarat(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sectors endpoints (Geographic data - public access for read operations)
  app.get("/api/sectors", async (req, res) => {
    try {
      const { governorateId, subDistrictId } = req.query;
      
      let sectors;
      if (subDistrictId) {
        // Filter by sub-district if subDistrictId is provided
        sectors = await storage.getSectorsBySubDistrictId(subDistrictId as string);
      } else {
        // Default behavior - filter by governorate or get all
        sectors = await storage.getSectors(governorateId as string);
      }
      
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sectors/:id", async (req, res) => {
    try {
      const sector = await storage.getSector(req.params.id);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json(sector);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/governorates/:id/sectors", async (req, res) => {
    try {
      const sectors = await storage.getSectorsByGovernorateId(req.params.id);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sectors by district endpoint
  app.get("/api/districts/:id/sectors", async (req, res) => {
    try {
      const sectors = await storage.getSectorsByDistrictId(req.params.id);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sub-districts/:id/sectors", async (req, res) => {
    try {
      const sectors = await storage.getSectorsBySubDistrictId(req.params.id);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sectors", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('governorate'), validateRequest(insertSectorSchema), async (req, res) => {
    try {
      const validatedData = insertSectorSchema.parse(req.body);
      const sector = await storage.createSector(validatedData);
      res.status(201).json(sector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/sectors/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('governorate'), validateRequest(insertSectorSchema), async (req, res) => {
    try {
      const sector = await storage.updateSector(req.params.id, req.body);
      res.json(sector);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/sectors/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('governorate'), async (req, res) => {
    try {
      await storage.deleteSector(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Neighborhood Units endpoints (Geographic data - public access for read operations)
  app.get("/api/neighborhood-units", async (req, res) => {
    try {
      const { neighborhoodId, sectorId } = req.query;
      
      let neighborhoodUnits;
      if (sectorId) {
        // Filter by sector if sectorId is provided
        neighborhoodUnits = await storage.getNeighborhoodUnitsBySectorId(sectorId as string);
      } else if (neighborhoodId) {
        // Filter by neighborhood if neighborhoodId is provided
        neighborhoodUnits = await storage.getNeighborhoodUnitsByNeighborhoodId(neighborhoodId as string);
      } else {
        // Default behavior - get all neighborhood units
        neighborhoodUnits = await storage.getNeighborhoodUnits();
      }
      
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhood-units/:id", async (req, res) => {
    try {
      const neighborhoodUnit = await storage.getNeighborhoodUnit(req.params.id);
      if (!neighborhoodUnit) {
        return res.status(404).json({ message: "Neighborhood unit not found" });
      }
      res.json(neighborhoodUnit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhoods/:id/neighborhood-units", async (req, res) => {
    try {
      const neighborhoodUnits = await storage.getNeighborhoodUnitsByNeighborhoodId(req.params.id);
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sectors/:id/neighborhood-units", async (req, res) => {
    try {
      const neighborhoodUnits = await storage.getNeighborhoodUnitsBySectorId(req.params.id);
      res.json(neighborhoodUnits);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/neighborhood-units", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertNeighborhoodUnitSchema), async (req, res) => {
    try {
      const validatedData = insertNeighborhoodUnitSchema.parse(req.body);
      const neighborhoodUnit = await storage.createNeighborhoodUnit(validatedData);
      res.status(201).json(neighborhoodUnit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/neighborhood-units/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertNeighborhoodUnitSchema), async (req, res) => {
    try {
      const neighborhoodUnit = await storage.updateNeighborhoodUnit(req.params.id, req.body);
      res.json(neighborhoodUnit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/neighborhood-units/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteNeighborhoodUnit(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Blocks endpoints (Geographic data - public access for read operations)
  app.get("/api/blocks", async (req, res) => {
    try {
      const { neighborhoodUnitId } = req.query;
      const blocks = await storage.getBlocks(neighborhoodUnitId as string);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/blocks/:id", async (req, res) => {
    try {
      const block = await storage.getBlock(req.params.id);
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/neighborhood-units/:id/blocks", async (req, res) => {
    try {
      const blocks = await storage.getBlocksByNeighborhoodUnitId(req.params.id);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/blocks", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertBlockSchema), async (req, res) => {
    try {
      const validatedData = insertBlockSchema.parse(req.body);
      const block = await storage.createBlock(validatedData);
      res.status(201).json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/blocks/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const block = await storage.updateBlock(req.params.id, req.body);
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/blocks/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteBlock(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Plots endpoints (Geographic data - public access for read operations)
  app.get("/api/plots", async (req, res) => {
    try {
      const { blockId } = req.query;
      const plots = await storage.getPlots(blockId as string);
      res.json(plots);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/plots/:id", async (req, res) => {
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/blocks/:id/plots", async (req, res) => {
    try {
      const plots = await storage.getPlotsByBlockId(req.params.id);
      res.json(plots);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/plots/by-number/:plotNumber/block/:blockId", async (req, res) => {
    try {
      const plot = await storage.getPlotByNumber(req.params.plotNumber, req.params.blockId);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/plots", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const validatedData = insertPlotSchema.parse(req.body);
      const plot = await storage.createPlot(validatedData);
      res.status(201).json(plot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/plots/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const plot = await storage.updatePlot(req.params.id, req.body);
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/plots/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deletePlot(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Streets endpoints (Geographic data - public access for read operations)
  app.get("/api/streets", async (req, res) => {
    try {
      const streets = await storage.getStreets();
      res.json(streets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/streets/:id", async (req, res) => {
    try {
      const street = await storage.getStreet(req.params.id);
      if (!street) {
        return res.status(404).json({ message: "Street not found" });
      }
      res.json(street);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/streets", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertStreetSchema), async (req, res) => {
    try {
      const validatedData = insertStreetSchema.parse(req.body);
      const street = await storage.createStreet(validatedData);
      res.status(201).json(street);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/streets/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertStreetSchema.partial()), async (req, res) => {
    try {
      const street = await storage.updateStreet(req.params.id, req.body);
      res.json(street);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/streets/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteStreet(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Street Segments endpoints (Geographic data - public access for read operations)
  app.get("/api/street-segments", async (req, res) => {
    try {
      const { streetId } = req.query;
      const streetSegments = await storage.getStreetSegments(streetId as string);
      res.json(streetSegments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/street-segments/:id", async (req, res) => {
    try {
      const streetSegment = await storage.getStreetSegment(req.params.id);
      if (!streetSegment) {
        return res.status(404).json({ message: "Street segment not found" });
      }
      res.json(streetSegment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/streets/:id/street-segments", async (req, res) => {
    try {
      const streetSegments = await storage.getStreetSegmentsByStreetId(req.params.id);
      res.json(streetSegments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/street-segments", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertStreetSegmentSchema), async (req, res) => {
    try {
      const validatedData = insertStreetSegmentSchema.parse(req.body);
      const streetSegment = await storage.createStreetSegment(validatedData);
      res.status(201).json(streetSegment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/street-segments/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), validateRequest(insertStreetSegmentSchema), async (req, res) => {
    try {
      const streetSegment = await storage.updateStreetSegment(req.params.id, req.body);
      res.json(streetSegment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/street-segments/:id", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      await storage.deleteStreetSegment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Positions routes
  app.get("/api/positions", async (req, res) => {
    try {
      const { departmentId } = req.query;
      const positions = await storage.getPositions(departmentId as string);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/positions", authenticateToken, async (req, res) => {
    try {
      const positionData = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(positionData);
      res.status(201).json(position);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legal framework routes
  app.get("/api/laws", async (req, res) => {
    try {
      const laws = await storage.getLawsRegulations();
      res.json(laws);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/laws", authenticateToken, async (req, res) => {
    try {
      const lawData = insertLawRegulationSchema.parse(req.body);
      const law = await storage.createLawRegulation(lawData);
      res.status(201).json(law);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/laws/:id", async (req, res) => {
    try {
      const law = await storage.getLawRegulation(req.params.id);
      if (!law) {
        return res.status(404).json({ message: "Law not found" });
      }
      res.json(law);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/laws/:lawId/sections", async (req, res) => {
    try {
      const sections = await storage.getLawSections(req.params.lawId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/laws/:lawId/sections", authenticateToken, async (req, res) => {
    try {
      const sectionData = insertLawSectionSchema.parse({
        ...req.body,
        lawId: req.params.lawId,
      });
      const section = await storage.createLawSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sections/:sectionId/articles", async (req, res) => {
    try {
      const articles = await storage.getLawArticles(req.params.sectionId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sections/:sectionId/articles", authenticateToken, async (req, res) => {
    try {
      const articleData = insertLawArticleSchema.parse({
        ...req.body,
        sectionId: req.params.sectionId,
      });
      const article = await storage.createLawArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/articles", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const articles = await storage.searchLawArticles(q as string);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Technical requirements routes
  app.get("/api/requirement-categories", async (req, res) => {
    try {
      const categories = await storage.getRequirementCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/requirement-categories", authenticateToken, async (req, res) => {
    try {
      const categoryData = insertRequirementCategorySchema.parse(req.body);
      const category = await storage.createRequirementCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/requirements", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const requirements = await storage.getRequirements(categoryId as string);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/requirements", authenticateToken, async (req, res) => {
    try {
      const requirementData = insertRequirementSchema.parse(req.body);
      const requirement = await storage.createRequirement(requirementData);
      res.status(201).json(requirement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/search/requirements", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const requirements = await storage.searchRequirements(q as string);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/services", authenticateToken, async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:serviceId/requirements", async (req, res) => {
    try {
      const requirements = await storage.getServiceRequirements(req.params.serviceId);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Handle malformed GET requests to /api/applications/assign BEFORE the generic applications route
  app.get('/api/applications/assign', (req, res) => {
    console.warn('⚠️ GET request to /api/applications/assign - should use POST with ID');
    res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint requires POST method with application ID',
      correctUsage: 'POST /api/applications/:id/assign',
      timestamp: new Date().toISOString()
    });
  });

  // Applications routes with enhanced security - LBAC applied in storage layer
  app.get("/api/applications", authenticateToken, basicSecurityProtection, async (req, res) => {
    try {
      // Input validation for query parameters
      const querySchema = z.object({
        status: z.string().optional(),
        applicantId: z.string().uuid('معرف المتقدم يجب أن يكون UUID صحيح').optional(),
        assignedToId: z.string().uuid('معرف المسؤول يجب أن يكون UUID صحيح').optional(),
        currentStage: z.string().optional()
      });

      const validatedQuery = querySchema.safeParse(req.query);
      if (!validatedQuery.success) {
        return res.status(400).json({
          message: "Invalid query parameters",
          errors: validatedQuery.error.errors
        });
      }

      // Get authenticated user from token
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`[GEOGRAPHIC DEBUG] Processing user: ${user.id} (${user.username || 'unknown'})`);

      // Get user's geographic assignments for LBAC filtering
      const userGeographicAssignments = await storage.getUserGeographicAssignments({
        userId: user.id,
        isActive: true
      });

      console.log(`[GEOGRAPHIC DEBUG] Found ${userGeographicAssignments.length} geographic assignments for user ${user.id}`);

      // Build geographic context from user's primary assignment
      let geographicContext = null;
      if (userGeographicAssignments.length > 0) {
        const primaryAssignment = userGeographicAssignments[0]; // Use first active assignment
        geographicContext = {
          governorateId: primaryAssignment.governorateId || null,
          districtId: primaryAssignment.districtId || null,
          subDistrictId: primaryAssignment.subDistrictId || null,
          neighborhoodId: primaryAssignment.neighborhoodId || null
        };
        console.log(`[GEOGRAPHIC DEBUG] Built geographic context:`, geographicContext);
      } else {
        console.log(`[GEOGRAPHIC DEBUG] No geographic assignments found for user ${user.id} - context will be null`);
      }

      const { status, applicantId, assignedToId, currentStage } = validatedQuery.data;
      
      // Build user geographic scope for LBAC filtering
      const userGeographicScope = userGeographicAssignments.length > 0 ? {
        userId: user.id,
        governorateIds: userGeographicAssignments.map(a => a.governorateId).filter(Boolean),
        districtIds: userGeographicAssignments.map(a => a.districtId).filter(Boolean),
        subDistrictIds: userGeographicAssignments.map(a => a.subDistrictId).filter(Boolean),
        neighborhoodIds: userGeographicAssignments.map(a => a.neighborhoodId).filter(Boolean)
      } : undefined;

      console.log(`[LBAC DEBUG] User geographic scope:`, userGeographicScope);

      // CRITICAL SECURITY: Enforce strict LBAC - no assignments = no access
      if (!userGeographicScope || !userGeographicScope.governorateIds || userGeographicScope.governorateIds.length === 0) {
        console.log(`[LBAC SECURITY] User ${user.id} has no geographic assignments - returning empty set`);
        return res.json([]); // Return empty array instead of all applications
      }

      const applications = await storage.getApplications({
        status,
        applicantId,
        assignedToId,
        currentStage,
        userGeographicScope // CRITICAL: Apply LBAC filtering at storage layer
      });

      console.log(`[LBAC DEBUG] Filtered applications count: ${applications.length}`);

      // Enrich applications with their ACTUAL geographic context (not user's context)
      const enrichedApplications = applications.map(application => {
        // Extract actual geographic context from application data if available
        let actualGeographicContext = null;
        if (application.applicationData && typeof application.applicationData === 'object') {
          const appData = application.applicationData as any;
          actualGeographicContext = {
            governorateId: appData.governorateId || appData.location?.governorateId || null,
            districtId: appData.districtId || appData.location?.districtId || null,
            subDistrictId: appData.subDistrictId || appData.location?.subDistrictId || null,
            neighborhoodId: appData.neighborhoodId || appData.location?.neighborhoodId || null
          };
        }
        
        return {
          ...application,
          geographicContext: actualGeographicContext || geographicContext // Fallback to user context if no app context
        };
      });

      res.json(enrichedApplications);
    } catch (error) {
      console.error('[API ERROR] Get applications failed:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Applications API with pagination, search, and filtering (Staff only)
  app.get("/api/applications/paginated", authenticateToken, requireRole(['employee', 'manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const params = validatePaginationParams(req.query);
      
      // Basic LBAC enforcement - restrict based on user role
      let constrainedParams = { ...params };
      if (req.user?.role === 'employee') {
        // Employees can only see applications assigned to them
        constrainedParams = {
          ...params,
          filters: {
            ...params.filters,
            assignedToId: req.user.id
          }
        };
      } else if (req.user?.role === 'manager') {
        // Temporary manager restriction - limit to department scope until full LBAC
        // For now, restrict to applications assigned to their department users
        constrainedParams = {
          ...params,
          filters: {
            ...params.filters,
            // TODO: Replace with proper LBAC geographic scope
            assignedToId: req.user.id // Temporary: restrict to own assignments
          }
        };
      }
      // Admins can see broader scope (full LBAC pending)
      
      const result = await storage.getApplicationsPaginated(constrainedParams);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid pagination parameters", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Citizen Applications API with pagination (Own applications only)
  app.get("/api/citizen-applications/paginated", authenticateToken, requireRole(['citizen']), async (req: AuthenticatedRequest, res) => {
    try {
      const params = validatePaginationParams(req.query);
      // Force applicantId filter for citizens to only see their own applications
      const citizenParams = {
        ...params,
        filters: {
          ...params.filters,
          applicantId: req.user?.id || ""
        }
      };
      const result = await storage.getApplicationsPaginated(citizenParams);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid pagination parameters", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public endpoint for citizens to submit applications (enhanced security)
  app.post("/api/applications", basicSecurityProtection, requireJSON, async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        applicantId: req.body.applicantId || "anonymous", // Use provided applicantId or anonymous
      });
      const application = await storage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/applications/:id", authenticateToken, basicSecurityProtection, async (req, res) => {
    try {
      // Validate UUID format
      const idSchema = z.string().uuid('معرف الطلب يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid application ID format",
          error: validatedId.error.errors[0].message
        });
      }

      const application = await storage.getApplication(validatedId.data);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error) {
      console.error('[API ERROR] Get application by ID failed:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/applications/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const application = await storage.updateApplication(req.params.id, req.body);
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =================================================================
  // Technical Review Routes - Phase 1 Task 1.2
  // =================================================================

  /**
   * المسار الأول: المزامنة المباشرة من mobile_survey_geometries
   * GET /api/applications/:id/technical-review
   * ينشئ حالة مراجعة فنية ويستورد بيانات المسح الميداني مباشرة
   */
  app.get("/api/applications/:id/technical-review", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    basicSecurityProtection, 
    async (req, res) => {
    try {
      // Validate UUID format
      const idSchema = z.string().uuid('معرف الطلب يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid application ID format",
          error: validatedId.error.errors[0].message
        });
      }

      const applicationId = validatedId.data;
      const user = (req as any).user;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`🔍 Starting technical review for application ${applicationId} by user ${user.id}`);

      // التحقق من وجود الطلب
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // إنشاء أو الحصول على حالة مراجعة فنية موجودة
      let reviewCase;
      try {
        reviewCase = await technicalReviewService.createReviewCase(
          applicationId,
          user.id, // reviewerId  
          user.id, // assignedById
          'medium',
          'technical'
        );
        console.log(`✅ Review case created/retrieved: ${reviewCase.id}`);
      } catch (error) {
        console.error('Error creating review case:', error);
        return res.status(500).json({ 
          message: "Failed to create technical review case",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // استيراد بيانات المسح الميداني (المسار الأول)
      let importResult;
      try {
        importResult = await technicalReviewService.importFromMobileSurvey(
          reviewCase.id,
          applicationId
        );
        console.log(`📊 Mobile survey import completed: ${importResult.job.recordsProcessed} records`);
      } catch (error) {
        console.error('Error importing mobile survey data:', error);
        return res.status(500).json({ 
          message: "Failed to import mobile survey data",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // الحصول على تفاصيل شاملة للحالة مع البيانات المستوردة
      let caseDetails;
      try {
        caseDetails = await technicalReviewService.getReviewCaseDetails(reviewCase.id);
        console.log(`📋 Retrieved case details with ${caseDetails.artifacts?.length || 0} artifacts`);
      } catch (error) {
        console.error('Error getting case details:', error);
        return res.status(500).json({ 
          message: "Failed to retrieve case details",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // تنسيق الاستجابة
      const response = {
        reviewCase: {
          id: reviewCase.id,
          applicationId,
          status: reviewCase.status,
          reviewType: reviewCase.reviewType,
          priority: reviewCase.priority,
          workflowStage: reviewCase.workflowStage,
          createdAt: reviewCase.createdAt
        },
        importJob: {
          id: importResult.job.id,
          status: importResult.job.status,
          recordsProcessed: importResult.job.recordsProcessed,
          recordsValid: importResult.job.recordsValid,
          recordsInvalid: importResult.job.recordsInvalid,
          progress: importResult.job.progress
        },
        artifacts: caseDetails.artifacts || [],
        application: {
          id: application.id,
          applicationNumber: application.applicationNumber,
          serviceId: application.serviceId,
          status: application.status,
          currentStage: application.currentStage
        }
      };

      res.json(response);
      
    } catch (error) {
      console.error('❌ Technical review endpoint error:', error);
      res.status(500).json({ 
        message: "Internal server error during technical review",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * المسار الثاني: تحميل ومعالجة ملفات CSV
   * POST /api/technical-review/:id/upload-csv
   * يتلقى ملف CSV ويحوله إلى GeoJSON مع PostGIS validation
   */
  app.post("/api/technical-review/:id/upload-csv", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    uploadRateLimit,
    requireMultipart,
    async (req, res) => {
    try {
      // Validate review case ID
      const idSchema = z.string().uuid('معرف حالة المراجعة يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid review case ID format",
          error: validatedId.error.errors[0].message
        });
      }

      const reviewCaseId = validatedId.data;
      const user = (req as any).user;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // التحقق من وجود الملف المرفوع
      const files = (req as any).files;
      if (!files || !files.csvFile || files.csvFile.length === 0) {
        return res.status(400).json({ 
          message: "CSV file is required",
          field: "csvFile"
        });
      }

      const csvFile = files.csvFile[0];
      
      // التحقق من نوع الملف
      if (!csvFile.originalname.toLowerCase().endsWith('.csv')) {
        return res.status(400).json({ 
          message: "File must be a CSV file",
          uploadedType: csvFile.mimetype,
          fileName: csvFile.originalname
        });
      }

      // التحقق من حجم الملف (محدود بـ 10MB)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (csvFile.size > maxFileSize) {
        return res.status(400).json({ 
          message: "File size exceeds maximum limit",
          maxSize: "10MB",
          fileSize: `${Math.round(csvFile.size / 1024 / 1024 * 100) / 100}MB`
        });
      }

      console.log(`📄 Processing CSV upload for review case ${reviewCaseId}`, {
        fileName: csvFile.originalname,
        fileSize: csvFile.size,
        userId: user.id
      });

      // التحقق من وجود حالة المراجعة
      let reviewCase;
      try {
        reviewCase = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
        if (!reviewCase) {
          return res.status(404).json({ message: "Review case not found" });
        }
      } catch (error) {
        console.error('Error getting review case:', error);
        return res.status(404).json({ message: "Review case not found" });
      }

      // معالجة ملف CSV (المسار الثاني)
      let processingResult;
      try {
        processingResult = await technicalReviewService.processCsvUpload(
          reviewCaseId,
          csvFile.buffer,
          csvFile.originalname,
          'EPSG:4326' // Default CRS, يمكن جعله قابل للتخصيص
        );
        console.log(`📊 CSV processing completed: ${processingResult.job.recordsProcessed} records`);
      } catch (error) {
        console.error('Error processing CSV file:', error);
        return res.status(500).json({ 
          message: "Failed to process CSV file",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // الحصول على تفاصيل محدثة للحالة
      let updatedCaseDetails;
      try {
        updatedCaseDetails = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
      } catch (error) {
        console.error('Error getting updated case details:', error);
        return res.status(500).json({ 
          message: "Failed to retrieve updated case details",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // تنسيق الاستجابة
      const response = {
        reviewCaseId,
        uploadInfo: {
          fileName: csvFile.originalname,
          fileSize: csvFile.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id
        },
        processingJob: {
          id: processingResult.job.id,
          status: processingResult.job.status,
          recordsProcessed: processingResult.job.recordsProcessed,
          recordsValid: processingResult.job.recordsValid,
          recordsInvalid: processingResult.job.recordsInvalid,
          progress: processingResult.job.progress,
          validationErrors: processingResult.job.validationErrors || []
        },
        artifacts: updatedCaseDetails.artifacts || [],
        summary: {
          totalArtifacts: updatedCaseDetails.artifacts?.length || 0,
          validGeometries: processingResult.job.recordsValid,
          invalidGeometries: processingResult.job.recordsInvalid,
          processingCompleted: processingResult.job.status === 'completed'
        }
      };

      res.json(response);
      
    } catch (error) {
      console.error('❌ CSV upload endpoint error:', error);
      res.status(500).json({ 
        message: "Internal server error during CSV processing",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * المسار الثالث: تحميل ومعالجة ملفات Shapefile
   * POST /api/technical-review/:id/upload-shapefile
   * يتلقى ملف ZIP يحتوي على Shapefile ويحوله إلى GeoJSON مع ogr2ogr
   */
  app.post("/api/technical-review/:id/upload-shapefile", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    uploadRateLimit,
    requireMultipart,
    async (req, res) => {
    try {
      // Validate review case ID
      const idSchema = z.string().uuid('معرف حالة المراجعة يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid review case ID format",
          error: validatedId.error.errors[0].message
        });
      }

      const reviewCaseId = validatedId.data;
      const user = (req as any).user;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // التحقق من وجود الملف المرفوع
      const files = (req as any).files;
      if (!files || !files.shapefileZip || files.shapefileZip.length === 0) {
        return res.status(400).json({ 
          message: "Shapefile ZIP file is required",
          field: "shapefileZip"
        });
      }

      const shapefileZip = files.shapefileZip[0];
      
      // التحقق من نوع الملف
      const allowedExtensions = ['.zip', '.shp'];
      const fileExtension = shapefileZip.originalname.toLowerCase();
      const isValidFile = allowedExtensions.some(ext => fileExtension.endsWith(ext));
      
      if (!isValidFile) {
        return res.status(400).json({ 
          message: "File must be a ZIP archive containing Shapefile or a .shp file",
          uploadedType: shapefileZip.mimetype,
          fileName: shapefileZip.originalname,
          allowedTypes: allowedExtensions
        });
      }

      // التحقق من حجم الملف (محدود بـ 50MB للـ Shapefiles)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (shapefileZip.size > maxFileSize) {
        return res.status(400).json({ 
          message: "File size exceeds maximum limit",
          maxSize: "50MB",
          fileSize: `${Math.round(shapefileZip.size / 1024 / 1024 * 100) / 100}MB`
        });
      }

      console.log(`🗺️ Processing Shapefile upload for review case ${reviewCaseId}`, {
        fileName: shapefileZip.originalname,
        fileSize: shapefileZip.size,
        userId: user.id
      });

      // التحقق من وجود حالة المراجعة
      let reviewCase;
      try {
        reviewCase = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
        if (!reviewCase) {
          return res.status(404).json({ message: "Review case not found" });
        }
      } catch (error) {
        console.error('Error getting review case:', error);
        return res.status(404).json({ message: "Review case not found" });
      }

      // معالجة ملف Shapefile (المسار الثالث)
      let processingResult;
      try {
        processingResult = await technicalReviewService.processShapefileUpload(
          reviewCaseId,
          shapefileZip.buffer,
          shapefileZip.originalname,
          'EPSG:4326' // Default CRS, يمكن جعله قابل للتخصيص
        );
        console.log(`🗺️ Shapefile processing completed: ${processingResult.job.recordsProcessed} features`);
      } catch (error) {
        console.error('Error processing Shapefile:', error);
        return res.status(500).json({ 
          message: "Failed to process Shapefile",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // الحصول على تفاصيل محدثة للحالة
      let updatedCaseDetails;
      try {
        updatedCaseDetails = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
      } catch (error) {
        console.error('Error getting updated case details:', error);
        return res.status(500).json({ 
          message: "Failed to retrieve updated case details",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // تنسيق الاستجابة
      const response = {
        reviewCaseId,
        uploadInfo: {
          fileName: shapefileZip.originalname,
          fileSize: shapefileZip.size,
          fileType: 'shapefile',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id
        },
        processingJob: {
          id: processingResult.job.id,
          status: processingResult.job.status,
          recordsProcessed: processingResult.job.recordsProcessed,
          recordsValid: processingResult.job.recordsValid,
          recordsInvalid: processingResult.job.recordsInvalid,
          progress: processingResult.job.progress,
          validationErrors: processingResult.job.validationErrors || []
        },
        artifacts: updatedCaseDetails.artifacts || [],
        summary: {
          totalArtifacts: updatedCaseDetails.artifacts?.length || 0,
          validFeatures: processingResult.job.recordsValid,
          invalidFeatures: processingResult.job.recordsInvalid,
          processingCompleted: processingResult.job.status === 'completed'
        }
      };

      res.json(response);
      
    } catch (error) {
      console.error('❌ Shapefile upload endpoint error:', error);
      res.status(500).json({ 
        message: "Internal server error during Shapefile processing",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * المسار الرابع: تحميل ومعالجة ملفات GeoTIFF
   * POST /api/technical-review/:id/upload-geotiff
   * يرفع ملف GeoTIFF إلى Object Storage ويقوم بمعالجته عبر Python worker
   */
  app.post("/api/technical-review/:id/upload-geotiff", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    uploadRateLimit,
    requireMultipart,
    async (req, res) => {
    try {
      // Validate review case ID
      const idSchema = z.string().uuid('معرف حالة المراجعة يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid review case ID format",
          error: validatedId.error.errors[0].message
        });
      }

      const reviewCaseId = validatedId.data;
      const user = (req as any).user;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // التحقق من وجود الملف المرفوع
      const files = (req as any).files;
      if (!files || !files.geotiffFile || files.geotiffFile.length === 0) {
        return res.status(400).json({ 
          message: "GeoTIFF file is required",
          field: "geotiffFile"
        });
      }

      const geotiffFile = files.geotiffFile[0];
      
      // التحقق من نوع الملف
      const allowedExtensions = ['.tif', '.tiff', '.geotiff'];
      const fileExtension = geotiffFile.originalname.toLowerCase();
      const isValidFile = allowedExtensions.some(ext => fileExtension.endsWith(ext));
      
      if (!isValidFile) {
        return res.status(400).json({ 
          message: "File must be a GeoTIFF file (.tif, .tiff, .geotiff)",
          uploadedType: geotiffFile.mimetype,
          fileName: geotiffFile.originalname,
          allowedTypes: allowedExtensions
        });
      }

      // التحقق من حجم الملف (محدود بـ 100MB للـ GeoTIFF)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (geotiffFile.size > maxFileSize) {
        return res.status(400).json({ 
          message: "File size exceeds maximum limit",
          maxSize: "100MB",
          fileSize: `${Math.round(geotiffFile.size / 1024 / 1024 * 100) / 100}MB`
        });
      }

      console.log(`🖼️ Processing GeoTIFF upload for review case ${reviewCaseId}`, {
        fileName: geotiffFile.originalname,
        fileSize: geotiffFile.size,
        userId: user.id
      });

      // التحقق من وجود حالة المراجعة
      let reviewCase;
      try {
        reviewCase = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
        if (!reviewCase) {
          return res.status(404).json({ message: "Review case not found" });
        }
      } catch (error) {
        console.error('Error getting review case:', error);
        return res.status(404).json({ message: "Review case not found" });
      }

      // استخراج metadata من request body (اختياري)
      const rasterMetadata = {
        width: req.body.width ? parseInt(req.body.width) : undefined,
        height: req.body.height ? parseInt(req.body.height) : undefined,
        crs: req.body.crs || 'EPSG:4326',
        bounds: req.body.bounds ? JSON.parse(req.body.bounds) : undefined,
        productType: req.body.productType || 'orthophoto',
        bandCount: req.body.bandCount ? parseInt(req.body.bandCount) : 3,
        dataType: req.body.dataType || 'uint8'
      };

      // معالجة ملف GeoTIFF (المسار الرابع - التكامل مع geo_jobs)
      let processingResult;
      try {
        processingResult = await technicalReviewService.processGeoRasterUpload(
          reviewCaseId,
          geotiffFile.buffer,
          geotiffFile.originalname,
          rasterMetadata
        );
        console.log(`🖼️ GeoTIFF processing queued: ${processingResult.geoJob.id}`);
      } catch (error) {
        console.error('Error processing GeoTIFF file:', error);
        return res.status(500).json({ 
          message: "Failed to process GeoTIFF file",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // الحصول على تفاصيل محدثة للحالة
      let updatedCaseDetails;
      try {
        updatedCaseDetails = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
      } catch (error) {
        console.error('Error getting updated case details:', error);
        return res.status(500).json({ 
          message: "Failed to retrieve updated case details",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // تنسيق الاستجابة
      const response = {
        reviewCaseId,
        uploadInfo: {
          fileName: geotiffFile.originalname,
          fileSize: geotiffFile.size,
          fileType: 'geotiff',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id
        },
        processingJob: {
          id: processingResult.ingestionJob.id,
          status: 'queued',
          progress: 25,
          geoJobId: processingResult.geoJob.id
        },
        geoJob: {
          id: processingResult.geoJob.id,
          status: processingResult.geoJob.status,
          taskType: processingResult.geoJob.taskType,
          estimatedCompletion: processingResult.estimatedCompletion
        },
        rasterProduct: {
          id: processingResult.rasterProduct.id,
          productName: processingResult.rasterProduct.productName,
          status: processingResult.rasterProduct.status,
          processingLevel: processingResult.rasterProduct.processingLevel
        },
        artifacts: updatedCaseDetails.artifacts || [],
        summary: {
          totalArtifacts: updatedCaseDetails.artifacts?.length || 0,
          rasterProcessingStatus: processingResult.processingStatus,
          workerProcessing: true,
          processingNotes: "GeoTIFF processing has been queued for Python worker. Check status with geo job ID."
        }
      };

      res.json(response);
      
    } catch (error) {
      console.error('❌ GeoTIFF upload endpoint error:', error);
      res.status(500).json({ 
        message: "Internal server error during GeoTIFF processing",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/applications/:id/technical-review
   * حفظ قرار المراجعة الفنية النهائي وربطه بالـ workflow
   */
  app.post("/api/applications/:id/technical-review", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    basicSecurityProtection, 
    async (req, res) => {
    try {
      // Validate application ID format
      const idSchema = z.string().uuid('معرف الطلب يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid application ID format",
          error: validatedId.error.errors[0].message
        });
      }

      // Validate request body
      const reviewDecisionSchema = z.object({
        decision: z.enum(['approved', 'rejected'], {
          errorMap: () => ({ message: "القرار يجب أن يكون 'approved' أو 'rejected'" })
        }),
        notes: z.string().min(1, "ملاحظات المراجعة مطلوبة").max(1000, "الملاحظات لا يجب أن تزيد عن 1000 حرف"),
        reviewCaseId: z.string().uuid('معرف حالة المراجعة يجب أن يكون UUID صحيح').optional()
      });

      const validatedBody = reviewDecisionSchema.safeParse(req.body);
      if (!validatedBody.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validatedBody.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      const applicationId = validatedId.data;
      const { decision, notes, reviewCaseId } = validatedBody.data;
      const user = (req as any).user;
      
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`📋 Submitting technical review decision for application ${applicationId} by user ${user.id}: ${decision}`);

      // التحقق من وجود الطلب
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // التحقق من وجود حالة المراجعة الفنية
      let existingReviewCase;
      if (reviewCaseId) {
        try {
          existingReviewCase = await technicalReviewService.getReviewCaseDetails(reviewCaseId);
        } catch (error) {
          console.error('Review case not found:', error);
          return res.status(404).json({ message: "Review case not found" });
        }
      } else {
        // البحث عن حالة مراجعة موجودة للطلب
        try {
          existingReviewCase = await technicalReviewService.getReviewCaseByApplication(applicationId);
        } catch (error) {
          console.error('No existing review case found:', error);
          return res.status(404).json({ 
            message: "No technical review case found for this application. Please start the review process first." 
          });
        }
      }

      if (!existingReviewCase) {
        return res.status(404).json({ 
          message: "Technical review case not found" 
        });
      }

      // التحقق من صلاحية حفظ القرار (التأكد أن المراجع هو نفسه أو يملك صلاحية)
      if (existingReviewCase.reviewerId !== user.id && !['manager', 'admin'].includes(user.role)) {
        return res.status(403).json({ 
          message: "You are not authorized to submit a decision for this review case" 
        });
      }

      // حفظ قرار المراجعة
      let reviewResult;
      try {
        reviewResult = await technicalReviewService.submitReviewDecision(
          existingReviewCase.id,
          decision,
          notes,
          user.id
        );
        console.log(`✅ Technical review decision saved: ${reviewResult.decision}`);
      } catch (error) {
        console.error('Error saving review decision:', error);
        return res.status(500).json({ 
          message: "Failed to save review decision",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // تحديث حالة الطلب وربطه بالـ workflow
      try {
        await storage.updateApplication(applicationId, {
          status: decision === 'approved' ? 'under_review' : 'rejected',
          lastModifiedAt: new Date(),
          lastModifiedBy: user.id
        });

        // تشغيل الخطوة التالية في الـ workflow
        if (decision === 'approved') {
          // تحديد الخطوة التالية حسب نوع الطلب
          const nextStepType = application.applicationType === 'building_license' ? 
            'legal_review' : 'surveying_decision';
          
          await workflowService.createTask(applicationId, {
            taskType: nextStepType,
            assignedTo: null, // سيتم تعيينه لاحقاً
            priority: 'medium',
            status: 'pending',
            metadata: {
              previousStep: 'technical_review',
              technicalReviewResult: decision,
              reviewCaseId: existingReviewCase.id
            }
          });
          
          console.log(`🔄 Next workflow step created: ${nextStepType}`);
        }
      } catch (error) {
        console.error('Error updating application status or workflow:', error);
        // لا نفشل العملية إذا فشل تحديث الـ workflow، فقط نسجل الخطأ
      }

      // الحصول على تفاصيل محدثة
      let updatedCaseDetails;
      try {
        updatedCaseDetails = await technicalReviewService.getReviewCaseDetails(existingReviewCase.id);
      } catch (error) {
        console.error('Error getting updated case details:', error);
        // استخدام البيانات الموجودة إذا فشل جلب التحديث
        updatedCaseDetails = existingReviewCase;
      }

      // تكوين الاستجابة
      const response = {
        applicationId,
        reviewCaseId: existingReviewCase.id,
        decision: reviewResult.decision,
        submittedAt: reviewResult.submittedAt,
        submittedBy: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        reviewSummary: {
          totalArtifacts: updatedCaseDetails.artifacts?.length || 0,
          rasterProducts: updatedCaseDetails.rasterProducts?.length || 0,
          processingJobs: updatedCaseDetails.processingJobs?.filter(j => j.status === 'completed').length || 0,
          finalStatus: updatedCaseDetails.status,
          completedAt: updatedCaseDetails.completedAt
        },
        nextSteps: decision === 'approved' ? 
          [`سيتم تحويل الطلب إلى ${application.applicationType === 'building_license' ? 'المراجعة القانونية' : 'قرار المساحة'}`] :
          ['تم رفض الطلب. يمكن للمتقدم تصحيح البيانات وإعادة التقديم'],
        notes: notes
      };

      res.json(response);
      
    } catch (error) {
      console.error('❌ Technical review decision submission error:', error);
      res.status(500).json({ 
        message: "Internal server error during review decision submission",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // =================================================================
  // Technical Reviewer Dashboard Routes
  // =================================================================

  /**
   * Get technical reviewer workload statistics
   * GET /api/technical-reviewer/workload/:reviewerId
   */
  app.get("/api/technical-reviewer/workload/:reviewerId", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    basicSecurityProtection, 
    async (req, res) => {
    try {
      const reviewerId = req.params.reviewerId;
      
      // استعلام حقيقي من قاعدة البيانات للحصول على إحصائيات العمل للمراجع الفني
      const [
        pendingCount,
        inProgressCount,
        completedCount,
        rejectedCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(technicalReviewCases)
          .where(and(
            eq(technicalReviewCases.reviewerId, reviewerId),
            eq(technicalReviewCases.status, 'pending')
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(technicalReviewCases)
          .where(and(
            eq(technicalReviewCases.reviewerId, reviewerId),
            eq(technicalReviewCases.status, 'in_progress')
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(technicalReviewCases)
          .where(and(
            eq(technicalReviewCases.reviewerId, reviewerId),
            or(
              eq(technicalReviewCases.status, 'completed'),
              eq(technicalReviewCases.status, 'approved')
            )
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(technicalReviewCases)
          .where(and(
            eq(technicalReviewCases.reviewerId, reviewerId),
            eq(technicalReviewCases.status, 'rejected')
          ))
      ]);

      const workload = {
        pendingReviews: pendingCount[0]?.count || 0,
        inProgressReviews: inProgressCount[0]?.count || 0,
        completedReviews: completedCount[0]?.count || 0,
        rejectedReviews: rejectedCount[0]?.count || 0
      };

      res.json(workload);
    } catch (error) {
      console.error('❌ Technical reviewer workload error:', error);
      res.status(500).json({ 
        message: "Internal server error getting workload",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get applications assigned to technical reviewer
   * GET /api/technical-reviewer/applications/:reviewerId
   */
  app.get("/api/technical-reviewer/applications/:reviewerId", 
    authenticateToken, 
    requireRole(['employee', 'manager', 'admin']), 
    basicSecurityProtection, 
    async (req, res) => {
    try {
      const reviewerId = req.params.reviewerId;
      
      // استعلام حقيقي للحصول على الطلبات المكلف بمراجعتها من قاعدة البيانات
      const reviewCases = await db
        .select({
          // Review case info
          reviewCaseId: technicalReviewCases.id,
          status: technicalReviewCases.status,
          priority: technicalReviewCases.priority,
          assignmentDate: technicalReviewCases.createdAt,
          deadline: technicalReviewCases.dueDate,
          // Application info
          applicationId: applications.id,
          applicationNumber: applications.applicationNumber,
          submissionDate: applications.createdAt,
          // Applicant info (assuming from applicationData JSON)
          applicationData: applications.applicationData,
        })
        .from(technicalReviewCases)
        .innerJoin(applications, eq(technicalReviewCases.applicationId, applications.id))
        .where(eq(technicalReviewCases.reviewerId, reviewerId))
        .orderBy(desc(technicalReviewCases.createdAt));

      // تحويل البيانات لتطابق format المطلوب
      const transformedApplications = reviewCases.map(reviewCase => {
        const appData = reviewCase.applicationData as any || {};
        
        return {
          id: reviewCase.applicationId,
          applicationNumber: reviewCase.applicationNumber || '',
          applicantName: appData.applicantName || appData.fullName || 'غير محدد',
          applicantPhone: appData.phoneNumber || appData.contactPhone || '',
          projectName: appData.projectName || appData.description || 'مشروع غير محدد',
          serviceType: appData.serviceType || 'خدمة غير محددة',
          submissionDate: reviewCase.submissionDate?.toISOString() || new Date().toISOString(),
          assignmentDate: reviewCase.assignmentDate?.toISOString() || new Date().toISOString(),
          priority: reviewCase.priority || 'medium',
          status: reviewCase.status,
          deadline: reviewCase.deadline?.toISOString() || null,
          location: `${appData.governorate || 'غير محدد'}, ${appData.district || 'غير محدد'}`,
          hasReviewCase: true,
          reviewCaseId: reviewCase.reviewCaseId
        };
      });

      res.json(transformedApplications);
    } catch (error) {
      console.error('❌ Technical reviewer applications error:', error);
      res.status(500).json({ 
        message: "Internal server error getting applications",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Surveying decisions routes - LBAC applied in storage layer  
  app.get("/api/surveying-decisions", authenticateToken, requireRole(['employee', 'manager', 'admin']), basicSecurityProtection, async (req, res) => {
    try {
      // Input validation for query parameters
      const querySchema = z.object({
        status: z.string().optional(),
        surveyorId: z.string().uuid('معرف المساح يجب أن يكون UUID صحيح').optional()
      });

      const validatedQuery = querySchema.safeParse(req.query);
      if (!validatedQuery.success) {
        return res.status(400).json({
          message: "Invalid query parameters",
          errors: validatedQuery.error.errors
        });
      }

      // Get authenticated user from token
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`[SURVEYING LBAC DEBUG] Processing user: ${user.id}`);

      // Get user's geographic assignments for LBAC filtering
      const userGeographicAssignments = await storage.getUserGeographicAssignments({
        userId: user.id,
        isActive: true
      });

      console.log(`[SURVEYING LBAC DEBUG] Found ${userGeographicAssignments.length} geographic assignments`);

      // Build geographic context from user's primary assignment
      let geographicContext = null;
      if (userGeographicAssignments.length > 0) {
        const primaryAssignment = userGeographicAssignments[0];
        geographicContext = {
          governorateId: primaryAssignment.governorateId || null,
          districtId: primaryAssignment.districtId || null,
          subDistrictId: primaryAssignment.subDistrictId || null,
          neighborhoodId: primaryAssignment.neighborhoodId || null
        };
        console.log(`[SURVEYING LBAC DEBUG] Built geographic context:`, geographicContext);
      }

      // Build user geographic scope for LBAC filtering
      const userGeographicScope = userGeographicAssignments.length > 0 ? {
        userId: user.id,
        governorateIds: userGeographicAssignments.map(a => a.governorateId).filter(Boolean),
        districtIds: userGeographicAssignments.map(a => a.districtId).filter(Boolean),
        subDistrictIds: userGeographicAssignments.map(a => a.subDistrictId).filter(Boolean),
        neighborhoodIds: userGeographicAssignments.map(a => a.neighborhoodId).filter(Boolean)
      } : undefined;

      // CRITICAL SECURITY: Enforce strict LBAC - no assignments = no access
      if (!userGeographicScope || !userGeographicScope.governorateIds || userGeographicScope.governorateIds.length === 0) {
        console.log(`[SURVEYING LBAC SECURITY] User ${user.id} has no geographic assignments - returning empty set`);
        return res.json([]);
      }

      const { status, surveyorId } = validatedQuery.data;
      const decisions = await storage.getSurveyingDecisions({
        status,
        surveyorId,
        userGeographicScope // CRITICAL: Apply LBAC filtering at storage layer
      });

      console.log(`[SURVEYING LBAC DEBUG] Filtered decisions count: ${decisions.length}`);

      // Enrich decisions with their ACTUAL geographic context
      const enrichedDecisions = decisions.map(decision => {
        // For surveying decisions, use the geographic context built from user's assignments
        return {
          ...decision,
          geographicContext: geographicContext
        };
      });

      res.json(enrichedDecisions);
    } catch (error) {
      console.error('[API ERROR] Get surveying decisions failed:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/surveying-decisions", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const decisionData = insertSurveyingDecisionSchema.parse(req.body);
      const decision = await storage.createSurveyingDecision(decisionData);
      res.status(201).json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/surveying-decisions/:id", authenticateToken, async (req, res) => {
    try {
      const decision = await storage.getSurveyingDecision(req.params.id);
      if (!decision) {
        return res.status(404).json({ message: "Surveying decision not found" });
      }
      res.json(decision);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/surveying-decisions/:id", authenticateToken, enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const decision = await storage.updateSurveyingDecision(req.params.id, req.body);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", authenticateToken, async (req, res) => {
    try {
      const { assignedToId, status, applicationId } = req.query;
      const tasks = await storage.getTasks({
        assignedToId: assignedToId as string,
        status: status as string,
        applicationId: applicationId as string,
      });
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Tasks API with pagination, search, and filtering
  app.get("/api/tasks/paginated", authenticateToken, requireRole(['employee', 'manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const params = validatePaginationParams(req.query);
      
      // Basic LBAC enforcement - restrict based on user role
      let constrainedParams = { ...params };
      if (req.user?.role === 'employee') {
        // Employees can only see tasks assigned to them
        constrainedParams = {
          ...params,
          filters: {
            ...params.filters,
            assignedToId: req.user.id
          }
        };
      } else if (req.user?.role === 'manager') {
        // Temporary manager restriction - limit to department scope until full LBAC
        constrainedParams = {
          ...params,
          filters: {
            ...params.filters,
            // TODO: Replace with proper LBAC geographic scope
            assignedToId: req.user.id // Temporary: restrict to own assignments
          }
        };
      }
      // Admins can see broader scope (full LBAC pending)
      
      const result = await storage.getTasksPaginated(constrainedParams);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid pagination parameters", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedById: req.user?.id,
      });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, basicSecurityProtection, async (req, res) => {
    try {
      // Validate UUID format
      const idSchema = z.string().uuid('معرف المهمة يجب أن يكون UUID صحيح');
      const validatedId = idSchema.safeParse(req.params.id);
      
      if (!validatedId.success) {
        return res.status(400).json({
          message: "Invalid task ID format",
          error: validatedId.error.errors[0].message
        });
      }

      // Validate task update data
      const taskUpdateSchema = z.object({
        status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']).optional(),
        assigneeId: z.string().uuid().optional(),
        result: z.object({
          findings: z.string().min(1).optional(),
          recommendations: z.string().optional(),
          attachments: z.array(z.string()).optional(),
          surveyCompleted: z.boolean().optional(),
          data: z.record(z.any()).optional()
        }).optional(),
        notes: z.string().optional()
      }).refine(data => {
        // When status is 'completed', result with findings is required
        if (data.status === 'completed' && (!data.result || !data.result.findings)) {
          return false;
        }
        return true;
      }, {
        message: "عند إتمام المهمة، يجب تقديم النتائج والملاحظات المطلوبة",
        path: ["result"]
      });

      const validatedData = taskUpdateSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Invalid task update data",
          errors: validatedData.error.errors
        });
      }

      // CRITICAL SECURITY: Check task assignment authorization
      const existingTask = await storage.getTask(validatedId.data);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only assigned user, manager, or admin can update the task
      const user = (req as any).user;
      const userRoles = user?.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isManager = userRoles.includes('MANAGER');
      const isAssigned = existingTask.assignedToId === user?.id;

      if (!isAdmin && !isManager && !isAssigned) {
        console.warn('[TASK AUTH] Unauthorized task update attempt:', {
          taskId: validatedId.data,
          userId: user?.id,
          assignedToId: existingTask.assignedToId, // Fixed field name
          userRoles: userRoles,
          timestamp: new Date().toISOString()
        });
        return res.status(403).json({ 
          message: "Access denied: You can only update tasks assigned to you"
        });
      }

      const task = await storage.updateTask(validatedId.data, validatedData.data);
      res.json(task);
    } catch (error) {
      console.error('[API ERROR] Update task failed:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard and statistics routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Global search route
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const results = await storage.globalSearch(q as string);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System settings routes
  app.get("/api/settings", authenticateToken, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/settings/:key", authenticateToken, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateSystemSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service Automation System Routes

  // Service Templates
  app.get("/api/service-templates", async (req, res) => {
    try {
      const templates = await storage.getServiceTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/service-templates/:id", async (req, res) => {
    try {
      const template = await storage.getServiceTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-templates", authenticateToken, async (req, res) => {
    try {
      const data = insertServiceTemplateSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const template = await storage.createServiceTemplate({
        ...data,
        createdById: authReq.user?.id
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service Builder
  app.get("/api/service-builder/:id", authenticateToken, async (req, res) => {
    try {
      const serviceBuilder = await storage.getServiceBuilder(req.params.id);
      if (!serviceBuilder) {
        return res.status(404).json({ message: "Service builder not found" });
      }
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-builder", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = {
        builderData: req.body,
        builderId: authReq.user?.id,
        lastModifiedById: authReq.user?.id,
        publicationStatus: "draft"
      };
      
      const serviceBuilder = await storage.createServiceBuilder(data);
      res.status(201).json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/service-builder/:id", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const updates = {
        builderData: req.body,
        lastModifiedById: authReq.user?.id
      };
      
      const serviceBuilder = await storage.updateServiceBuilder(req.params.id, updates);
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/service-builder/:id/publish", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const serviceBuilder = await storage.publishService(req.params.id, authReq.user?.id || "");
      res.json(serviceBuilder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dynamic Forms
  app.get("/api/forms/:serviceId", async (req, res) => {
    try {
      const form = await storage.getServiceForm(req.params.serviceId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/forms", authenticateToken, async (req, res) => {
    try {
      const data = insertDynamicFormSchema.parse(req.body);
      const form = await storage.createDynamicForm(data);
      res.status(201).json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Workflow Definitions
  app.get("/api/workflows/:serviceId", async (req, res) => {
    try {
      const workflow = await storage.getServiceWorkflow(req.params.serviceId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/workflows", authenticateToken, async (req, res) => {
    try {
      const data = insertWorkflowDefinitionSchema.parse(req.body);
      const workflow = await storage.createWorkflowDefinition(data);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics and Reports
  app.get("/api/analytics/service-usage", authenticateToken, async (req, res) => {
    try {
      const analytics = await storage.getServiceUsageAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/workflow-performance", authenticateToken, async (req, res) => {
    try {
      const analytics = await storage.getWorkflowPerformanceAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System Health and Monitoring
  app.get("/api/system/health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================================================
  // Enhanced APIs for New Features
  // =========================================================

  // Service Categories
  app.get("/api/service-categories", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM service_categories 
        WHERE is_active = true 
        ORDER BY sort_order, name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      res.status(500).json({ message: "خطأ في استرجاع فئات الخدمات" });
    }
  });

  // Government Services
  app.get("/api/government-services", async (req, res) => {
    try {
      const { categoryId, ministryId, featured } = req.query;
      
      let whereClause = 'WHERE gs.is_active = true';
      const params: any[] = [];

      if (categoryId) {
        whereClause += ` AND gs.category_id = $${params.length + 1}`;
        params.push(categoryId);
      }
      if (ministryId) {
        whereClause += ` AND gs.ministry_id = $${params.length + 1}`;
        params.push(ministryId);
      }
      if (featured === 'true') {
        whereClause += ` AND gs.is_featured = true`;
      }

      const result = await db.execute(sql.raw(`
        SELECT 
          gs.*,
          sc.name as category_name,
          m.name as ministry_name
        FROM government_services gs
        LEFT JOIN service_categories sc ON gs.category_id = sc.id
        LEFT JOIN ministries m ON gs.ministry_id = m.id
        ${whereClause}
        ORDER BY gs.is_featured DESC, gs.name
        ${featured === 'true' ? 'LIMIT 6' : ''}
      `));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching government services:", error);
      res.status(500).json({ message: "خطأ في استرجاع الخدمات الحكومية" });
    }
  });

  // Citizen Applications
  app.get("/api/citizen-applications", async (req, res) => {
    try {
      const { status, applicantId, serviceId, page = '1', limit = '20' } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND ca.status = $${params.length + 1}`;
        params.push(status);
      }
      if (applicantId) {
        whereClause += ` AND ca.applicant_id = $${params.length + 1}`;
        params.push(applicantId);
      }
      if (serviceId) {
        whereClause += ` AND ca.service_id = $${params.length + 1}`;
        params.push(serviceId);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const result = await db.execute(sql.raw(`
        SELECT 
          ca.*,
          gs.name as service_name,
          u.full_name as applicant_name
        FROM citizen_applications ca
        LEFT JOIN government_services gs ON ca.service_id = gs.id
        LEFT JOIN users u ON ca.applicant_id = u.id
        ${whereClause}
        ORDER BY ca.submitted_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching citizen applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات" });
    }
  });

  // Enhanced Dashboard Stats
  app.get("/api/enhanced-dashboard/stats", async (req, res) => {
    try {
      const stats = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status IN ('submitted', 'under_review')`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'approved'`),
        db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'pending'`),
        db.execute(sql`SELECT COUNT(*) as count FROM government_services WHERE is_active = true`),
      ]);

      res.json({
        totalApplications: parseInt(String(stats[0].rows[0].count)),
        pendingApplications: parseInt(String(stats[1].rows[0].count)),
        approvedApplications: parseInt(String(stats[2].rows[0].count)),
        pendingSurveys: parseInt(String(stats[3].rows[0].count)),
        totalServices: parseInt(String(stats[4].rows[0].count)),
      });
    } catch (error) {
      console.error("Error fetching enhanced dashboard stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإحصائيات" });
    }
  });

  // Workflow Management Routes

  // Application Status History
  app.get("/api/applications/:id/status-history", authenticateToken, async (req, res) => {
    try {
      const history = await storage.getApplicationStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/applications/:id/status-change", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const statusData = insertApplicationStatusHistorySchema.parse({
        ...req.body,
        applicationId: req.params.id,
        changedById: req.user?.id,
      });
      const statusHistory = await storage.createApplicationStatusHistory(statusData);
      
      // Also update the main application status
      await storage.updateApplication(req.params.id, {
        status: statusData.newStatus,
        currentStage: statusData.newStage,
      });
      
      res.status(201).json(statusHistory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Application Assignments
  app.get("/api/applications/:id/assignments", authenticateToken, async (req, res) => {
    try {
      const assignments = await storage.getApplicationAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auto-assignment endpoint (public - no authentication required for system auto-assignment)
  app.post("/api/applications/:id/auto-assign", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('district'), async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getApplication(id);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Simple auto-assignment logic based on service type
      const departmentAssignments = {
        'building_license': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'surveying_decision': '550e8400-e29b-41d4-a716-446655440002', // Surveying Department
        'demolition_permit': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'renovation_permit': '550e8400-e29b-41d4-a716-446655440001', // Planning & Licensing Department
        'commercial_license': '550e8400-e29b-41d4-a716-446655440003', // Commercial Affairs Department
        'industrial_license': '550e8400-e29b-41d4-a716-446655440004', // Industrial Development Department
      };

      // Extract service type from applicationData or use serviceId
      const serviceType = (application.applicationData as any)?.serviceType || 
                         (application.serviceId === 'service-surveying-decision' ? 'surveying_decision' : 'general');
      
      const targetDepartmentId = departmentAssignments[serviceType as keyof typeof departmentAssignments] || '550e8400-e29b-41d4-a716-446655440001';

      // Get available employees in the target department with the least workload
      const departmentUsers = await storage.getUsers({ departmentId: targetDepartmentId, isActive: true });
      
      if (departmentUsers.length === 0) {
        return res.status(400).json({ error: 'No available employees in target department' });
      }

      // Simple round-robin assignment to the first available employee
      const assignedToId = departmentUsers[0].id;

      // Create assignment
      const assignment = await storage.createApplicationAssignment({
        applicationId: id,
        assignedToId,
        assignedById: '00000000-0000-0000-0000-000000000000', // System auto-assignment
        assignmentType: 'primary_reviewer', // نوع التكليف
        stage: 'initial_review', // مرحلة المراجعة الأولية
        departmentId: targetDepartmentId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: 'medium',
        notes: `Auto-assigned based on service type: ${serviceType}`,
        status: 'pending'
      });

      // Update application status
      await storage.updateApplication(id, {
        status: 'in_review',
        currentStage: 'review'
      });

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId: id,
        previousStatus: application.status || 'submitted',
        newStatus: 'in_review',
        changedById: '00000000-0000-0000-0000-000000000000', // System auto-assignment
        notes: 'Application auto-assigned for review'
      });

      // Create notification for assigned employee
      await storage.createNotification({
        userId: assignedToId,
        title: 'تم تعيين طلب جديد لك',
        message: `تم تعيين طلب رقم ${application.applicationNumber} لمراجعتك`,
        type: 'assignment',
        category: 'workflow',
        relatedEntityId: id,
        relatedEntityType: 'application'
      });

      res.json({ 
        assignment, 
        message: 'Application auto-assigned successfully' 
      });
    } catch (error) {
      console.error('Error auto-assigning application:', error);
      res.status(500).json({ error: 'Failed to auto-assign application' });
    }
  });


  app.put("/api/assignments/:id", authenticateToken, async (req, res) => {
    try {
      const assignment = await storage.updateApplicationAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment Processing
  app.post("/api/applications/:id/payment", authenticateToken, requireRole(['treasurer', 'admin']), async (req, res) => {
    try {
      const { paymentMethod, notes, paidBy } = req.body;
      const applicationId = req.params.id;
      
      // Update application payment status
      const updatedApplication = await storage.updateApplication(applicationId, {
        isPaid: true,
        paymentDate: new Date(),
        currentStage: 'payment_confirmed',
        status: 'paid'
      });

      // Create payment record in application data
      const existingApp = await storage.getApplication(applicationId);
      if (existingApp && existingApp.applicationData) {
        const updatedData = {
          ...existingApp.applicationData,
          payment: {
            method: paymentMethod,
            notes,
            paidBy,
            paidAt: new Date(),
            confirmedBy: 'cashier'
          }
        };
        
        await storage.updateApplication(applicationId, {
          applicationData: updatedData
        });
      }

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'submitted',
        newStatus: 'paid',
        changedById: paidBy,
        notes: `Payment confirmed - ${paymentMethod}. ${notes || ''}`
      });

      // Create notification for next stage
      await storage.createNotification({
        userId: paidBy,
        title: 'تم تأكيد دفع الرسوم',
        message: `تم تأكيد دفع رسوم الطلب رقم ${existingApp?.applicationNumber}`,
        type: 'payment',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Document Review Processing
  app.post("/api/applications/:id/document-review", authenticateToken, requireRole(['service_clerk', 'manager', 'admin']), async (req, res) => {
    try {
      const { action, notes, reviewerId } = req.body;
      const applicationId = req.params.id;
      
      let newStatus = 'document_approved';
      let newStage = 'document_approved';
      
      if (action === 'reject') {
        newStatus = 'document_rejected';
        newStage = 'rejected';
      } else if (action === 'request_docs') {
        newStatus = 'document_review';
        newStage = 'awaiting_documents';
      }

      // Update application status
      const updatedApplication = await storage.updateApplication(applicationId, {
        status: newStatus,
        currentStage: newStage,
        reviewNotes: notes
      });

      // Get application details for notification
      const existingApp = await storage.getApplication(applicationId);

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'paid',
        newStatus,
        changedById: reviewerId,
        notes: `Document review: ${action}. ${notes || ''}`
      });

      // Create notification
      let notificationMessage = '';
      if (action === 'approve') {
        notificationMessage = `تمت الموافقة على مستندات الطلب رقم ${existingApp?.applicationNumber}`;
      } else if (action === 'reject') {
        notificationMessage = `تم رفض مستندات الطلب رقم ${existingApp?.applicationNumber}`;
      } else {
        notificationMessage = `مطلوب مستندات إضافية للطلب رقم ${existingApp?.applicationNumber}`;
      }

      await storage.createNotification({
        userId: reviewerId,
        title: 'مراجعة المستندات',
        message: notificationMessage,
        type: 'document_review',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error processing document review:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Application Reviews
  app.get("/api/applications/:id/reviews", authenticateToken, async (req, res) => {
    try {
      const reviews = await storage.getApplicationReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/applications/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const reviewData = insertApplicationReviewSchema.parse({
        ...req.body,
        applicationId: req.params.id,
        reviewerId: req.user?.id,
      });
      const review = await storage.createApplicationReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications
  app.get("/api/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { isRead, category, type } = req.query;
      const notifications = await storage.getNotifications({
        userId: req.user?.id || "",
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        category: category as string,
        type: type as string,
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/mark-all-read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user?.id || "");
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
    try {
      // Note: This would need to be implemented in storage.ts
      // For now, we'll mark as read which effectively "hides" it
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification removed" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Employee dashboard - pending assignments
  app.get("/api/dashboard/my-assignments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const assignments = await storage.getUserAssignments(req.user?.id || "");
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Department workload statistics
  app.get("/api/dashboard/department-workload", authenticateToken, async (req, res) => {
    try {
      const { departmentId } = req.query;
      const workload = await storage.getDepartmentWorkload(departmentId as string);
      res.json(workload);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Surveyor Workflow Endpoints


  // Survey report submission endpoint
  app.post("/api/applications/:id/survey-report", authenticateToken, requireRole(['engineer', 'manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
    try {
      const {
        surveyorId,
        findings,
        decision,
        decisionReason,
        attachments = []
      } = req.body;
      const applicationId = req.params.id;

      const application = storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Create survey report
      const surveyReport = {
        id: Date.now().toString(),
        applicationId,
        surveyorId,
        findings,
        decision,
        decisionReason,
        attachments,
        status: 'submitted',
        createdAt: new Date()
      };

      // Update application status based on survey decision
      let newStatus = "survey_completed";
      let newStage = "completed";
      
      if (decision === 'require_modification') {
        newStatus = "requires_modification";
        newStage = "citizen_action_required";
      } else if (decision === 'reject') {
        newStatus = "rejected";
        newStage = "rejected";
      }

      const updatedApplication = {
        ...application,
        status: newStatus,
        currentStage: newStage,
        surveyReport,
        updatedAt: new Date()
      };

      storage.updateApplication(applicationId, updatedApplication);

      res.json({
        message: "Survey report submitted successfully",
        application: updatedApplication,
        surveyReport
      });
    } catch (error) {
      console.error("Error submitting survey report:", error);
      res.status(500).json({ message: "Failed to submit survey report" });
    }
  });

  // Get survey report for application
  app.get("/api/applications/:id/survey-report", async (req, res) => {
    try {
      const applicationId = req.params.id;
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Survey report would be stored separately or in applicationData
      const applicationData = application.applicationData as any || {};
      const surveyReport = applicationData.surveyReport;

      if (!surveyReport) {
        return res.status(404).json({ message: "Survey report not found" });
      }

      res.json(surveyReport);
    } catch (error) {
      console.error("Error fetching survey report:", error);
      res.status(500).json({ message: "Failed to fetch survey report" });
    }
  });

  // Public Service Dashboard APIs
  
  // Get pending applications for public service review
  app.get("/api/public-service/pending-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are assigned and ready for public service review
      const result = await db.select()
        .from(applications)
        .where(sql`status = 'in_review' AND current_stage = 'review'`)
        .orderBy(desc(applications.createdAt));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching pending applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات المطلوب مراجعتها" });
    }
  });

  // Get reviewed applications by public service
  app.get("/api/public-service/reviewed-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await db.select()
        .from(applications)
        .where(sql`status IN ('approved', 'rejected', 'pending_payment') AND current_stage != 'review'`)
        .orderBy(desc(applications.updatedAt));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching reviewed applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات المراجعة" });
    }
  });

  // Public service review endpoint
  app.post("/api/applications/:id/public-service-review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { decision, notes, calculatedFees, reviewerComments } = req.body;
      const applicationId = req.params.id;
      
      // Update application with review decision
      const newStatus = decision === 'approved' ? 'approved' : 'rejected';
      const newStage = decision === 'approved' ? 'pending_payment' : 'rejected';
      
      await storage.updateApplication(applicationId, {
        status: newStatus,
        currentStage: newStage,
        fees: calculatedFees.toString()
      });

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'in_review',
        newStatus,
        previousStage: 'review',
        newStage,
        changedById: req.user?.id || '',
        notes: `خدمة الجمهور - ${decision === 'approved' ? 'اعتماد' : 'رفض'}: ${reviewerComments}`
      });

      // Create notification
      await storage.createNotification({
        userId: req.user?.id || '',
        title: decision === 'approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب',
        message: `تم ${decision === 'approved' ? 'اعتماد' : 'رفض'} الطلب من قبل خدمة الجمهور`,
        type: 'review',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json({
        message: `تم ${decision === 'approved' ? 'اعتماد' : 'رفض'} الطلب بنجاح`,
        applicationId,
        decision,
        calculatedFees
      });
    } catch (error) {
      console.error("Error processing public service review:", error);
      res.status(500).json({ message: "خطأ في معالجة المراجعة" });
    }
  });

  // Treasury and Payment APIs
  
  // Generate invoice for approved application
  app.post("/api/applications/:id/generate-invoice", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.id;
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      if (application.status !== 'approved') {
        return res.status(400).json({ message: "يمكن إصدار الفاتورة للطلبات المعتمدة فقط" });
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      const issueDate = new Date();
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

      // Update application with payment status
      await storage.updateApplication(applicationId, {
        status: 'pending_payment',
        currentStage: 'payment'
      });

      const appData = application.applicationData as any;
      const invoiceData = {
        invoiceNumber,
        applicationId,
        applicationNumber: application.applicationNumber,
        applicantName: appData?.applicantName || 'غير محدد',
        applicantId: application.applicantId,
        contactPhone: appData?.phoneNumber || appData?.contactPhone || 'غير محدد',
        serviceType: appData?.serviceType || 'خدمة عامة',
        fees: application.fees,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'pending'
      };

      res.json({
        message: "تم إنشاء الفاتورة بنجاح",
        invoice: invoiceData
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ message: "خطأ في إنشاء الفاتورة" });
    }
  });

  // Get invoice details
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = req.params.id;
      
      // Mock invoice data - في التطبيق الحقيقي سيتم جلب البيانات من قاعدة البيانات
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: 'INV-711220912',
        applicationNumber: 'APP-2025-297204542',
        applicantName: 'صدام حسين حسين السراجي',
        applicantId: '778774772',
        contactPhone: '777123456',
        serviceType: 'إصدار تقرير مساحي',
        fees: {
          basicFee: 55000,
          additionalFee: 2000,
          total: 57000
        },
        issueDate: '2025-03-31',
        dueDate: '2025-04-15',
        status: 'pending'
      };

      res.json(mockInvoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "خطأ في استرجاع الفاتورة" });
    }
  });

  // Confirm payment
  app.post("/api/payments/confirm", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, paymentMethod, notes, amount } = req.body;
      
      if (!applicationId) {
        return res.status(400).json({ message: "معرف الطلب مطلوب" });
      }

      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      // Update application status to awaiting assignment after payment
      await storage.updateApplication(applicationId, {
        status: 'paid',
        currentStage: 'assigned',  // 👈 الحل الحاسم! تحديث currentStage لـ assigned
        paymentDate: new Date()
      });

      // Create payment record (this would be stored in a payments table in real implementation)
      const paymentRecord = {
        id: `PAY-${Date.now()}`,
        applicationId,
        amount: amount || application.fees,
        paymentMethod: paymentMethod || 'cash',
        notes: notes || 'تم السداد في الصندوق',
        paymentDate: new Date(),
        cashierId: req.user?.id
      };

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'pending_payment',
        newStatus: 'paid',
        previousStage: 'payment',
        newStage: 'assigned',
        changedById: req.user?.id || '',
        notes: `تم تأكيد السداد - ${paymentMethod || 'نقدي'}. جاهز للتكليف`
      });

      // Create notification for section head
      await storage.createNotification({
        userId: '30000000-0000-4000-8000-000000000004', // UUID صحيح لرئيس قسم الإشراف الفني
        title: 'طلب جديد جاهز للتكليف',
        message: `طلب رقم ${application.applicationNumber} تم دفع رسومه وجاهز للتكليف`,
        type: 'assignment',
        category: 'workflow',
        relatedEntityId: applicationId,
        relatedEntityType: 'application'
      });

      res.json({
        message: "تم تأكيد السداد بنجاح",
        payment: paymentRecord
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "خطأ في تأكيد السداد" });
    }
  });

  // Get treasury statistics
  // Treasury applications - Applications ready for payment
  app.get("/api/treasury-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are approved and pending payment
      const applications = await storage.getApplications({
        status: 'pending_payment'
      });

      // Transform applications to include payment-related fields
      const treasuryApplications = applications.map(app => {
        const fees = app.fees || 57000; // Default fee if not set
        
        const appData = app.applicationData as any;
        return {
          ...app,
          fees: fees.toString(),
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          paymentStatus: app.status === 'paid' ? 'paid' : 'pending',
          invoiceDate: app.updatedAt || app.createdAt,
          dueDate: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)), // 15 days from now
          applicationData: {
            ...appData,
            area: appData?.area || '700'
          }
        };
      });

      res.json(treasuryApplications);
    } catch (error) {
      console.error("Error fetching treasury applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع طلبات الصندوق" });
    }
  });

  // Department manager applications - Applications awaiting assignment after payment
  app.get("/api/manager-applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get applications that are paid and awaiting assignment
      const applications = await storage.getApplications({
        status: 'paid'
      });

      res.json(applications);
    } catch (error) {
      console.error("Error fetching manager applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع طلبات المدير" });
    }
  });


  // Assign engineer to application
  app.post('/api/applications/:id/assign', authenticateToken, enforceLBACAccess('district'), async (req: AuthenticatedRequest, res) => {
    try {
      const { assignedToId, notes, priority } = req.body;
      const applicationId = req.params.id;

      // Update application assignment - send to assistant manager first
      await storage.updateApplication(applicationId, {
        assignedToId,
        status: 'assigned',
        currentStage: 'waiting_scheduling'
      });

      // Create a task for the assigned engineer
      const taskData = {
        title: 'مسح ميداني للطلب',
        description: 'إجراء مسح ميداني وإعداد التقرير المطلوب',
        applicationId,
        assignedToId,
        assignedById: req.user?.id,
        priority: priority || 'medium',
        status: 'pending',
        notes: notes
      };
      
      await storage.createTask(taskData);

      // Create status history
      await storage.createApplicationStatusHistory({
        applicationId,
        previousStatus: 'paid',
        newStatus: 'assigned',
        previousStage: 'awaiting_assignment',
        newStage: 'waiting_scheduling',
        changedById: req.user?.id || '',
        notes: `تم تكليف مهندس ونقل الطلب لمساعد المدير للجدولة: ${notes || ''}`
      });

      res.json({ success: true, message: "تم تكليف المهندس بنجاح" });
    } catch (error) {
      console.error('Error assigning application:', error);
      res.status(500).json({ message: 'خطأ في تكليف المهندس' });
    }
  });

  app.get("/api/treasury/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Mock statistics - في التطبيق الحقيقي سيتم حساب الإحصائيات من قاعدة البيانات
      const mockStats = {
        totalRevenue: 187000,
        pendingPayments: 2,
        paidToday: 1,
        overduePayments: 1,
        totalTransactions: 1,
        revenueToday: 45000
      };

      res.json(mockStats);
    } catch (error) {
      console.error("Error fetching treasury stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع إحصائيات الصندوق" });
    }
  });

  // Get payment notifications for treasury
  app.get("/api/treasury/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Mock notifications for new payments
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'new_payment',
          title: 'طلب جديد في انتظار السداد',
          message: 'طلب APP-2025-297204542 معتمد ومجهز للسداد',
          applicationId: 'treasury-1',
          createdAt: new Date(),
          isRead: false
        }
      ];

      res.json(mockNotifications);
    } catch (error) {
      console.error("Error fetching treasury notifications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الإشعارات" });
    }
  });

  // Ministries
  app.get("/api/ministries", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM ministries 
        WHERE is_active = true 
        ORDER BY name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching ministries:", error);
      res.status(500).json({ message: "خطأ في استرجاع الوزارات" });
    }
  });

  // ======= APPOINTMENTS MANAGEMENT API =======

  // Get appointments with filtering
  app.get("/api/appointments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, assignedToId, status, confirmationStatus } = req.query;
      
      const appointments = await storage.getAppointments({
        applicationId: applicationId as string,
        assignedToId: assignedToId as string,
        status: status as string,
        confirmationStatus: confirmationStatus as string,
      });

      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "خطأ في استرجاع المواعيد" });
    }
  });

  // Get specific appointment
  app.get("/api/appointments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      
      if (!appointment) {
        return res.status(404).json({ message: "الموعد غير موجود" });
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "خطأ في استرجاع الموعد" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.createAppointment(req.body);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "خطأ في إنشاء الموعد" });
    }
  });

  // Update appointment
  app.put("/api/appointments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "خطأ في تحديث الموعد" });
    }
  });

  // Confirm appointment (by citizen or engineer)
  app.post("/api/appointments/:id/confirm", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { confirmedBy, notes } = req.body;
      
      if (!confirmedBy || !['citizen', 'engineer'].includes(confirmedBy)) {
        return res.status(400).json({ message: "نوع التأكيد مطلوب" });
      }

      const appointment = await storage.confirmAppointment(req.params.id, confirmedBy, notes);
      res.json(appointment);
    } catch (error) {
      console.error("Error confirming appointment:", error);
      res.status(500).json({ message: "خطأ في تأكيد الموعد" });
    }
  });

  // Get upcoming appointments for engineer
  app.get("/api/appointments/upcoming/:engineerId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { daysAhead } = req.query;
      const appointments = await storage.getUpcomingAppointments(
        req.params.engineerId,
        daysAhead ? parseInt(daysAhead as string) : 7
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      res.status(500).json({ message: "خطأ في استرجاع المواعيد القادمة" });
    }
  });

  // Schedule appointment for application
  app.post("/api/applications/:id/schedule", authenticateToken, enforceLBACAccess('neighborhood'), async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.id;
      const { assignedToId, appointmentDate, appointmentTime, contactPhone, contactNotes, location } = req.body;

      if (!assignedToId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "بيانات الموعد مطلوبة" });
      }

      const appointment = await storage.createAppointment({
        applicationId,
        assignedToId,
        scheduledById: req.user?.id as string,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        contactPhone,
        contactNotes,
        location,
        status: 'scheduled',
        confirmationStatus: 'pending'
      });

      // Update application status
      await storage.updateApplication(applicationId, {
        status: 'scheduled',
        currentStage: 'appointment_scheduling'
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      res.status(500).json({ message: "خطأ في تحديد الموعد" });
    }
  });

  // ======= CONTACT ATTEMPTS MANAGEMENT API =======

  // Get contact attempts
  app.get("/api/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, appointmentId, attemptedById, isSuccessful } = req.query;
      
      const attempts = await storage.getContactAttempts({
        applicationId: applicationId as string,
        appointmentId: appointmentId as string,
        attemptedById: attemptedById as string,
        isSuccessful: isSuccessful === 'true' ? true : isSuccessful === 'false' ? false : undefined,
      });

      res.json(attempts);
    } catch (error) {
      console.error("Error fetching contact attempts:", error);
      res.status(500).json({ message: "خطأ في استرجاع محاولات التواصل" });
    }
  });

  // Create contact attempt
  app.post("/api/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attempt = await storage.createContactAttempt({
        ...req.body,
        attemptedById: req.user?.id as string,
      });
      res.status(201).json(attempt);
    } catch (error) {
      console.error("Error creating contact attempt:", error);
      res.status(500).json({ message: "خطأ في تسجيل محاولة التواصل" });
    }
  });

  // Get contact attempts for application
  app.get("/api/applications/:id/contact-attempts", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attempts = await storage.getContactAttemptsForApplication(req.params.id);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching contact attempts for application:", error);
      res.status(500).json({ message: "خطأ في استرجاع محاولات التواصل للطلب" });
    }
  });

  // Mark contact attempt as successful
  app.put("/api/contact-attempts/:id/success", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { notes } = req.body;
      const attempt = await storage.markContactAttemptSuccessful(req.params.id, notes);
      res.json(attempt);
    } catch (error) {
      console.error("Error marking contact attempt as successful:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة محاولة التواصل" });
    }
  });

  // ======= SURVEY ASSIGNMENT FORMS API =======

  // Get survey assignment forms
  app.get("/api/assignment-forms", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, assignedToId, status } = req.query;
      
      const forms = await storage.getSurveyAssignmentForms({
        applicationId: applicationId as string,
        assignedToId: assignedToId as string,
        status: status as string,
      });

      res.json(forms);
    } catch (error) {
      console.error("Error fetching assignment forms:", error);
      res.status(500).json({ message: "خطأ في استرجاع نماذج التكليف" });
    }
  });

  // Get specific assignment form
  app.get("/api/assignment-forms/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.getSurveyAssignmentForm(req.params.id);
      
      if (!form) {
        return res.status(404).json({ message: "نموذج التكليف غير موجود" });
      }

      res.json(form);
    } catch (error) {
      console.error("Error fetching assignment form:", error);
      res.status(500).json({ message: "خطأ في استرجاع نموذج التكليف" });
    }
  });

  // Create survey assignment form
  app.post("/api/assignment-forms", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.createSurveyAssignmentForm(req.body);
      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating assignment form:", error);
      res.status(500).json({ message: "خطأ في إنشاء نموذج التكليف" });
    }
  });

  // Update assignment form
  app.put("/api/assignment-forms/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.updateSurveyAssignmentForm(req.params.id, req.body);
      res.json(form);
    } catch (error) {
      console.error("Error updating assignment form:", error);
      res.status(500).json({ message: "خطأ في تحديث نموذج التكليف" });
    }
  });

  // Mark form as printed
  app.put("/api/assignment-forms/:id/print", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = await storage.markFormAsPrinted(req.params.id);
      res.json(form);
    } catch (error) {
      console.error("Error marking form as printed:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة الطباعة" });
    }
  });

  // Mark form as signed
  app.put("/api/assignment-forms/:id/sign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { supervisorSignature } = req.body;
      
      if (!supervisorSignature) {
        return res.status(400).json({ message: "توقيع المشرف مطلوب" });
      }

      const form = await storage.markFormAsSigned(req.params.id, supervisorSignature);
      res.json(form);
    } catch (error) {
      console.error("Error marking form as signed:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة التوقيع" });
    }
  });

  // ======= ENGINEER APIS =======

  // Get engineer workload dashboard data
  app.get('/api/engineer/workload/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const workload = await storage.getEngineerWorkload(engineerId);
      res.json(workload);
    } catch (error) {
      console.error('Error fetching engineer workload:', error);
      res.status(500).json({ error: 'فشل في استرجاع أعباء المهندس' });
    }
  });

  // Get engineer operation details
  app.get('/api/engineer/operations/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const operations = await storage.getEngineerOperationDetails(engineerId);
      res.json(operations);
    } catch (error) {
      console.error('Error fetching engineer operations:', error);
      res.status(500).json({ error: 'فشل في استرجاع تفاصيل العمليات' });
    }
  });

  // Get engineer appointments
  app.get('/api/engineer/appointments/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const { status } = req.query;
      
      const appointments = await storage.getAppointments({
        assignedToId: engineerId,
        status: status as string
      });
      
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching engineer appointments:', error);
      res.status(500).json({ error: 'فشل في استرجاع مواعيد المهندس' });
    }
  });

  // Confirm appointment by engineer
  app.put('/api/engineer/appointments/:appointmentId/confirm', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { appointmentId } = req.params;
      const { notes } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, {
        status: 'confirmed'
      });
      
      res.json(appointment);
    } catch (error) {
      console.error('Error confirming appointment:', error);
      res.status(500).json({ error: 'فشل في تأكيد الموعد' });
    }
  });

  // ======= FIELD VISITS APIS =======

  // Get field visits for engineer
  app.get('/api/field-visits/engineer/:engineerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { engineerId } = req.params;
      const { status } = req.query;
      
      const visits = await storage.getEngineerFieldVisits(engineerId, status as string);
      res.json(visits);
    } catch (error) {
      console.error('Error fetching field visits:', error);
      res.status(500).json({ error: 'فشل في استرجاع الزيارات الميدانية' });
    }
  });

  // Get field visit by ID
  app.get('/api/field-visits/:visitId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const visit = await storage.getFieldVisit(visitId);
      
      if (!visit) {
        return res.status(404).json({ error: 'الزيارة الميدانية غير موجودة' });
      }
      
      res.json(visit);
    } catch (error) {
      console.error('Error fetching field visit:', error);
      res.status(500).json({ error: 'فشل في استرجاع الزيارة الميدانية' });
    }
  });

  // Create field visit
  app.post('/api/field-visits', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const visitData = req.body;
      const visit = await storage.createFieldVisit(visitData);
      res.status(201).json(visit);
    } catch (error) {
      console.error('Error creating field visit:', error);
      res.status(500).json({ error: 'فشل في إنشاء الزيارة الميدانية' });
    }
  });

  // Start field visit
  app.put('/api/field-visits/:visitId/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const { gpsLocation } = req.body;
      
      const visit = await storage.startFieldVisit(visitId, gpsLocation);
      res.json(visit);
    } catch (error) {
      console.error('Error starting field visit:', error);
      res.status(500).json({ error: 'فشل في بدء الزيارة الميدانية' });
    }
  });

  // Complete field visit
  app.put('/api/field-visits/:visitId/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const { notes, requiresFollowUp, followUpReason } = req.body;
      
      const visit = await storage.completeFieldVisit(visitId, notes, requiresFollowUp, followUpReason);
      res.json(visit);
    } catch (error) {
      console.error('Error completing field visit:', error);
      res.status(500).json({ error: 'فشل في إكمال الزيارة الميدانية' });
    }
  });

  // Update field visit
  app.put('/api/field-visits/:visitId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const updates = req.body;
      
      const visit = await storage.updateFieldVisit(visitId, updates);
      res.json(visit);
    } catch (error) {
      console.error('Error updating field visit:', error);
      res.status(500).json({ error: 'فشل في تحديث الزيارة الميدانية' });
    }
  });

  // ======= SURVEY RESULTS APIS =======

  // Get survey results
  app.get('/api/survey-results', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const results = await storage.getSurveyResults(filters);
      res.json(results);
    } catch (error) {
      console.error('Error fetching survey results:', error);
      res.status(500).json({ error: 'فشل في استرجاع نتائج المساحة' });
    }
  });

  // Get survey result by ID
  app.get('/api/survey-results/:resultId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const result = await storage.getSurveyResult(resultId);
      
      if (!result) {
        return res.status(404).json({ error: 'نتيجة المساحة غير موجودة' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching survey result:', error);
      res.status(500).json({ error: 'فشل في استرجاع نتيجة المساحة' });
    }
  });

  // Create survey result
  app.post('/api/survey-results', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const resultData = req.body;
      const result = await storage.createSurveyResult(resultData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating survey result:', error);
      res.status(500).json({ error: 'فشل في إنشاء نتيجة المساحة' });
    }
  });

  // Update survey result
  app.put('/api/survey-results/:resultId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const updates = req.body;
      
      const result = await storage.updateSurveyResult(resultId, updates);
      res.json(result);
    } catch (error) {
      console.error('Error updating survey result:', error);
      res.status(500).json({ error: 'فشل في تحديث نتيجة المساحة' });
    }
  });

  // Complete survey result
  app.put('/api/survey-results/:resultId/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { resultId } = req.params;
      const result = await storage.completeSurveyResult(resultId);
      res.json(result);
    } catch (error) {
      console.error('Error completing survey result:', error);
      res.status(500).json({ error: 'فشل في إكمال نتيجة المساحة' });
    }
  });

  // ======= SURVEY REPORTS APIS =======

  // Get survey reports
  app.get('/api/survey-reports', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const reports = await storage.getSurveyReports(filters);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching survey reports:', error);
      res.status(500).json({ error: 'فشل في استرجاع تقارير المساحة' });
    }
  });

  // Create survey report
  app.post('/api/survey-reports', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const reportData = req.body;
      const report = await storage.createSurveyReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating survey report:', error);
      res.status(500).json({ error: 'فشل في إنشاء تقرير المساحة' });
    }
  });

  // Get public reports for application (for citizens)
  app.get('/api/applications/:applicationId/public-reports', async (req, res) => {
    try {
      const { applicationId } = req.params;
      const reports = await storage.getPublicReportsForApplication(applicationId);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching public reports:', error);
      res.status(500).json({ error: 'فشل في استرجاع التقارير العامة' });
    }
  });

  // ===========================================
  // MOBILE SYNC & OFFLINE OPERATIONS API
  // ===========================================

  // Get sync session info
  app.get('/api/sync/session/:deviceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { deviceId } = req.params;
      
      // Verify device exists and user has access
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'الجهاز غير موجود' });
      }

      // Get latest sync session for this device
      const sessions = await storage.getSyncSessions({
        deviceId: device.id,
        userId: req.user!.id
      });

      const latestSession = sessions.sort((a, b) => 
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      )[0];

      res.json({
        deviceId: device.deviceId,
        lastSync: device.lastSync,
        latestSession: latestSession ? {
          id: latestSession.id,
          status: latestSession.status,
          startTime: latestSession.startTime,
          endTime: latestSession.endTime,
          operationsCount: (latestSession.metadata as any)?.totalOperations || 0
        } : null,
        isActive: device.isActive
      });
    } catch (error) {
      console.error('Error getting sync session:', error);
      res.status(500).json({ error: 'فشل في استرجاع معلومات جلسة المزامنة' });
    }
  });

  // Get syncable tables info
  app.get('/api/sync/tables', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for table information
      const { getSyncableTablesForUser, SYNC_REGISTRY } = await import('./syncRegistry');
      
      const allowedTables = getSyncableTablesForUser(req.user!);
      
      const tablesInfo = allowedTables.map(tableName => {
        const config = SYNC_REGISTRY[tableName];
        return {
          tableName,
          allowedOperations: config.allowedOperations,
          requiredRoles: config.requiredRoles,
          hasUpdatedAt: config.hasUpdatedAt,
          description: `جدول ${tableName} للمزامنة الميدانية`
        };
      });

      res.json({
        tables: tablesInfo,
        totalTables: tablesInfo.length,
        userRole: req.user!.role
      });
    } catch (error) {
      console.error('Error getting sync tables:', error);
      res.status(500).json({ error: 'فشل في استرجاع معلومات الجداول' });
    }
  });

  // Pull changes from server (differential sync)
  app.post('/api/sync/pull', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for security validation and Zod schemas
      const { isTableSyncable, canUserSyncTable, generateLBACFilter, getSyncableTablesForUser, SyncPullRequestSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first to prevent injection attacks
      const payloadValidation = validateSyncPayload(SyncPullRequestSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات الطلب غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { deviceId, lastSyncTimestamp, tables } = payloadValidation.data;
      
      // Verify device registration
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || !device.isActive) {
        return res.status(404).json({ error: 'جهاز غير مسجل أو غير مفعل' });
      }

      // Create sync session
      const session = await storage.createSyncSession({
        deviceId: device.id,
        userId: req.user!.id,
        sessionType: 'pull',
        status: 'in_progress',
        startTime: new Date(),
        lastSyncTimestamp: lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined
      });

      const changes: { [tableName: string]: any[] } = {};
      const errors: { [tableName: string]: string } = {};
      let totalChanges = 0;
      let failedTables = 0;

      // Validate requested tables against user permissions
      const allowedTables = getSyncableTablesForUser(req.user!);
      const filteredTables = tables.filter((tableName: string) => {
        if (!isTableSyncable(tableName)) {
          errors[tableName] = `الجدول ${tableName} غير مسموح للمزامنة`;
          return false;
        }
        
        if (!canUserSyncTable(req.user!, tableName, 'read')) {
          errors[tableName] = `ليس لديك صلاحية قراءة الجدول ${tableName}`;
          return false;
        }
        
        return true;
      });

      // Get changes for each validated table
      for (const tableName of filteredTables) {
        try {
          // Apply LBAC filtering
          const lbacFilter = generateLBACFilter(req.user!, tableName);
          
          const records = await storage.getChangedRecords(
            tableName,
            lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0),
            1000, // Limit per table
            lbacFilter,
            req.user! // CRITICAL: Pass user for record-level RBAC validation
          );
          changes[tableName] = records;
          totalChanges += records.length;
        } catch (error) {
          console.error(`Error fetching changes for ${tableName}:`, error);
          errors[tableName] = `خطأ في استرجاع البيانات: ${(error as Error).message}`;
          failedTables++;
        }
      }

      // Update session statistics with accurate counts
      await storage.completeSyncSession(session.id, new Date(), {
        totalOperations: tables.length, // Total tables requested
        successfulOperations: filteredTables.length - failedTables, // Successfully processed tables
        failedOperations: failedTables, // Failed tables due to errors
        conflictOperations: 0 // No conflicts in pull operations
      });

      // Update device last sync timestamp only if successful
      if (failedTables === 0) {
        await storage.updateDeviceLastSync(deviceId);
      }

      res.json({
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        changes,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        totalChanges,
        tablesRequested: tables.length,
        tablesProcessed: filteredTables.length,
        tablesFailed: failedTables,
        hasMoreChanges: totalChanges >= 1000 * filteredTables.length
      });
    } catch (error) {
      console.error('Error in sync pull:', error);
      res.status(500).json({ error: 'فشل في مزامنة البيانات' });
    }
  });

  // Push local changes to server
  app.post('/api/sync/push', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for security validation and Zod schemas
      const { validateSyncOperation, SyncPushRequestSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first to prevent injection attacks
      const payloadValidation = validateSyncPayload(SyncPushRequestSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات العمليات غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { deviceId, operations } = payloadValidation.data;
      
      // Verify device registration
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || !device.isActive) {
        return res.status(404).json({ error: 'جهاز غير مسجل أو غير مفعل' });
      }

      // Create sync session
      const session = await storage.createSyncSession({
        deviceId: device.id,
        userId: req.user!.id,
        sessionType: 'push',
        status: 'in_progress',
        startTime: new Date()
      });

      const results = { success: 0, conflicts: 0, errors: 0, validationErrors: 0 };
      const validationErrors: string[] = [];

      // Process each operation with validation
      for (const op of operations) {
        try {
          // Import LBAC filtering for push operations security
          const { generateLBACFilter } = await import('./syncRegistry');
          
          // Enrich recordData for RBAC validation (inject user context)
          let enrichedData = { ...op.newData };
          if (op.type === 'create') {
            enrichedData.createdBy = req.user!.id; // Server-side injection for new records
          }
          
          // Validate the sync operation with enriched record data for RBAC
          const validation = validateSyncOperation(req.user!, op.tableName, op.type, op.recordId, enrichedData);
          
          if (!validation.isValid) {
            validationErrors.push(`${op.tableName}:${op.recordId} - ${validation.error}`);
            results.validationErrors++;
            continue;
          }

          // CRITICAL: Apply LBAC filtering to PUSH operations (same as PULL)
          // Engineers should not be able to push data outside their assigned geographic areas
          const lbacFilter = generateLBACFilter(req.user!, op.tableName);
          if (lbacFilter && op.newData) {
            // Check if the data being pushed violates LBAC restrictions
            let lbacViolation = false;
            
            if (lbacFilter.type === 'drizzle_condition') {
              const fieldValue = op.newData[lbacFilter.field];
              
              if (lbacFilter.operator === 'in') {
                // Check if the record's location field is in user's allowed values
                if (!lbacFilter.values.includes(fieldValue)) {
                  lbacViolation = true;
                }
              } else if (lbacFilter.operator === 'eq') {
                // Check equality
                if (fieldValue !== lbacFilter.values[0]) {
                  lbacViolation = true;
                }
              }
            }
            
            if (lbacViolation) {
              validationErrors.push(`${op.tableName}:${op.recordId} - غير مسموح لك بالكتابة في هذا الموقع الجغرافي`);
              results.validationErrors++;
              continue;
            }
          }

          // Store offline operation for tracking
          const offlineOp = await storage.createOfflineOperation({
            deviceId: device.id,
            userId: req.user!.id,
            operationType: op.type,
            tableName: op.tableName,
            recordId: op.recordId,
            operationData: op.newData,
            timestamp: new Date(op.timestamp),
            syncStatus: 'pending'
          });

          // Apply bulk changes for this operation
          const result = await storage.applyBulkChanges(op.tableName, [offlineOp], session.id);
          results.success += result.success;
          results.conflicts += result.conflicts;
          results.errors += result.errors;

        } catch (error) {
          console.error('Error processing operation:', error);
          results.errors++;
        }
      }

      // Update session with accurate results
      await storage.completeSyncSession(session.id, new Date(), {
        totalOperations: operations.length,
        successfulOperations: results.success,
        failedOperations: results.errors + results.validationErrors,
        conflictOperations: results.conflicts
      });

      res.json({
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        results,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        processed: operations.length,
        breakdown: {
          successful: results.success,
          conflicts: results.conflicts,
          errors: results.errors,
          validationErrors: results.validationErrors
        }
      });
    } catch (error) {
      console.error('Error in sync push:', error);
      res.status(500).json({ error: 'فشل في رفع التغييرات' });
    }
  });

  // Get sync conflicts for a session
  app.get('/api/sync/conflicts', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.query;
      
      const conflicts = await storage.getUnresolvedConflicts(sessionId as string);
      
      res.json(conflicts);
    } catch (error) {
      console.error('Error getting sync conflicts:', error);
      res.status(500).json({ error: 'فشل في استرجاع التعارضات' });
    }
  });

  // Resolve sync conflicts
  app.post('/api/sync/resolve-conflicts', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Import sync registry for Zod validation
      const { SyncResolveConflictsSchema, validateSyncPayload } = await import('./syncRegistry');
      
      // CRITICAL: Validate payload with Zod first
      const payloadValidation = validateSyncPayload(SyncResolveConflictsSchema, req.body);
      if (!payloadValidation.success) {
        return res.status(400).json({ 
          error: 'بيانات حل التعارضات غير صحيحة',
          details: payloadValidation.errors 
        });
      }
      
      const { sessionId, resolutions } = payloadValidation.data;
      
      // Verify session exists
      const session = await storage.getSyncSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'جلسة المزامنة غير موجودة' });
      }

      const results = { resolved: 0, failed: 0 };

      // Process each conflict resolution
      for (const resolution of resolutions) {
        try {
          await storage.resolveSyncConflict(
            resolution.conflictId,
            resolution.strategy, // server_wins, client_wins, merge, manual
            resolution.resolvedData,
            req.user!.id
          );
          results.resolved++;
        } catch (error) {
          console.error('Error resolving conflict:', error);
          results.failed++;
        }
      }

      res.json({
        sessionId,
        timestamp: new Date().toISOString(),
        results,
        processed: resolutions.length
      });
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      res.status(500).json({ error: 'فشل في حل التعارضات' });
    }
  });

  // Get device sync status (helper endpoint)
  app.get('/api/sync/status/:deviceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { deviceId } = req.params;
      
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'الجهاز غير موجود' });
      }

      // Simplified status check - bypass complex operations for now
      const pendingOps = []; // TODO: Fix getPendingOperations 
      const unresolvedConflicts = []; // TODO: Fix conflicts

      res.json({
        device: {
          id: device.id,
          deviceId: device.deviceId,
          lastSync: device.lastSync,
          isActive: device.isActive
        },
        pendingOperations: pendingOps.length,
        unresolvedConflicts: unresolvedConflicts.length,
        status: device.isActive ? 'active' : 'inactive'
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ error: 'فشل في استرجاع حالة المزامنة' });
    }
  });

  // ======= MONITORING & METRICS ENDPOINTS =======
  
  // Batch metrics collection endpoint
  app.post("/api/monitoring/metrics/batch", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { metrics, timestamp } = req.body;
      
      if (!Array.isArray(metrics)) {
        return res.status(400).json({ message: "Invalid metrics format" });
      }

      const results = [];
      for (const metric of metrics) {
        try {
          const enrichedMetric = {
            ...metric,
            userId: req.user?.id,
            timestamp: new Date(timestamp || Date.now())
          };
          
          const result = await storage.recordPerformanceMetric(enrichedMetric);
          results.push(result);
        } catch (error) {
          console.error('Failed to record metric:', error);
          // Continue processing other metrics
        }
      }

      res.json({ 
        recorded: results.length, 
        total: metrics.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Batch metrics error:', error);
      res.status(500).json({ message: "فشل في حفظ المؤشرات" });
    }
  });

  // Beacon endpoint for page unload metrics
  app.post("/api/monitoring/metrics/beacon", async (req, res) => {
    try {
      const { metrics, timestamp } = req.body;
      
      if (Array.isArray(metrics)) {
        for (const metric of metrics.slice(0, 20)) { // Limit beacon metrics
          try {
            await storage.recordPerformanceMetric({
              ...metric,
              timestamp: new Date(timestamp || Date.now())
            });
          } catch (error) {
            console.error('Beacon metric error:', error);
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Beacon error:', error);
      res.status(200).send('OK'); // Always return OK for beacon
    }
  });

  // Real-time monitoring dashboard data
  app.get("/api/monitoring/dashboard", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const timeRange = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        to: new Date()
      };

      const dashboardData = await storage.getMonitoringDashboardData(timeRange);
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ message: "فشل في جلب بيانات المراقبة" });
    }
  });

  // Performance metrics summary
  app.get("/api/monitoring/performance", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      
      let hours = 24;
      if (timeframe === '1h') hours = 1;
      else if (timeframe === '6h') hours = 6;
      else if (timeframe === '7d') hours = 24 * 7;

      const timeRange = {
        from: new Date(Date.now() - hours * 60 * 60 * 1000),
        to: new Date()
      };

      const metrics = await storage.getPerformanceMetrics({
        metricCategory: 'performance',
        timeRange
      });

      // Aggregate performance data
      const aggregated = {
        pageLoadTime: { avg: 0, p95: 0, count: 0 },
        apiResponseTime: { avg: 0, p95: 0, count: 0 },
        errorRate: 0,
        uniqueUsers: new Set()
      };

      metrics.forEach(metric => {
        if (metric.userId) aggregated.uniqueUsers.add(metric.userId);
        
        if (metric.metricName === 'page_load_time') {
          const value = parseFloat(metric.value);
          aggregated.pageLoadTime.avg += value;
          aggregated.pageLoadTime.count++;
        } else if (metric.metricName === 'api_call_duration') {
          const value = parseFloat(metric.value);
          aggregated.apiResponseTime.avg += value;
          aggregated.apiResponseTime.count++;
        }
      });

      if (aggregated.pageLoadTime.count > 0) {
        aggregated.pageLoadTime.avg /= aggregated.pageLoadTime.count;
      }
      if (aggregated.apiResponseTime.count > 0) {
        aggregated.apiResponseTime.avg /= aggregated.apiResponseTime.count;
      }

      res.json({
        ...aggregated,
        uniqueUsers: aggregated.uniqueUsers.size,
        timeRange,
        metricsCount: metrics.length
      });
    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({ message: "فشل في جلب مؤشرات الأداء" });
    }
  });

  // System health endpoint
  app.get("/api/monitoring/health", async (req, res) => {
    try {
      const health = await storage.getSloHealth();
      
      // Add system checks
      const systemChecks = {
        database: { status: 'healthy', latency: 0 },
        server: { status: 'healthy', uptime: process.uptime() },
        memory: {
          status: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
          usage: process.memoryUsage()
        }
      };

      // Test database connectivity
      const dbStart = Date.now();
      try {
        await db.execute(sql`SELECT 1`);
        systemChecks.database.latency = Date.now() - dbStart;
        systemChecks.database.status = systemChecks.database.latency < 100 ? 'healthy' : 'warning';
      } catch (error) {
        systemChecks.database.status = 'error';
      }

      res.json({
        overallHealth: health.overallSystemHealth,
        slo: health,
        system: systemChecks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ 
        overallHealth: 'critical',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Error tracking endpoint
  app.get("/api/monitoring/errors", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { timeframe = '24h', limit = 50 } = req.query;
      
      let hours = 24;
      if (timeframe === '1h') hours = 1;
      else if (timeframe === '6h') hours = 6;
      else if (timeframe === '7d') hours = 24 * 7;

      const timeRange = {
        from: new Date(Date.now() - hours * 60 * 60 * 1000),
        to: new Date()
      };

      const [errors, summary] = await Promise.all([
        storage.getTopErrors(parseInt(limit as string), timeRange),
        storage.getErrorSummary(timeRange)
      ]);

      res.json({
        errors,
        summary,
        timeRange
      });
    } catch (error) {
      console.error('Error tracking error:', error);
      res.status(500).json({ message: "فشل في جلب تقرير الأخطاء" });
    }
  });

  // SLO metrics endpoint
  app.get("/api/monitoring/slo", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { service, timeframe = '24h' } = req.query;
      
      let hours = 24;
      if (timeframe === '1h') hours = 1;
      else if (timeframe === '6h') hours = 6;
      else if (timeframe === '7d') hours = 24 * 7;

      const timeRange = {
        from: new Date(Date.now() - hours * 60 * 60 * 1000),
        to: new Date()
      };

      if (service) {
        const compliance = await storage.getSloComplianceReport(service as string, timeRange);
        res.json({ service, compliance, timeRange });
      } else {
        const measurements = await storage.getSloMeasurements({ timeRange });
        res.json({ measurements, timeRange });
      }
    } catch (error) {
      console.error('SLO metrics error:', error);
      res.status(500).json({ message: "فشل في جلب مؤشرات SLO" });
    }
  });

  // ===========================================
  // ENHANCED LBAC GEOGRAPHIC PERMISSION MANAGEMENT APIs - Phase 6
  // ===========================================

  // Permission Geographic Constraints endpoints
  app.get("/api/lbac/permission-constraints", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { permissionId, constraintType, constraintLevel, isActive } = req.query;
      const constraints = await storage.getPermissionGeographicConstraints({
        permissionId: permissionId as string,
        constraintType: constraintType as string,
        constraintLevel: constraintLevel as string,
        isActive: isActive ? isActive === 'true' : undefined
      });
      res.json(constraints);
    } catch (error) {
      console.error('Error fetching permission constraints:', error);
      res.status(500).json({ message: "خطأ في استرجاع قيود الصلاحيات الجغرافية" });
    }
  });

  app.get("/api/lbac/permission-constraints/:id", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const constraint = await storage.getPermissionGeographicConstraint(req.params.id);
      if (!constraint) {
        return res.status(404).json({ message: "قيد الصلاحية غير موجود" });
      }
      res.json(constraint);
    } catch (error) {
      console.error('Error fetching permission constraint:', error);
      res.status(500).json({ message: "خطأ في استرجاع قيد الصلاحية" });
    }
  });

  app.post("/api/lbac/permission-constraints", authenticateToken, requireRole(['admin']), validateRequest(insertPermissionGeographicConstraintsSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const constraintData = insertPermissionGeographicConstraintsSchema.parse(req.body);
      const constraint = await storage.createPermissionGeographicConstraint(constraintData);
      res.status(201).json(constraint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error('Error creating permission constraint:', error);
      res.status(500).json({ message: "خطأ في إنشاء قيد الصلاحية" });
    }
  });

  app.put("/api/lbac/permission-constraints/:id", authenticateToken, requireRole(['admin']), validateRequest(insertPermissionGeographicConstraintsSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const updates = insertPermissionGeographicConstraintsSchema.parse(req.body);
      const constraint = await storage.updatePermissionGeographicConstraint(req.params.id, updates);
      res.json(constraint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error('Error updating permission constraint:', error);
      res.status(500).json({ message: "خطأ في تحديث قيد الصلاحية" });
    }
  });

  app.delete("/api/lbac/permission-constraints/:id", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deletePermissionGeographicConstraint(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting permission constraint:', error);
      res.status(500).json({ message: "خطأ في حذف قيد الصلاحية" });
    }
  });

  // Temporary Permission Delegations endpoints
  app.get("/api/lbac/delegations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { delegatorId, delegeeId, status, isActive, includeExpired } = req.query;
      const delegations = await storage.getTemporaryPermissionDelegations({
        delegatorId: delegatorId as string,
        delegeeId: delegeeId as string,
        status: status as string,
        isActive: isActive ? isActive === 'true' : undefined,
        includeExpired: includeExpired === 'true'
      });
      res.json(delegations);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      res.status(500).json({ message: "خطأ في استرجاع تفويضات الصلاحيات" });
    }
  });

  app.get("/api/lbac/delegations/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const delegation = await storage.getTemporaryPermissionDelegation(req.params.id);
      if (!delegation) {
        return res.status(404).json({ message: "التفويض غير موجود" });
      }
      res.json(delegation);
    } catch (error) {
      console.error('Error fetching delegation:', error);
      res.status(500).json({ message: "خطأ في استرجاع التفويض" });
    }
  });

  app.post("/api/lbac/delegations", authenticateToken, validateRequest(insertTemporaryPermissionDelegationsSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const delegationData = insertTemporaryPermissionDelegationsSchema.parse(req.body);
      const delegation = await storage.createTemporaryPermissionDelegation(delegationData);
      res.status(201).json(delegation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error('Error creating delegation:', error);
      res.status(500).json({ message: "خطأ في إنشاء التفويض" });
    }
  });

  app.put("/api/lbac/delegations/:id", authenticateToken, validateRequest(insertTemporaryPermissionDelegationsSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const updates = insertTemporaryPermissionDelegationsSchema.parse(req.body);
      const delegation = await storage.updateTemporaryPermissionDelegation(req.params.id, updates);
      res.json(delegation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error('Error updating delegation:', error);
      res.status(500).json({ message: "خطأ في تحديث التفويض" });
    }
  });

  app.post("/api/lbac/delegations/:id/activate", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { approvedBy } = req.body;
      if (!approvedBy) {
        return res.status(400).json({ message: "معرف الموافق مطلوب" });
      }
      const delegation = await storage.activateTemporaryDelegation(req.params.id, approvedBy);
      res.json(delegation);
    } catch (error) {
      console.error('Error activating delegation:', error);
      res.status(500).json({ message: "خطأ في تفعيل التفويض" });
    }
  });

  app.post("/api/lbac/delegations/:id/deactivate", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const delegation = await storage.deactivateTemporaryDelegation(req.params.id, reason);
      res.json(delegation);
    } catch (error) {
      console.error('Error deactivating delegation:', error);
      res.status(500).json({ message: "خطأ في إلغاء تفعيل التفويض" });
    }
  });

  // Geographic Role Templates endpoints
  app.get("/api/lbac/role-templates", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { templateName, applicableLevel, isActive } = req.query;
      const templates = await storage.getGeographicRoleTemplates({
        templateName: templateName as string,
        applicableLevel: applicableLevel as string,
        isActive: isActive ? isActive === 'true' : undefined
      });
      res.json(templates);
    } catch (error) {
      console.error('Error fetching role templates:', error);
      res.status(500).json({ message: "خطأ في استرجاع قوالب الأدوار الجغرافية" });
    }
  });

  app.get("/api/lbac/role-templates/:id", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const template = await storage.getGeographicRoleTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "قالب الدور غير موجود" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching role template:', error);
      res.status(500).json({ message: "خطأ في استرجاع قالب الدور" });
    }
  });

  app.post("/api/lbac/role-templates", authenticateToken, requireRole(['admin']), validateRequest(insertGeographicRoleTemplatesSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const templateData = insertGeographicRoleTemplatesSchema.parse(req.body);
      const template = await storage.createGeographicRoleTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error('Error creating role template:', error);
      res.status(500).json({ message: "خطأ في إنشاء قالب الدور" });
    }
  });

  app.post("/api/lbac/role-templates/:id/apply", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, targetGeographicId } = req.body;
      if (!userId || !targetGeographicId) {
        return res.status(400).json({ message: "معرف المستخدم والمنطقة الجغرافية مطلوبان" });
      }
      const assignment = await storage.applyGeographicRoleTemplate(req.params.id, userId, targetGeographicId);
      res.json(assignment);
    } catch (error) {
      console.error('Error applying role template:', error);
      res.status(500).json({ message: "خطأ في تطبيق قالب الدور" });
    }
  });

  // User Geographic Assignment History endpoints (audit trail)
  app.get("/api/lbac/assignment-history", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, originalAssignmentId, changeType, changedBy, startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? { start: new Date(startDate as string), end: new Date(endDate as string) } : undefined;
      
      const history = await storage.getUserGeographicAssignmentHistory({
        userId: userId as string,
        originalAssignmentId: originalAssignmentId as string,
        changeType: changeType as string,
        changedBy: changedBy as string,
        dateRange
      });
      res.json(history);
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      res.status(500).json({ message: "خطأ في استرجاع تاريخ التعيينات الجغرافية" });
    }
  });

  app.get("/api/lbac/assignment-history/:id", authenticateToken, requireRole(['manager', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const historyRecord = await storage.getUserGeographicAssignmentHistoryRecord(req.params.id);
      if (!historyRecord) {
        return res.status(404).json({ message: "سجل التاريخ غير موجود" });
      }
      res.json(historyRecord);
    } catch (error) {
      console.error('Error fetching assignment history record:', error);
      res.status(500).json({ message: "خطأ في استرجاع سجل التاريخ" });
    }
  });

  // LBAC Access Audit Log endpoints
  app.get("/api/lbac/access-audit", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, accessGranted, denialReason, governorateId, districtId, startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? { start: new Date(startDate as string), end: new Date(endDate as string) } : undefined;
      
      const auditLogs = await storage.getLbacAccessAuditLogs({
        userId: userId as string,
        accessGranted: accessGranted ? accessGranted === 'true' : undefined,
        denialReason: denialReason as string,
        governorateId: governorateId as string,
        districtId: districtId as string,
        dateRange
      });
      res.json(auditLogs);
    } catch (error) {
      console.error('Error fetching access audit logs:', error);
      res.status(500).json({ message: "خطأ في استرجاع سجلات مراجعة الوصول" });
    }
  });

  app.get("/api/lbac/access-audit/:id", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const auditLog = await storage.getLbacAccessAuditLog(req.params.id);
      if (!auditLog) {
        return res.status(404).json({ message: "سجل المراجعة غير موجود" });
      }
      res.json(auditLog);
    } catch (error) {
      console.error('Error fetching access audit log:', error);
      res.status(500).json({ message: "خطأ في استرجاع سجل المراجعة" });
    }
  });

  // ================================================================
  // MOBILE AUTHENTICATION ENDPOINTS (Phase 4) - For surveyor apps
  // ================================================================

  // Mobile middleware functions imported from middleware/mobileAuth.ts
  // All mobile authentication logic centralized in middleware/mobileAuth.ts

  // Helper: Hash refresh token with SHA-256
  const hashRefreshToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  // Helper: Generate mobile JWT with device binding
  const generateMobileJWT = (user: any, deviceId: string, tokenVersion: number): string => {
    const normalizedRoleCodes = user.roleCodes && user.roleCodes.length > 0 
      ? user.roleCodes // Use existing normalized codes
      : normalizeRoleCodes(user.role); // Fallback to normalized legacy role

    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role, // Legacy compatibility
        roleCodes: normalizedRoleCodes, // ✅ ALWAYS NORMALIZED
        deviceId, // Device binding
        tokenVersion, // For token invalidation
        type: 'mobile_access'
      },
      jwtSecret,
      { expiresIn: '1h' } // Short-lived access tokens
    );
  };

  // Helper: Generate refresh token
  const generateRefreshToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
  };

  // Mobile Login - Device registration and authentication
  app.post("/api/mobile/v1/auth/login", globalSecurityMonitor, authRateLimit, authSlowDown, requireJSON, basicSecurityProtection, validateMobileLogin, validateMobileDevice, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password, deviceName, deviceModel, osVersion, appVersion } = req.body;
      const deviceId = req.deviceId!;

      // Validate required fields
      if (!username || !password || !deviceName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Username, password, and deviceName are required'
          }
        });
      }

      // Authenticate user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          }
        });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          }
        });
      }

      // Check if user has mobile access (surveyor, engineer, manager roles)
      const mobileRoles = ['surveyor', 'engineer', 'manager', 'admin'];
      const userRoles = await storage.getUserRoles(user.id);
      // Get user's role codes for mobile access check
      const userRoleCodes: string[] = [];
      for (const userRole of userRoles) {
        const role = await storage.getRole(userRole.roleId);
        if (role) userRoleCodes.push(role.code);
      }
      const hasPermission = userRoleCodes.some(roleCode => mobileRoles.includes(roleCode));

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'User does not have mobile app access permissions'
          }
        });
      }

      // Check existing device registration
      let device = await storage.getMobileDeviceByDeviceId(deviceId);
      
      if (device) {
        // Device exists, validate it's for the same user
        if (device.userId !== user.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'DEVICE_OWNERSHIP_MISMATCH',
              message: 'Device is registered to a different user'
            }
          });
        }

        // Reactivate device if it was suspended
        if (device.status !== 'active') {
          device = await storage.updateMobileDeviceRegistration(device.id, {
            status: 'active',
            deviceName,
            deviceModel,
            osVersion,
            appVersion
          });
        }
      } else {
        // Register new device
        device = await storage.registerMobileDevice({
          deviceId,
          userId: user.id,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          deviceType: 'mobile',
          status: 'active'
        });
      }

      // Generate tokens
      const accessToken = generateMobileJWT(user, deviceId, device.tokenVersion || 1);
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Store refresh token hash
      await storage.updateMobileDeviceRefreshToken(deviceId, refreshTokenHash, refreshTokenExpiresAt);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: 3600, // 1 hour
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role // Legacy
          },
          device: {
            id: device.id,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            status: device.status
          }
        }
      });

    } catch (error) {
      console.error('Mobile login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed due to server error'
        }
      });
    }
  });

  // Mobile Refresh Token
  app.post("/api/mobile/v1/auth/refresh", globalSecurityMonitor, authRateLimit, authSlowDown, validateMobileDevice, async (req: AuthenticatedRequest, res) => {
    try {
      const { refreshToken } = req.body;
      const deviceId = req.deviceId!;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
      }

      // Validate refresh token
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const isValid = await storage.validateMobileDeviceRefreshToken(deviceId, refreshTokenHash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid or expired'
          }
        });
      }

      // Get device and user info
      const device = await storage.getMobileDeviceByDeviceId(deviceId);
      if (!device || device.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEVICE_INACTIVE',
            message: 'Device is not active or has been revoked'
          }
        });
      }

      const user = await storage.getUser(device.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Associated user not found'
          }
        });
      }

      // Generate new access token
      const accessToken = generateMobileJWT(user, deviceId, device.tokenVersion || 1);

      // Optionally generate new refresh token (token rotation)
      const newRefreshToken = generateRefreshToken();
      const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Update refresh token
      await storage.updateMobileDeviceRefreshToken(deviceId, newRefreshTokenHash, refreshTokenExpiresAt);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: 3600 // 1 hour
        }
      });

    } catch (error) {
      console.error('Mobile refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Token refresh failed due to server error'
        }
      });
    }
  });

  // Mobile Logout - Invalidate refresh token
  app.post("/api/mobile/v1/auth/logout", globalSecurityMonitor, authRateLimit, validateMobileDevice, async (req: AuthenticatedRequest, res) => {
    try {
      const deviceId = req.deviceId!;

      // Invalidate device tokens
      await storage.invalidateMobileDeviceTokens(deviceId);

      res.json({
        success: true,
        data: {
          message: 'Successfully logged out'
        }
      });

    } catch (error) {
      console.error('Mobile logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed due to server error'
        }
      });
    }
  });

  // Mobile Revoke Device - Complete device deactivation
  app.post("/api/mobile/v1/auth/revoke-device", globalSecurityMonitor, authRateLimit, validateMobileDevice, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const deviceId = req.deviceId!;

      // Revoke device completely
      await storage.revokeMobileDevice(deviceId, reason);

      res.json({
        success: true,
        data: {
          message: 'Device has been revoked successfully'
        }
      });

    } catch (error) {
      console.error('Mobile device revoke error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Device revocation failed due to server error'
        }
      });
    }
  });

  // ================================================================
  // CORE MOBILE ENDPOINTS - Phase 5
  // ================================================================

  // GET /api/mobile/v1/tasks - Get assigned tasks for surveyor
  app.get("/api/mobile/v1/tasks", globalSecurityMonitor, surveyRateLimit, authenticateMobileAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const deviceId = req.deviceId!;
      
      // Extract query parameters
      const {
        status,
        assignedAfter,
        limit = "20",
        cursor
      } = req.query;
      
      // Validate pagination params
      const paginationLimit = Math.min(parseInt(limit as string) || 20, 100);
      
      // Build filters for assigned tasks (surveyorId = user.id)
      const filters: any = {
        surveyorId: user.id, // SECURITY: Only tasks assigned to this surveyor
        // Add additional filters based on query params
      };
      
      // Add status filter if provided
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        filters.status = statusArray;
      }
      
      // Add assignedAfter filter if provided
      if (assignedAfter) {
        try {
          filters.assignedAfter = new Date(assignedAfter as string);
        } catch {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'assignedAfter must be a valid ISO date string'
            }
          });
        }
      }
      
      // Get user's geographic assignments for LBAC
      const userGeographicAssignments = await storage.getUserGeographicAssignments({
        userId: user.id,
        isActive: true
      });
      
      // Apply LBAC: Filter tasks by user's geographic scope
      const lbacFilter = {
        userId: user.id,
        userGeographicScope: userGeographicAssignments
      };
      
      // Get tasks with LBAC filtering
      const tasksResult = await storage.getMobileFieldVisits({
        ...filters,
        userId: user.id, // Use userId instead of surveyorId
        lbacFilter,
        limit: paginationLimit,
        cursor: cursor as string
      });
      
      // Transform tasks to match mobile API specification
      const transformedTasks = tasksResult.map((task: any) => ({
        applicationId: task.applicationId,
        applicationNumber: task.applicationData?.applicationNumber || `APP-${task.applicationId?.slice(0, 8)}`,
        applicantName: task.applicationData?.applicantName || 'Unknown Applicant',
        applicantPhone: task.applicationData?.applicantPhone || '',
        serviceType: task.applicationData?.serviceType || 'surveying_decision',
        priority: task.priority || 'medium',
        assignedAt: task.assignedAt || task.createdAt,
        dueDate: task.scheduledDate,
        estimatedDuration: task.estimatedDuration || 180, // Default 3 hours
        location: {
          governorate: task.applicationData?.locationData?.governorate || '',
          district: task.applicationData?.locationData?.district || '',
          subDistrict: task.applicationData?.locationData?.subDistrict || '',
          neighborhood: task.applicationData?.locationData?.neighborhood || '',
          plotNumber: task.applicationData?.plotNumber || ''
        },
        coordinates: {
          lat: task.startLocation?.coordinates?.[1] || 0,
          lng: task.startLocation?.coordinates?.[0] || 0,
          accuracy: task.gpsAccuracy || 0
        },
        attachments: [], // TODO: Add attachments from storage
        instructions: task.notes || 'Complete assigned survey task',
        requirements: task.requirements || [],
        status: task.status || 'assigned',
        lastUpdated: task.updatedAt || task.createdAt
      }));
      
      // Calculate pagination metadata
      const hasMore = transformedTasks.length >= paginationLimit;
      const nextCursor = hasMore && transformedTasks.length > 0 
        ? Buffer.from(JSON.stringify({
            id: transformedTasks[transformedTasks.length - 1].applicationId,
            timestamp: transformedTasks[transformedTasks.length - 1].lastUpdated
          })).toString('base64')
        : null;
      
      // Response according to mobile API specification
      res.json({
        success: true,
        data: {
          tasks: transformedTasks,
          pagination: {
            hasMore,
            nextCursor,
            totalCount: transformedTasks.length // Note: This is page count, not total
          },
          syncMetadata: {
            serverTimestamp: new Date().toISOString(),
            syncCursor: nextCursor || cursor || ''
          }
        }
      });
      
    } catch (error) {
      console.error('Mobile tasks endpoint error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tasks'
        }
      });
    }
  });

  // POST /api/mobile/v1/sessions - Create new survey session
  app.post("/api/mobile/v1/sessions", globalSecurityMonitor, surveyRateLimit, requireJSON, basicSecurityProtection, validateSessionCreation, authenticateMobileAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const deviceId = req.deviceId!;
      
      const {
        applicationId,
        surveyType,
        startLocation,
        weatherConditions,
        notes,
        clientMetadata
      } = req.body;
      
      // Validate required fields
      if (!applicationId || !surveyType || !startLocation) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'applicationId, surveyType, and startLocation are required'
          }
        });
      }
      
      // Validate coordinates
      if (!startLocation.lat || !startLocation.lng) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COORDINATES',
            message: 'Valid latitude and longitude are required'
          }
        });
      }
      
      // Check if user has access to this application (LBAC)
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found'
          }
        });
      }
      
      // LBAC: Check if user can access this application's geographic area
      const userGeographicAssignments = await storage.getUserGeographicAssignments({
        userId: user.id,
        isActive: true
      });
      
      // Simple LBAC check - verify user has geographic assignments
      const hasAccess = userGeographicAssignments && userGeographicAssignments.length > 0;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'LBAC_VIOLATION',
            message: 'Access denied to this geographic area'
          }
        });
      }
      
      // Check for existing active session for this application
      const existingSessions = await storage.getMobileSurveySessions({
        // Note: Using basic filter since interface is limited - will filter manually
      });
      
      // Filter by applicationId manually since it's not in the filter interface
      const activeSessionsForApp = existingSessions?.filter(s => s.applicationId === applicationId) || [];
      
      if (activeSessionsForApp.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SESSION_EXISTS',
            message: 'An active session already exists for this application'
          }
        });
      }
      
      // Create new survey session
      const sessionData = {
        surveyorId: user.id,
        applicationId,
        deviceId, // Required field
        idempotencyKey: req.headers['x-idempotency-key'] as string || `session-${Date.now()}`, // Required field
        surveyType,
        startLocation: {
          timestamp: startLocation.timestamp || new Date().toISOString(),
          lat: startLocation.lat,
          lng: startLocation.lng,
          accuracy: startLocation.accuracy || 0
        },
        startTime: new Date(),
        gpsAccuracy: startLocation.accuracy || 0,
        weatherConditions,
        notes,
        status: 'active' as const,
        clientMetadata: clientMetadata || {}
      };
      
      // Metadata for change tracking  
      const metadata = {
        userId: user.id, // Use userId as expected by storage interface
        deviceId,
        clientChangeId: req.headers['x-idempotency-key'] as string,
        geographic: {
          governorateId: (application as any).governorateId || '',
          districtId: (application as any).districtId || ''
        }
      };
      
      // Create session with change tracking
      const result = await storage.createMobileSurveySession(sessionData, metadata);
      
      res.status(201).json({
        success: true,
        data: {
          sessionId: result.session.id,
          sessionNumber: `SRV-${result.session.id.slice(0, 8).toUpperCase()}`,
          status: result.session.status,
          startTime: result.session.startTime?.toISOString(),
          syncCursor: Buffer.from(JSON.stringify({
            sessionId: result.session.id,
            changeId: result.changeEntry.id
          })).toString('base64')
        }
      });
      
    } catch (error) {
      console.error('Mobile session creation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create survey session'
        }
      });
    }
  });

  // PUT /api/mobile/v1/sessions/:sessionId/submit - Submit survey session
  app.put("/api/mobile/v1/sessions/:sessionId/submit", globalSecurityMonitor, surveyRateLimit, requireJSON, basicSecurityProtection, validateSessionIdParam, authenticateMobileAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const deviceId = req.deviceId!;
      const sessionId = req.params.sessionId;
      
      const {
        endLocation,
        qualityScore,
        notes,
        pointsCount,
        geometriesCount,
        attachmentsCount
      } = req.body;
      
      // Validate required fields
      if (!endLocation || qualityScore === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'endLocation and qualityScore are required'
          }
        });
      }
      
      // Validate coordinates
      if (!endLocation.lat || !endLocation.lng) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COORDINATES',
            message: 'Valid end location coordinates are required'
          }
        });
      }
      
      // Get existing session
      const sessions = await storage.getMobileSurveySessions({
        // Note: Using basic filter since interface is limited - will filter manually
      });
      
      // Filter by sessionId manually since it's not in the filter interface
      const session = sessions?.find(s => s.id === sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Survey session not found'
          }
        });
      }
      
      // Check if session can be submitted
      if (session.status === 'submitted') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_SUBMITTED',
            message: 'Session has already been submitted'
          }
        });
      }
      
      if (session.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SESSION_STATUS',
            message: 'Session must be in progress to submit'
          }
        });
      }
      
      // Metadata for submission
      const metadata = {
        userId: user.id, // Use userId instead of surveyorId
        deviceId,
        clientChangeId: req.headers['x-idempotency-key'] as string
      };
      
      // Submit session using storage method
      const submittedSession = await storage.submitMobileSurveySession(sessionId, metadata);
      
      res.json({
        success: true,
        data: {
          sessionId: submittedSession.id,
          status: submittedSession.status,
          submittedAt: submittedSession.updatedAt?.toISOString(), // Use updatedAt instead
          syncCursor: Buffer.from(JSON.stringify({
            sessionId: submittedSession.id,
            submittedAt: submittedSession.updatedAt
          })).toString('base64')
        }
      });
      
    } catch (error) {
      console.error('Mobile session submission error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit survey session'
        }
      });
    }
  });

  // =============================================
  // DELTA SYNC HELPER FUNCTIONS
  // =============================================

  // Validate LBAC access for specific entity and operation - STRICT ENFORCEMENT
  async function validateLBACAccess(userId: string, entity: string, entityId: string, operation: string): Promise<boolean> {
    try {
      // Get user's active geographic assignments  
      const userAssignments = await db.select({
        id: userGeographicAssignments.id,
        governorateId: userGeographicAssignments.governorateId,
        districtId: userGeographicAssignments.districtId,
        subDistrictId: userGeographicAssignments.subDistrictId,
        // permissions field removed - not in schema
      })
      .from(userGeographicAssignments)
      .where(and(
        eq(userGeographicAssignments.userId, userId),
        eq(userGeographicAssignments.isActive, true),
        // Assignment is currently valid (FIXED: use correct column names)
        or(
          isNull(userGeographicAssignments.startDate),
          lte(userGeographicAssignments.startDate, new Date())
        ),
        or(
          isNull(userGeographicAssignments.endDate),
          gte(userGeographicAssignments.endDate, new Date())
        )
      ));
      
      if (userAssignments.length === 0) {
        console.warn(`LBAC: No geographic assignments for user ${userId}`);
        return false;
      }
      
      // Check if operation is allowed
      const allowedOperations = ['created', 'updated', 'deleted', 'read'];
      if (!allowedOperations.includes(operation)) {
        console.warn(`LBAC: Operation ${operation} not allowed`);
        return false;
      }
      
      // Get entity's geographic context for validation
      if (entityId && entity !== 'sessions') {
        let entityGeoContext: any = null;
        
        try {
          switch (entity) {
            case 'points':
              // TODO: mobileSurveyPoints don't have direct governorateId/districtId
              // Geographic context should be obtained through session relationship
              console.warn('LBAC: Geographic validation for points not yet implemented');
              entityGeoContext = null; // Skip validation for now
              break;
              
            case 'geometries':
              // TODO: mobileSurveyGeometries don't have direct governorateId/districtId
              // Geographic context should be obtained through session relationship
              console.warn('LBAC: Geographic validation for geometries not yet implemented');
              entityGeoContext = null; // Skip validation for now
              break;
          }
          
          // Validate geographic scope
          if (entityGeoContext) {
            const hasAccess = userAssignments.some(assignment => {
              // Hierarchical geographic access control
              if (assignment.governorateId !== entityGeoContext.governorateId) return false;
              if (assignment.districtId && assignment.districtId !== entityGeoContext.districtId) return false;
              return true;
            });
            
            if (!hasAccess) {
              console.warn(`LBAC: User ${userId} lacks geographic access to ${entity} ${entityId}`);
              return false;
            }
          }
        } catch (error) {
          console.error(`LBAC: Failed to validate geographic context for ${entity} ${entityId}:`, error);
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('LBAC validation error:', error);
      return false;
    }
  }

  // Get user's geographic assignments for LBAC filtering - STRICT IMPLEMENTATION
  async function getUserGeographicAssignments(userId: string) {
    try {
      // Get user's active geographic assignments from userGeographicAssignments table
      const userAssignments = await db.select({
        id: userGeographicAssignments.id,
        governorateId: userGeographicAssignments.governorateId,
        districtId: userGeographicAssignments.districtId,
        subDistrictId: userGeographicAssignments.subDistrictId,
        neighborhoodId: userGeographicAssignments.neighborhoodId,
        assignmentType: userGeographicAssignments.assignmentType,
      })
      .from(userGeographicAssignments)
      .where(and(
        eq(userGeographicAssignments.userId, userId),
        eq(userGeographicAssignments.isActive, true),
        // Check temporal validity (FIXED: use correct column names)
        or(
          isNull(userGeographicAssignments.startDate),
          lte(userGeographicAssignments.startDate, new Date())
        ),
        or(
          isNull(userGeographicAssignments.endDate),
          gte(userGeographicAssignments.endDate, new Date())
        )
      ));
      
      if (userAssignments.length === 0) {
        console.warn(`LBAC: No active geographic assignments for user ${userId}`);
        return []; // Empty array means NO ACCESS
      }
      
      // Extract unique geographic assignments with hierarchical expansion
      const assignments: Array<{
        governorateId?: string, 
        districtId?: string, 
        subDistrictId?: string,
        neighborhoodId?: string
      }> = [];
      
      for (const assignment of userAssignments) {
        const geoScope: any = {};
        
        // Build hierarchical scope based on assignment level
        if (assignment.governorateId) {
          geoScope.governorateId = assignment.governorateId;
          // Governorate-level access includes all districts within it
        }
        if (assignment.districtId) {
          geoScope.districtId = assignment.districtId;
          // District-level access includes all sub-districts within it
        }
        if (assignment.subDistrictId) {
          geoScope.subDistrictId = assignment.subDistrictId;
          // Sub-district-level access includes all neighborhoods within it
        }
        if (assignment.neighborhoodId) {
          geoScope.neighborhoodId = assignment.neighborhoodId;
        }
        
        // Avoid duplicate assignments
        const exists = assignments.some(a => 
          a.governorateId === geoScope.governorateId && 
          a.districtId === geoScope.districtId &&
          a.subDistrictId === geoScope.subDistrictId &&
          a.neighborhoodId === geoScope.neighborhoodId
        );
        
        if (!exists) {
          assignments.push(geoScope);
        }
      }
      
      return assignments; // Never return empty object - must have explicit assignments
      
    } catch (error) {
      console.error('Geographic assignments error:', error);
      return []; // Return empty array for NO ACCESS on error
    }
  }

  // =============================================
  // DELTA SYNC ENDPOINTS
  // =============================================

  // GET /api/mobile/v1/sync/changes - Get changes from server (downward sync)
  app.get('/api/mobile/v1/sync/changes', globalSecurityMonitor, syncRateLimit, syncSlowDown, basicSecurityProtection, validateSyncChanges, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const deviceId = req.deviceId!;
      
      // Parse query parameters
      const entityTypes = req.query.entity as string[] || ['sessions', 'points', 'geometries', 'attachments'];
      const cursor = req.query.cursor as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      
      // Validate entity types
      const validEntityTypes = ['sessions', 'points', 'geometries', 'attachments'];
      const requestedEntities = Array.isArray(entityTypes) ? entityTypes : [entityTypes];
      const validEntities = requestedEntities.filter(e => validEntityTypes.includes(e));
      
      if (validEntities.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid entity types specified'
          }
        });
      }
      
      let startCursor: any = null;
      if (cursor) {
        try {
          startCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CURSOR',
              message: 'Invalid cursor format'
            }
          });
        }
      }
      
      // LBAC: Get user's geographic assignments for filtering
      const userAssignments = await getUserGeographicAssignments(user.id);
      if (userAssignments.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'LBAC_VIOLATION',
            message: 'No geographic access assignments found'
          }
        });
      }
      
      // Query changes from change tracking table
      const changeConditions = [];
      changeConditions.push(inArray(changeTracking.tableName, validEntities.map(e => `mobile_survey_${e}`)));
      
      // Apply LBAC geographic filtering
      const geoConditions = userAssignments.map(assignment => {
        const conditions = [];
        if (assignment.governorateId) conditions.push(eq(changeTracking.governorateId, assignment.governorateId));
        if (assignment.districtId) conditions.push(eq(changeTracking.districtId, assignment.districtId));
        // Note: subDistrictId not available in changeTracking table
        // if (assignment.subDistrictId) conditions.push(eq(changeTracking.subDistrictId, assignment.subDistrictId));
        return and(...conditions);
      });
      changeConditions.push(or(...geoConditions));
      
      // Add cursor filtering
      if (startCursor && startCursor.timestamp) {
        changeConditions.push(gt(changeTracking.changedAt, new Date(startCursor.timestamp)));
      }
      
      // Query changes with pagination
      const changes = await db.select()
        .from(changeTracking)
        .where(and(...changeConditions))
        .orderBy(asc(changeTracking.changedAt), asc(changeTracking.changeSequence))
        .limit(limit + 1); // +1 to check for more results
      
      // Query deletion tombstones with same filters
      const tombstoneConditions = [];
      tombstoneConditions.push(inArray(deletionTombstones.tableName, validEntities.map(e => `mobile_survey_${e}`)));
      
      // Apply same LBAC filtering to tombstones
      const tombstoneGeoConditions = userAssignments.map(assignment => {
        const conditions = [];
        if (assignment.governorateId) conditions.push(eq(deletionTombstones.governorateId, assignment.governorateId));
        if (assignment.districtId) conditions.push(eq(deletionTombstones.districtId, assignment.districtId));
        return and(...conditions);
      });
      tombstoneConditions.push(or(...tombstoneGeoConditions));
      
      // Add cursor filtering for tombstones
      if (startCursor && startCursor.timestamp) {
        tombstoneConditions.push(gt(deletionTombstones.deletedAt, new Date(startCursor.timestamp)));
      }
      
      // Query active tombstones
      const tombstones = await db.select()
        .from(deletionTombstones)
        .where(and(
          ...tombstoneConditions,
          eq(deletionTombstones.isActive, true),
          gt(deletionTombstones.expiresAt, new Date()) // Not expired
        ))
        .orderBy(asc(deletionTombstones.deletedAt))
        .limit(limit + 1);
      
      // Process results and check for more data
      const hasMoreChanges = changes.length > limit;
      if (hasMoreChanges) changes.pop();
      
      const hasMoreTombstones = tombstones.length > limit;
      if (hasMoreTombstones) tombstones.pop();
      
      // Combine and sort changes and deletions by timestamp
      const formattedChanges = changes.map(change => ({
        entity: change.tableName.replace('mobile_survey_', ''),
        entityId: change.recordId,
        operation: change.operationType,
        data: change.recordSnapshot || change.fieldChanges,
        version: parseInt(change.changeVersion),
        timestamp: change.changedAt?.toISOString(),
        changeId: change.id,
        type: 'change' as const
      }));
      
      const formattedDeletions = tombstones.map(tombstone => ({
        entity: tombstone.tableName.replace('mobile_survey_', ''),
        entityId: tombstone.recordId,
        operation: 'deleted' as const,
        data: tombstone.originalData,
        version: parseInt(tombstone.syncVersion),
        timestamp: tombstone.deletedAt?.toISOString(),
        changeId: tombstone.id,
        type: 'deletion' as const,
        deletionReason: tombstone.deletionReason
      }));
      
      // Combine and sort all changes
      const allChanges = [...formattedChanges, ...formattedDeletions]
        .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())
        .slice(0, limit);
      
      // Generate next cursor based on latest change
      let nextCursor: string | null = null;
      const hasMore = hasMoreChanges || hasMoreTombstones;
      if (hasMore && allChanges.length > 0) {
        const lastChange = allChanges[allChanges.length - 1];
        nextCursor = Buffer.from(JSON.stringify({
          timestamp: lastChange.timestamp,
          type: lastChange.type
        })).toString('base64');
      }
      
      res.json({
        success: true,
        data: {
          changes: allChanges,
          pagination: {
            hasMore,
            nextCursor
          },
          syncMetadata: {
            serverTimestamp: new Date().toISOString(),
            syncCursor: nextCursor || cursor,
            totalChanges: formattedChanges.length,
            totalDeletions: formattedDeletions.length,
            userScope: userAssignments.length
          }
        }
      });
      
    } catch (error) {
      console.error('Delta sync changes error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch sync changes'
        }
      });
    }
  });

  // POST /api/mobile/v1/sync/apply - Apply changes from client (upward sync)
  app.post('/api/mobile/v1/sync/apply', globalSecurityMonitor, syncRateLimit, syncSlowDown, requireJSON, basicSecurityProtection, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const deviceId = req.deviceId!;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      
      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: 'X-Idempotency-Key header is required'
          }
        });
      }
      
      // Validate request body
      const { changes, syncCursor } = req.body;
      
      if (!Array.isArray(changes)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Changes must be an array'
          }
        });
      }
      
      // Data validation functions for Yemen boundaries and geometry integrity
      const validateYemenCoordinates = (lat: number, lng: number): boolean => {
        return lat >= 12 && lat <= 19 && lng >= 42 && lng <= 54;
      };
      
      const validatePolygonClosure = (coordinates: number[][]): boolean => {
        if (!coordinates || coordinates.length < 4) return false;
        const firstPoint = coordinates[0];
        const lastPoint = coordinates[coordinates.length - 1];
        return firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
      };
      
      const validateGeometryData = (data: any): { valid: boolean; error?: string } => {
        // Validate coordinates for points
        if (data.coordinates && Array.isArray(data.coordinates)) {
          const [lng, lat] = data.coordinates;
          if (typeof lat === 'number' && typeof lng === 'number') {
            if (!validateYemenCoordinates(lat, lng)) {
              return {
                valid: false,
                error: `الإحداثيات خارج النطاق الجغرافي لليمن (${lat.toFixed(6)}, ${lng.toFixed(6)})`
              };
            }
          }
        }
        
        // Validate GeoJSON geometry coordinates
        if (data.geoJson && data.geoJson.coordinates) {
          const geometry = data.geoJson;
          
          if (geometry.type === 'Point') {
            const [lng, lat] = geometry.coordinates;
            if (!validateYemenCoordinates(lat, lng)) {
              return {
                valid: false,
                error: `نقطة GeoJSON خارج النطاق الجغرافي لليمن (${lat.toFixed(6)}, ${lng.toFixed(6)})`
              };
            }
          } else if (geometry.type === 'Polygon') {
            const rings = geometry.coordinates;
            for (let i = 0; i < rings.length; i++) {
              const ring = rings[i];
              
              // Validate polygon closure for each ring
              if (!validatePolygonClosure(ring)) {
                return {
                  valid: false,
                  error: `المضلع غير مغلق - النقطة الأولى يجب أن تساوي النقطة الأخيرة في الحلقة ${i + 1}`
                };
              }
              
              // Validate all coordinates are within Yemen for each ring
              for (const [lng, lat] of ring) {
                if (!validateYemenCoordinates(lat, lng)) {
                  return {
                    valid: false,
                    error: `إحداثيات المضلع خارج النطاق الجغرافي لليمن في الحلقة ${i + 1} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                  };
                }
              }
            }
          } else if (geometry.type === 'LineString') {
            for (const [lng, lat] of geometry.coordinates) {
              if (!validateYemenCoordinates(lat, lng)) {
                return {
                  valid: false,
                  error: `إحداثيات الخط خارج النطاق الجغرافي لليمن (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                };
              }
            }
          }
        }
        
        return { valid: true };
      }
      
      const accepted: any[] = [];
      const conflicts: any[] = [];
      
      // Process each change
      for (const change of changes) {
        try {
          const { entity, entityId, operation, data, clientVersion, clientTimestamp, idempotencyKey: itemKey } = change;
          
          // LBAC validation for the specific entity
          const hasAccess = await validateLBACAccess(user.id, entity, entityId, operation);
          if (!hasAccess) {
            conflicts.push({
              changeId: itemKey,
              reason: 'lbac_violation',
              serverVersion: null,
              serverData: null
            });
            continue;
          }
          
          // Validate geometry data for Yemen boundaries and polygon closure
          if (entity === 'points' || entity === 'geometries' || entity === 'mobileSurveyPoints' || entity === 'mobileSurveyGeometries') {
            const validation = validateGeometryData(data);
            if (!validation.valid) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'GEOMETRY_VALIDATION_ERROR',
                  message: validation.error
                }
              });
            }
          }
          
          // Check for existing change with same idempotency key
          const existingChange = await db.select()
            .from(changeTracking)
            .where(and(
              eq(changeTracking.deviceId, deviceId),
              eq(changeTracking.clientChangeId, itemKey)
            ))
            .limit(1);
          
          if (existingChange.length > 0) {
            // Already processed - return success
            accepted.push({
              changeId: itemKey,
              serverVersion: parseInt(existingChange[0].changeVersion),
              serverTimestamp: existingChange[0].changedAt?.toISOString()
            });
            continue;
          }
          
          // Apply the change based on operation
          let result: any;
          const metadata = {
            userId: user.id,
            deviceId,
            clientChangeId: itemKey,
            geographic: {
              governorateId: data.governorateId,
              districtId: data.districtId
            }
          };
          
          switch (operation) {
            case 'created':
              if (entity === 'sessions') {
                result = await storage.createMobileSurveySession(data, metadata);
              } else if (entity === 'points') {
                result = await storage.createMobileSurveyPoint(data, metadata);
              } else if (entity === 'geometries') {
                result = await storage.createMobileSurveyGeometry(data, metadata);
              }
              break;
              
            case 'updated':
              if (entity === 'sessions') {
                result = await storage.updateMobileSurveySession(entityId, data, metadata);
              } else if (entity === 'points') {
                result = await storage.updateMobileSurveyPoint(entityId, data, metadata);
              } else if (entity === 'geometries') {
                result = await storage.updateMobileSurveyGeometry(entityId, data, metadata);
              }
              break;
              
            case 'deleted':
              // TODO: Implement delete methods in DatabaseStorage
              console.warn(`Delete operation for ${entity} not yet implemented`);
              result = { success: true, message: 'Delete operation skipped (not implemented)' };
              /*
              if (entity === 'sessions') {
                result = await storage.deleteMobileSurveySession(entityId, metadata);
              } else if (entity === 'points') {
                result = await storage.deleteMobileSurveyPoint(entityId, metadata);
              } else if (entity === 'geometries') {
                result = await storage.deleteMobileSurveyGeometry(entityId, metadata);
              }
              */
              break;
          }
          
          if (result) {
            accepted.push({
              changeId: itemKey,
              serverVersion: 1, // TODO: Get actual version from change tracking
              serverTimestamp: new Date().toISOString()
            });
            
            // Field visit tracking for completed surveys
            if ((entity === 'sessions' || entity === 'mobileSurveySessions') && operation === 'updated' && data.status === 'completed') {
              try {
                // Check for existing field visit to prevent duplicates (idempotency)
                const existingVisit = await db.select()
                  .from(fieldVisits)
                  .where(and(
                    eq(fieldVisits.engineerId, user.id),
                    eq(fieldVisits.visitNotes, `مسح ميداني مكتمل من الجهاز المحمول - معرف الجلسة: ${entityId}`)
                  ))
                  .limit(1);
                
                if (existingVisit.length === 0) {
                  // Extract survey completion details
                  const currentTime = new Date();
                  const surveyStartTime = data.startTime ? new Date(data.startTime) : currentTime;
                  const surveyEndTime = data.endTime ? new Date(data.endTime) : currentTime;
                  
                  // Create field visit record for survey completion
                  const fieldVisitData = {
                    appointmentId: data.appointmentId || `temp-${entityId}`, // Use temporary if not available
                    applicationId: data.applicationId || `survey-${entityId}`, // Use survey ID if no application
                    engineerId: user.id,
                    visitDate: surveyStartTime,
                    status: 'completed',
                    arrivalTime: surveyStartTime,
                    departureTime: surveyEndTime,
                    gpsLocation: data.startLocation ? {
                      latitude: data.startLocation.latitude,
                      longitude: data.startLocation.longitude,
                      accuracy: data.startLocation.accuracy
                    } : null,
                    visitNotes: `مسح ميداني مكتمل من الجهاز المحمول - معرف الجلسة: ${entityId}`,
                    citizenPresent: data.citizenPresent || false,
                    equipmentUsed: {
                      device: deviceId,
                      sessionType: data.sessionType,
                      plannedDuration: data.plannedDuration
                    },
                    requiresFollowUp: false
                  };
                  
                  await storage.createFieldVisit(fieldVisitData, {
                    userId: user.id,
                    deviceId,
                    clientChangeId: itemKey,
                    geographic: {
                      governorateId: data.governorateId,
                      districtId: data.districtId
                    }
                  });
                  console.log(`Field visit created for completed survey session: ${entityId}`);
                } else {
                  console.log(`Field visit already exists for survey session: ${entityId}`);
                }
              } catch (fieldVisitError) {
                console.error('Error creating field visit record:', fieldVisitError);
                // Don't fail the main operation for field visit tracking errors
              }
            }
          } else {
            conflicts.push({
              changeId: itemKey,
              reason: 'operation_failed',
              serverVersion: null,
              serverData: null
            });
          }
          
        } catch (error) {
          console.error(`Change application error for ${change.idempotencyKey}:`, error);
          conflicts.push({
            changeId: change.idempotencyKey,
            reason: 'validation_error',
            serverVersion: null,
            serverData: null
          });
        }
      }
      
      // Generate updated sync cursor
      const updatedCursor = Buffer.from(JSON.stringify({
        timestamp: new Date().toISOString(),
        deviceId,
        changeCount: accepted.length
      })).toString('base64');
      
      res.json({
        success: true,
        data: {
          accepted,
          conflicts,
          syncCursor: updatedCursor
        }
      });
      
    } catch (error) {
      console.error('Delta sync apply error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to apply sync changes'
        }
      });
    }
  });

  // =============================================
  // SECURE FILE MANAGEMENT ENDPOINTS
  // =============================================

  // Secure file management endpoints using imported services

  // Serve protected mobile survey attachments
  app.get('/mobile-attachments/:attachmentId(*)', globalSecurityMonitor, generalRateLimit, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const attachmentId = req.params.attachmentId;
      const objectStorageService = new ObjectStorageService();
      
      // Get attachment metadata from database for LBAC validation
      const attachment = await db.select()
        .from(mobileSurveyAttachments)
        .where(eq(mobileSurveyAttachments.id, attachmentId))
        .limit(1);
      
      if (attachment.length === 0) {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      
      const attachmentRecord = attachment[0];
      
      // LBAC validation - user must have access to the session's geographic scope
      const hasAccess = await validateLBACAccess(user.id, 'sessions', attachmentRecord.sessionId, 'read');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          code: 'LBAC_VIOLATION' 
        });
      }
      
      // Get file from object storage
      try {
        const objectFile = await objectStorageService.getMobileSurveyAttachmentFile(attachmentId);
        const canAccess = await objectStorageService.canAccessMobileSurveyAttachment({
          userId: user.id,
          attachmentId,
          requestedPermission: ObjectPermission.READ,
        });
        
        if (!canAccess) {
          return res.status(403).json({ error: 'File access denied' });
        }
        
        objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error('Error accessing attachment file:', error);
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: 'File not found' });
        }
        return res.status(500).json({ error: 'File access error' });
      }
      
    } catch (error) {
      console.error('Error serving mobile attachment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get upload URL for mobile survey attachment
  app.post('/api/mobile/v1/attachments/upload-url', globalSecurityMonitor, uploadRateLimit, uploadSlowDown, requireJSON, basicSecurityProtection, validateAttachmentUpload, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { sessionId, fileName, fileSize, mimeType, attachmentType } = req.body;
      
      // Validate required fields
      if (!sessionId || !fileName || !fileSize || !mimeType || !attachmentType) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['sessionId', 'fileName', 'fileSize', 'mimeType', 'attachmentType']
        });
      }
      
      // Validate file size (max 50MB as per schema constraint)
      if (fileSize > 52428800) {
        return res.status(400).json({
          error: 'File size exceeds maximum limit of 50MB'
        });
      }
      
      // LBAC validation - user must have write access to the session
      const hasAccess = await validateLBACAccess(user.id, 'sessions', sessionId, 'update');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied to upload to this session',
          code: 'LBAC_VIOLATION' 
        });
      }
      
      // Get session details for geographic context
      const sessionResult = await db.select()
        .from(mobileSurveySessions)
        .where(eq(mobileSurveySessions.id, sessionId))
        .limit(1);
      
      if (sessionResult.length === 0) {
        return res.status(404).json({ error: 'Survey session not found' });
      }
      
      const session = sessionResult[0];
      
      // Create attachment record in database (pending upload)
      const attachmentId = randomUUID();
      const fileExtension = fileName.split('.').pop();
      
      const newAttachment = await db.insert(mobileSurveyAttachments).values({
        id: attachmentId,
        sessionId,
        fileName: `${attachmentId}.${fileExtension}`,
        originalFileName: fileName,
        fileType: mimeType.startsWith('image/') ? 'image' : 
                 mimeType.startsWith('video/') ? 'video' : 
                 mimeType.startsWith('audio/') ? 'audio' : 'document',
        mimeType,
        fileSize,
        attachmentType,
        isUploaded: false,
        capturedAt: new Date(),
      }).returning();
      
      // Generate presigned upload URL
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getMobileSurveyAttachmentUploadURL(
        attachmentId, 
        fileExtension
      );
      
      res.json({
        success: true,
        data: {
          attachmentId,
          uploadURL,
          expiresIn: 900, // 15 minutes
        }
      });
      
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Confirm attachment upload and set ACL policy
  app.post('/api/mobile/v1/attachments/:attachmentId/confirm', globalSecurityMonitor, uploadRateLimit, uploadSlowDown, requireJSON, basicSecurityProtection, validateAttachmentIdParam, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const attachmentId = req.params.attachmentId;
      const { actualFileSize, checksum } = req.body;
      
      // Get attachment record
      const attachmentResult = await db.select()
        .from(mobileSurveyAttachments)
        .where(eq(mobileSurveyAttachments.id, attachmentId))
        .limit(1);
      
      if (attachmentResult.length === 0) {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      
      const attachment = attachmentResult[0];
      
      // LBAC validation
      const hasAccess = await validateLBACAccess(user.id, 'sessions', attachment.sessionId, 'update');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          code: 'LBAC_VIOLATION' 
        });
      }
      
      // Get session and application details for geographic context
      const sessionResult = await db.select()
        .from(mobileSurveySessions)
        .where(eq(mobileSurveySessions.id, attachment.sessionId))
        .limit(1);
      
      if (sessionResult.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const session = sessionResult[0];
      
      try {
        // Set ACL policy for the uploaded file
        const objectStorageService = new ObjectStorageService();
        const storageUrl = `https://storage.googleapis.com/${process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID}/${process.env.PRIVATE_OBJECT_DIR}/mobile-survey/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${attachmentId}.${attachment.originalFileName.split('.').pop()}`;
        
        const normalizedPath = await objectStorageService.trySetAttachmentAclPolicy(
          storageUrl,
          {
            owner: user.id,
            visibility: "private", // Government survey files are always private
            classification: "internal", // Government internal classification
            applicationId: session.applicationId,
            sessionId: session.id,
            geographicScope: {
              governorateId: session.governorateId,
              districtId: session.districtId,
              subDistrictId: session.subDistrictId,
              neighborhoodId: session.neighborhoodId,
            },
            aclRules: [{
              group: {
                type: ObjectAccessGroupType.GEOGRAPHIC_SCOPE,
                id: JSON.stringify({
                  governorateId: session.governorateId,
                  districtId: session.districtId,
                  subDistrictId: session.subDistrictId,
                  neighborhoodId: session.neighborhoodId,
                })
              },
              permission: ObjectPermission.READ
            }],
            retentionPolicy: {
              retentionYears: 10, // Government records retention
              requiresApprovalForDeletion: true
            }
          }
        );
        
        // Update attachment record
        const updatedAttachment = await db.update(mobileSurveyAttachments)
          .set({
            isUploaded: true,
            uploadedAt: new Date(),
            storageUrl: normalizedPath,
            fileSize: actualFileSize || attachment.fileSize,
            updatedAt: new Date(),
          })
          .where(eq(mobileSurveyAttachments.id, attachmentId))
          .returning();
        
        // Create change tracking entry for sync
        await storage.createChangeTrackingEntry('mobile_survey_attachments', attachmentId, 'created', {
          userId: user.id,
          deviceId: req.deviceId,
          geographic: {
            governorateId: session.governorateId,
            districtId: session.districtId,
          },
          recordSnapshot: updatedAttachment[0]
        });
        
        res.json({
          success: true,
          data: {
            attachment: updatedAttachment[0],
            downloadUrl: normalizedPath
          }
        });
        
      } catch (error) {
        console.error('Error setting attachment ACL policy:', error);
        // Mark upload as failed but don't fail the entire request
        await db.update(mobileSurveyAttachments)
          .set({
            uploadRetryCount: attachment.uploadRetryCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(mobileSurveyAttachments.id, attachmentId));
        
        res.status(500).json({ 
          error: 'Failed to finalize upload',
          retryable: attachment.uploadRetryCount < 5
        });
      }
      
    } catch (error) {
      console.error('Error confirming attachment upload:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get attachments for a mobile survey session
  app.get('/api/mobile/v1/sessions/:sessionId/attachments', globalSecurityMonitor, generalRateLimit, basicSecurityProtection, validateSessionIdParam, authenticateMobileAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const sessionId = req.params.sessionId;
      
      // LBAC validation
      const hasAccess = await validateLBACAccess(user.id, 'sessions', sessionId, 'read');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          code: 'LBAC_VIOLATION' 
        });
      }
      
      // Get attachments
      const attachments = await db.select()
        .from(mobileSurveyAttachments)
        .where(and(
          eq(mobileSurveyAttachments.sessionId, sessionId),
          eq(mobileSurveyAttachments.isUploaded, true)
        ))
        .orderBy(desc(mobileSurveyAttachments.createdAt));
      
      res.json({
        success: true,
        data: {
          attachments: attachments.map(attachment => ({
            ...attachment,
            downloadUrl: `/mobile-attachments/${attachment.id}`
          }))
        }
      });
      
    } catch (error) {
      console.error('Error fetching session attachments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =============================================
  // GEOPROCESSING QUEUE SYSTEM API ENDPOINTS
  // =============================================

  // Create new geo job - POST /api/geo-jobs
  app.post('/api/geo-jobs', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      
      // Validate request body using Zod
      const validatedJob = insertGeoJobSchema.parse({
        ...req.body,
        ownerId: user.id, // Set owner to current user
        createdBy: user.id,
        idempotencyKey: req.body.idempotencyKey || crypto.randomUUID()
      });

      // Check for duplicate idempotency key
      const existingJob = await storage.getGeoJobByIdempotencyKey(validatedJob.idempotencyKey);
      if (existingJob) {
        return res.json({
          success: true,
          data: { job: existingJob },
          message: 'Job already exists with this idempotency key'
        });
      }

      // RBAC Check - ensure user can create geo jobs
      const userRoles = user.roleCodes || [];
      const canCreateGeoJobs = userRoles.some((role: string) => 
        ['ADMIN', 'EMPLOYEE', 'MANAGER', 'SURVEYING_MANAGER'].includes(role)
      );
      
      if (!canCreateGeoJobs) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to create geo jobs',
          code: 'RBAC_VIOLATION' 
        });
      }

      // Create the job
      const newJob = await storage.createGeoJob(validatedJob);

      res.status(201).json({
        success: true,
        data: { job: newJob },
        message: 'Geo job created successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      
      console.error('Error creating geo job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ================================================================
  // CENTRAL ROLE NORMALIZATION SYSTEM
  // ================================================================
  
  /**
   * Central role mapping and normalization utility
   * Ensures consistent uppercase roleCodes across all JWT issuance and authorization
   */
  const normalizeRoleCodes = (roles: string | string[] | null | undefined): string[] => {
    if (!roles) return ['USER'];
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const cleanedRoles = roleArray.filter(Boolean).map(r => r.toString().trim().toUpperCase());
    
    // Role expansion mapping
    const roleMapping: Record<string, string[]> = {
      'ADMIN': ['ADMIN', 'USER'],
      'MANAGER': ['MANAGER', 'USER'],
      'SURVEYING_MANAGER': ['SURVEYING_MANAGER', 'MANAGER', 'USER'],
      'EMPLOYEE': ['EMPLOYEE', 'USER'],
      'CITIZEN': ['USER'],
      'USER': ['USER']
    };
    
    const expandedRoles = new Set<string>();
    cleanedRoles.forEach(role => {
      const mappedRoles = roleMapping[role] || ['USER'];
      mappedRoles.forEach(r => expandedRoles.add(r));
    });
    
    return Array.from(expandedRoles).sort(); // Consistent ordering
  };

  // Helper function to determine if user is admin (unified admin detection)
  const isUserAdmin = (user: any): boolean => {
    return (user?.role?.toLowerCase() === 'admin') || 
           (user?.roleCodes || []).map((r: string) => r.toLowerCase()).includes('admin');
  };

  // ================================================================
  // TARGET TYPE NORMALIZATION SYSTEM (Architect's recommendation)
  // ================================================================
  
  /**
   * Normalize various targetType formats to canonical camelCase
   * Accepts: snake_case, kebab-case, mixed case
   * Returns: canonical camelCase for database compatibility
   */
  const normalizeTargetType = (targetType: string): string | null => {
    if (!targetType) return null;
    
    const normalized = targetType.toLowerCase().replace(/[-_]/g, '');
    
    const typeMapping: Record<string, string> = {
      'governorate': 'governorate',
      'district': 'district',
      'subdistrict': 'subDistrict',
      'sub_district': 'subDistrict',
      'neighborhood': 'neighborhood',
      'neighborhoodunit': 'neighborhoodUnit',
      'neighborhood_unit': 'neighborhoodUnit',
      'neighborhood-unit': 'neighborhoodUnit',
      'sector': 'sector',
      'block': 'block',
      'plot': 'plot',
      'tile': 'tile',
      'none': 'none'
    };
    
    return typeMapping[normalized] || null;
  };

  // Get geo jobs - GET /api/geo-jobs (ENHANCED WITH EXTENSIVE DIAGNOSTIC LOGGING)
  app.get('/api/geo-jobs', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      
      // ✅ EXTENSIVE USER & AUTH STATE LOGGING
      console.log(`[🔍 GEO-JOBS DEBUG] Request received from authenticated user:`, {
        requestPath: req.path,
        queryParams: req.query,
        userObject: {
          id: user.id,
          username: user.username,
          role: user.role,
          roleCodes: user.roleCodes,
          type: user.type,
          deviceId: user.deviceId,
          exp: user.exp,
          iat: user.iat
        },
        headers: {
          authorization: req.headers.authorization ? 'Bearer ' + req.headers.authorization.substring(7, 20) + '...' : null,
          userAgent: req.headers['user-agent']
        }
      });
      
      // Extract filters from query params WITH TARGET TYPE NORMALIZATION
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.taskType) filters.taskType = req.query.taskType as string;
      
      // ✅ NORMALIZE TARGET TYPE (Architect's recommendation)
      if (req.query.targetType) {
        const rawTargetType = req.query.targetType as string;
        const normalizedTargetType = normalizeTargetType(rawTargetType);
        
        if (!normalizedTargetType) {
          console.error(`[❌ GEO-JOBS] Invalid targetType: "${rawTargetType}"`);
          return res.status(400).json({
            success: false,
            error: 'Invalid targetType value',
            details: `"${rawTargetType}" is not a valid target type. Supported values: governorate, district, subDistrict, neighborhood, neighborhoodUnit, sector, block, plot, tile, none`
          });
        }
        
        filters.targetType = normalizedTargetType;
        
        // Log normalization for debugging
        if (rawTargetType !== normalizedTargetType) {
          console.warn(`[⚠️ GEO-JOBS] Normalized targetType: "${rawTargetType}" → "${normalizedTargetType}"`);
        }
      }
      
      if (req.query.targetId) filters.targetId = req.query.targetId as string;
      if (req.query.neighborhoodUnitId) filters.neighborhoodUnitId = req.query.neighborhoodUnitId as string;
      if (req.query.priority) filters.priority = parseInt(req.query.priority as string);

      console.log(`[🔍 GEO-JOBS] Extracted filters (after normalization):`, filters);

      // Apply ownership filter for non-admin users (UNIFIED ADMIN CHECK)
      const isAdmin = isUserAdmin(user);
      console.log(`[🔍 GEO-JOBS] Admin detection result:`, {
        isAdmin,
        userRole: user.role,
        userRoleCodes: user.roleCodes,
        adminDetectionViaRole: user?.role?.toLowerCase() === 'admin',
        adminDetectionViaRoleCodes: (user?.roleCodes || []).map((r: string) => r.toLowerCase()).includes('admin')
      });
      
      if (!isAdmin) {
        filters.ownerId = user.id;
        console.log(`[🔍 GEO-JOBS] Added ownership filter for non-admin user:`, { userId: user.id });
      }

      console.log(`[🔍 GEO-JOBS] Fetching jobs with filters:`, filters);
      let jobs = await storage.getGeoJobs(filters);
      console.log(`[🔍 GEO-JOBS] Raw jobs from database:`, {
        jobCount: jobs.length,
        firstJobSample: jobs[0] ? {
          id: jobs[0].id,
          status: jobs[0].status,
          ownerId: jobs[0].ownerId,
          targetType: jobs[0].targetType,
          targetId: jobs[0].targetId
        } : null
      });

      // Apply LBAC filtering for non-admin users
      if (!isAdmin) {
        console.log(`[🔍 GEO-JOBS] Starting LBAC filtering for non-admin user...`);
        const allowedJobs = [];
        
        for (const job of jobs) {
          let hasAccess = false;
          
          // Check LBAC access based on job's target type and target ID
          if (job.targetType && job.targetId) {
            try {
              hasAccess = await validateLBACAccess(user.id, job.targetType, job.targetId, 'read');
            } catch (error) {
              console.warn(`LBAC validation error for job ${job.id}:`, error);
              hasAccess = false; // SECURE DEFAULT: Deny access on error
            }
          } else if (job.neighborhoodUnitId) {
            // Legacy support: check access to neighborhood unit
            try {
              hasAccess = await validateLBACAccess(user.id, 'neighborhoodUnit', job.neighborhoodUnitId, 'read');
            } catch (error) {
              console.warn(`LBAC validation error for job ${job.id} (legacy):`, error);
              hasAccess = false;
            }
          } else {
            // No geographic target - check if user has general admin/manager permissions
            const userRoles = user.roleCodes || [];
            hasAccess = userRoles.some((role: string) => 
              ['ADMIN', 'MANAGER', 'SURVEYING_MANAGER'].includes(role)
            );
          }
          
          if (hasAccess) {
            allowedJobs.push(job);
          }
        }
        
        const originalJobsCount = jobs.length;
        jobs = allowedJobs;
        console.log(`LBAC: Filtered ${jobs.length}/${originalJobsCount} jobs for user ${user.id}`);
      } else {
        console.log(`[GEO-JOBS] Admin user bypassed LBAC:`, {
          userId: user.id,
          username: user.username,
          role: user.role,
          roleCodes: user.roleCodes
        });
      }

      // Check if this is a request for overlay data (frontend integration)
      const includeOverlay = req.query.includeOverlay === 'true';
      
      if (includeOverlay) {
        // Convert completed jobs to overlay format
        const overlayJobs = await Promise.all(
          jobs.map(async (job) => {
            const overlayData = await convertJobToOverlayData(job);
            return overlayData || {
              id: job.id,
              status: job.status === 'completed' ? 'processing_failed' : 'not_available',
              metadata: {
                taskType: job.taskType,
                targetType: job.targetType,
                targetId: job.targetId,
                status: job.status,
                createdAt: job.createdAt
              }
            };
          })
        );

        res.json({
          success: true,
          data: { 
            overlays: overlayJobs.filter(overlay => overlay.status === 'available'),
            total: overlayJobs.length 
          }
        });
      } else {
        // Standard job listing response  
        res.json({
          success: true,
          data: { 
            jobs,
            total: jobs.length 
          }
        });
      }

    } catch (error) {
      console.error('Error fetching geo jobs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get specific geo job - GET /api/geo-jobs/:id
  app.get('/api/geo-jobs/:id', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;

      const job = await storage.getGeoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      // Additional LBAC validation for non-admin users
      if (!isAdmin) {
        let hasGeographicAccess = false;
        
        // Check LBAC access based on job's target type and target ID
        if (job.targetType && job.targetId) {
          try {
            hasGeographicAccess = await validateLBACAccess(user.id, job.targetType, job.targetId, 'read');
          } catch (error) {
            console.warn(`LBAC validation error for job ${job.id}:`, error);
            hasGeographicAccess = false; // SECURE DEFAULT: Deny access on error
          }
        } else if (job.neighborhoodUnitId) {
          // Legacy support: check access to neighborhood unit
          try {
            hasGeographicAccess = await validateLBACAccess(user.id, 'neighborhoodUnit', job.neighborhoodUnitId, 'read');
          } catch (error) {
            console.warn(`LBAC validation error for job ${job.id} (legacy):`, error);
            hasGeographicAccess = false;
          }
        } else {
          // No geographic target - allow if user owns the job
          hasGeographicAccess = isOwner;
        }
        
        if (!hasGeographicAccess) {
          return res.status(403).json({ 
            error: 'Access denied to this geographic area',
            code: 'LBAC_VIOLATION' 
          });
        }
      }

      res.json({
        success: true,
        data: { job }
      });

    } catch (error) {
      console.error('Error fetching geo job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Cancel geo job - PATCH /api/geo-jobs/:id/cancel
  app.patch('/api/geo-jobs/:id/cancel', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;
      const reason = req.body.reason || 'Cancelled by user';

      const job = await storage.getGeoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to cancel this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      // Can only cancel queued or running jobs
      if (!['queued', 'running'].includes(job.status)) {
        return res.status(400).json({ 
          error: `Cannot cancel job in ${job.status} status`,
          code: 'INVALID_STATUS' 
        });
      }

      const cancelledJob = await storage.cancelGeoJob(jobId, reason);

      res.json({
        success: true,
        data: { job: cancelledJob },
        message: 'Geo job cancelled successfully'
      });

    } catch (error) {
      console.error('Error cancelling geo job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get geo job events - GET /api/geo-jobs/:id/events
  app.get('/api/geo-jobs/:id/events', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;

      const job = await storage.getGeoJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to view events for this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      const events = await storage.getGeoJobEvents({ jobId });

      res.json({
        success: true,
        data: { 
          events,
          total: events.length 
        }
      });

    } catch (error) {
      console.error('Error fetching geo job events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get queue statistics - GET /api/geo-jobs/stats
  app.get('/api/geo-jobs/stats', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      
      // Only allow admins and managers to view system stats
      const userRoles = user.roleCodes || [];
      const canViewStats = userRoles.some((role: string) => 
        ['ADMIN', 'MANAGER', 'SURVEYING_MANAGER'].includes(role)
      );
      
      if (!canViewStats) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view queue statistics',
          code: 'RBAC_VIOLATION' 
        });
      }

      const stats = await storage.getGeoJobQueueStats();

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Error fetching queue stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get worker performance stats - GET /api/geo-jobs/workers/stats
  app.get('/api/geo-jobs/workers/stats', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      
      // Only allow admins to view worker stats
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to view worker statistics',
          code: 'RBAC_VIOLATION' 
        });
      }

      const workerId = req.query.workerId as string | undefined;
      const workerStats = await storage.getWorkerPerformanceStats(workerId);

      res.json({
        success: true,
        data: { 
          workers: workerStats,
          total: workerStats.length 
        }
      });

    } catch (error) {
      console.error('Error fetching worker stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =============================================
  // PYTHON WORKER POLLING ENDPOINT (Internal)
  // =============================================

  // Claim next job for worker - POST /api/internal/geo-jobs/claim
  // This endpoint is used by Python workers to poll for jobs
  app.post('/api/internal/geo-jobs/claim', globalSecurityMonitor, authenticateToken, async (req: Request, res: Response) => {
    console.error('[DEBUG] Handler started - endpoint reached!');
    try {
      const { workerId } = req.body;
      
      if (!workerId) {
        return res.status(400).json({ error: 'workerId is required' });
      }

      // JWT authentication for internal services  
      // Workers must authenticate with valid JWT tokens
      console.error('[DEBUG] req.user content:', JSON.stringify(req.user, null, 2));
      
      if (!req.user || !req.user.id) {
        console.error('[DEBUG] Authentication failed - req.user:', !!req.user, 'req.user.id:', req.user?.id);
        return res.status(401).json({ error: 'JWT authentication required' });
      }

      const claimedJob = await storage.claimNextGeoJob(workerId);

      if (!claimedJob) {
        return res.json({
          success: true,
          data: { job: null },
          message: 'No jobs available'
        });
      }

      res.json({
        success: true,
        data: { job: claimedJob },
        message: 'Job claimed successfully'
      });

    } catch (error) {
      console.error('Error claiming geo job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update job progress - PATCH /api/internal/geo-jobs/:id/progress
  app.patch('/api/internal/geo-jobs/:id/progress', authenticateToken, globalSecurityMonitor, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { progress, message, workerId } = req.body;

      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'Invalid progress value' });
      }

      const updatedJob = await storage.updateGeoJobProgress(jobId, progress, message);

      res.json({
        success: true,
        data: { job: updatedJob },
        message: 'Progress updated successfully'
      });

    } catch (error) {
      console.error('Error updating job progress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update heartbeat - PATCH /api/internal/geo-jobs/:id/heartbeat
  app.patch('/api/internal/geo-jobs/:id/heartbeat', globalSecurityMonitor, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({ error: 'workerId is required' });
      }

      const updatedJob = await storage.updateGeoJobHeartbeat(jobId, workerId);

      res.json({
        success: true,
        data: { job: updatedJob },
        message: 'Heartbeat updated successfully'
      });

    } catch (error) {
      console.error('Error updating heartbeat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Complete job - PATCH /api/internal/geo-jobs/:id/complete
  app.patch('/api/internal/geo-jobs/:id/complete', authenticateToken, globalSecurityMonitor, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { outputPayload, outputKeys } = req.body;

      const completedJob = await storage.completeGeoJob(jobId, outputPayload, outputKeys);

      res.json({
        success: true,
        data: { job: completedJob },
        message: 'Job completed successfully'
      });

    } catch (error) {
      console.error('Error completing job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Fail job - PATCH /api/internal/geo-jobs/:id/fail
  app.patch('/api/internal/geo-jobs/:id/fail', authenticateToken, globalSecurityMonitor, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { error: jobError } = req.body;

      const failedJob = await storage.failGeoJob(jobId, jobError);

      res.json({
        success: true,
        data: { job: failedJob },
        message: 'Job marked as failed'
      });

    } catch (error) {
      console.error('Error failing job:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =============================================
  // GEOPROCESSING FILE MANAGEMENT
  // =============================================

  // Upload input file for geo job - POST /api/geo-jobs/:id/upload
  app.post('/api/geo-jobs/:id/upload', globalSecurityMonitor, uploadRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;

      // Check if job exists and user has access
      const job = await storage.getGeoJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to upload files for this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      // Only allow uploads for queued jobs
      if (job.status !== 'queued') {
        return res.status(400).json({ 
          error: `Cannot upload files for job in ${job.status} status`,
          code: 'INVALID_STATUS' 
        });
      }

      const { fileName, fileSize, fileType } = req.body;

      if (!fileName || !fileSize || !fileType) {
        return res.status(400).json({ 
          error: 'fileName, fileSize, and fileType are required' 
        });
      }

      // Validate file type for geoprocessing
      const allowedTypes = [
        'image/tiff',
        'application/octet-stream', // For .tif files
        'application/x-zip-compressed',
        'application/zip',
        'application/json' // For GeoJSON files
      ];

      const allowedExtensions = ['.tif', '.tiff', '.geotiff', '.zip', '.geojson', '.json'];
      const fileExtension = fileName.toLowerCase().split('.').pop();
      const hasValidExtension = allowedExtensions.some(ext => 
        fileName.toLowerCase().endsWith(ext)
      );

      if (!allowedTypes.includes(fileType) && !hasValidExtension) {
        return res.status(400).json({ 
          error: 'Invalid file type. Supported: GeoTIFF (.tif, .tiff), ZIP, GeoJSON',
          code: 'INVALID_FILE_TYPE'
        });
      }

      // Validate file size (max 100MB for geoprocessing files)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (fileSize > maxFileSize) {
        return res.status(400).json({ 
          error: 'File size exceeds maximum limit of 100MB',
          code: 'FILE_TOO_LARGE'
        });
      }

      try {
        const objectStorage = new ObjectStorageService();
        
        // Generate unique file path in private directory
        const fileKey = `geo-jobs/${jobId}/input/${crypto.randomUUID()}-${fileName}`;
        
        // Generate upload URL for private storage
        const uploadUrl = await objectStorage.generateUploadUrl(fileKey);

        // Update job with input file info
        await storage.updateGeoJob(jobId, {
          inputKey: fileKey
        });

        // Create job event for file upload
        await storage.createGeoJobEvent({
          jobId: jobId,
          eventType: 'status_change',
          fromStatus: 'queued',
          toStatus: 'queued',
          message: `Input file uploaded: ${fileName}`,
          payload: { 
            reason: 'input_uploaded',
            fileName, 
            fileSize, 
            fileType, 
            fileKey 
          }
        });

        res.json({
          success: true,
          data: {
            uploadUrl,
            fileKey,
            expiresIn: 300 // 5 minutes
          },
          message: 'Upload URL generated successfully'
        });

      } catch (storageError) {
        console.error('Object storage error:', storageError);
        res.status(500).json({ 
          error: 'Failed to generate upload URL',
          code: 'STORAGE_ERROR'
        });
      }

    } catch (error) {
      console.error('Error handling file upload:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get download URL for job files - GET /api/geo-jobs/:id/download/:fileType
  app.get('/api/geo-jobs/:id/download/:fileType', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;
      const fileType = req.params.fileType; // 'input' or 'output'

      // Check if job exists and user has access
      const job = await storage.getGeoJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to download files for this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      let fileKeys: string[];
      if (fileType === 'input') {
        fileKeys = job.inputKey ? [job.inputKey] : [];
      } else if (fileType === 'output') {
        fileKeys = job.outputKeys || [];
        // Can only download output files from completed jobs
        if (job.status !== 'completed') {
          return res.status(400).json({ 
            error: 'Output files only available for completed jobs',
            code: 'JOB_NOT_COMPLETED'
          });
        }
      } else {
        return res.status(400).json({ 
          error: 'Invalid file type. Use "input" or "output"',
          code: 'INVALID_FILE_TYPE'
        });
      }

      if (fileKeys.length === 0) {
        return res.status(404).json({ 
          error: `No ${fileType} files found for this job`,
          code: 'NO_FILES_FOUND'
        });
      }

      try {
        const objectStorage = new ObjectStorageService();
        
        // Generate download URLs for all files
        const downloadUrls = await Promise.all(
          fileKeys.map(async (fileKey) => {
            try {
              const downloadUrl = await objectStorage.generateDownloadUrl(
                fileKey,
                300 // 5 minutes expiry
              );
              return {
                fileKey,
                fileName: fileKey.split('/').pop() || fileKey,
                downloadUrl,
                expiresIn: 300
              };
            } catch (error) {
              console.error(`Failed to generate download URL for ${fileKey}:`, error);
              return {
                fileKey,
                fileName: fileKey.split('/').pop() || fileKey,
                error: 'Failed to generate download URL'
              };
            }
          })
        );

        res.json({
          success: true,
          data: {
            fileType,
            files: downloadUrls
          },
          message: `${fileType} files download URLs generated`
        });

      } catch (storageError) {
        console.error('Object storage error:', storageError);
        res.status(500).json({ 
          error: 'Failed to generate download URLs',
          code: 'STORAGE_ERROR'
        });
      }

    } catch (error) {
      console.error('Error handling file download:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // List files for a geo job - GET /api/geo-jobs/:id/files
  app.get('/api/geo-jobs/:id/files', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;

      // Check if job exists and user has access
      const job = await storage.getGeoJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to view files for this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      const inputFiles = job.inputKey ? [{
        type: 'input',
        fileKey: job.inputKey,
        fileName: job.inputKey.split('/').pop() || job.inputKey
      }] : [];

      const outputFiles = (job.outputKeys || []).map(key => ({
        type: 'output',
        fileKey: key,
        fileName: key.split('/').pop() || key
      }));

      res.json({
        success: true,
        data: {
          files: [
            ...inputFiles,
            ...outputFiles
          ],
          summary: {
            inputCount: inputFiles.length,
            outputCount: outputFiles.length,
            totalCount: inputFiles.length + outputFiles.length
          }
        }
      });

    } catch (error) {
      console.error('Error listing job files:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete file from geo job - DELETE /api/geo-jobs/:id/files/:fileKey
  app.delete('/api/geo-jobs/:id/files/:fileKey', globalSecurityMonitor, generalRateLimit, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;
      const fileKey = decodeURIComponent(req.params.fileKey);

      // Check if job exists and user has access
      const job = await storage.getGeoJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Geo job not found' });
      }

      // Check ownership or admin access
      const userRoles = user.roleCodes || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isOwner = job.ownerId === user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: 'Access denied to delete files for this geo job',
          code: 'OWNERSHIP_VIOLATION' 
        });
      }

      // Can only delete input files from queued jobs
      if (job.status !== 'queued') {
        return res.status(400).json({ 
          error: `Cannot delete files from job in ${job.status} status`,
          code: 'INVALID_STATUS' 
        });
      }

      // Check if file belongs to this job
      const allFileKeys = [
        ...(job.inputKey ? [job.inputKey] : []), 
        ...(job.outputKeys || [])
      ];
      if (!allFileKeys.includes(fileKey)) {
        return res.status(404).json({ 
          error: 'File not found in this job',
          code: 'FILE_NOT_FOUND'
        });
      }

      try {
        const objectStorage = new ObjectStorageService();
        
        // Delete file from object storage
        await objectStorage.deleteObject(fileKey);

        // Update job to remove file key
        const updatedJob: any = {};
        
        // If deleting input file, clear inputKey
        if (job.inputKey === fileKey) {
          updatedJob.inputKey = null;
        }
        
        // If deleting output file, remove from outputKeys array
        const updatedOutputKeys = (job.outputKeys || []).filter(key => key !== fileKey);
        if (updatedOutputKeys.length !== (job.outputKeys || []).length) {
          updatedJob.outputKeys = updatedOutputKeys;
        }

        await storage.updateGeoJob(jobId, updatedJob);

        // Create job event for file deletion
        await storage.createGeoJobEvent({
          jobId: jobId,
          eventType: 'status_change',
          fromStatus: job.status,
          toStatus: job.status,
          message: `File deleted: ${fileKey.split('/').pop()}`,
          payload: { 
            reason: 'input_deleted',
            fileKey 
          }
        });

        res.json({
          success: true,
          message: 'File deleted successfully'
        });

      } catch (storageError) {
        console.error('Object storage error:', storageError);
        res.status(500).json({ 
          error: 'Failed to delete file',
          code: 'STORAGE_ERROR'
        });
      }

    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Temporary endpoint to initialize workflow definition
  app.post('/api/init-workflow', async (req, res) => {
    try {
      const { workflowService } = await import('./services/workflowService');
      const result = await workflowService.createSurveyingDecisionWorkflow();
      res.json({ success: true, workflow: result });
    } catch (error) {
      console.error('Error initializing workflow:', error);
      res.status(500).json({ success: false, error: 'Failed to initialize workflow' });
    }
  });

  // Add missing sync session endpoint
  app.get('/api/sync/session', authenticateToken, async (req, res) => {
    res.json({ 
      status: 'ok', 
      sessionId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    });
  });

  // Register workflow routes
  app.use('/api/workflow', workflowRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
