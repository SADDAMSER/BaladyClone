import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { sql, eq, desc } from "drizzle-orm";
import { applications } from "@shared/schema";
import {
  insertUserSchema, insertDepartmentSchema, insertPositionSchema,
  insertLawRegulationSchema, insertLawSectionSchema, insertLawArticleSchema,
  insertRequirementCategorySchema, insertRequirementSchema, insertServiceSchema,
  insertApplicationSchema, insertSurveyingDecisionSchema, insertTaskSchema,
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
  insertLbacAccessAuditLogSchema
} from "@shared/schema";
import { DEFAULT_PERMISSIONS } from "@shared/defaults";
import { PaginationParams, validatePaginationParams } from "./pagination";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
// Type assertion to ensure TypeScript knows JWT_SECRET is defined
const jwtSecret: string = JWT_SECRET;

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string; // Legacy compatibility
    roleCodes?: string[]; // New RBAC system - array of role codes
    geographicAssignments?: any[];
  };
  requiredOwnership?: {
    field: string;
    userId: string;
  };
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
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
        return res.status(400).json({ 
          message: 'Invalid request: Geographic context required'
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
          { username: 'surveyor_01', role: 'employee', fullName: 'فهد المهندس المساح الأول' },
          { username: 'surveyor_02', role: 'employee', fullName: 'سالم المهندس المساح الثاني' }
        ];

        const mockUser = mockUsers.find(u => u.username === username);
        if (!mockUser) {
          console.log('Mock user not found:', username);
          return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log('Mock user found, creating token for:', mockUser.username);
        
        // Create JWT token for mock user
        const token = jwt.sign(
          { 
            id: `mock-${mockUser.username}`, 
            username: mockUser.username, 
            role: mockUser.role,
            roleCodes: [mockUser.role]
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
            role: mockUser.role,
            roleCodes: [mockUser.role],
            roles: [{ code: mockUser.role, nameAr: mockUser.fullName }]
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
          roleCodes = [user.role];
        }
      } catch (roleError) {
        console.error('Error fetching user roles for simple login:', roleError);
        // Fallback to legacy role system
        roleCodes = user.role ? [user.role] : [];
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
          roleCodes = [user.role];
        }
      } catch (roleError) {
        console.error('Error fetching user roles:', roleError);
        // Fallback to legacy role system
        roleCodes = user.role ? [user.role] : [];
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
      const { governorateId } = req.query;
      const sectors = await storage.getSectors(governorateId as string);
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
      const filters = neighborhoodId || sectorId ? { neighborhoodId: neighborhoodId as string, sectorId: sectorId as string } : undefined;
      const neighborhoodUnits = await storage.getNeighborhoodUnits(filters);
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

  // Applications routes
  app.get("/api/applications", authenticateToken, async (req, res) => {
    try {
      const { status, applicantId, assignedToId, currentStage } = req.query;
      const applications = await storage.getApplications({
        status: status as string,
        applicantId: applicantId as string,
        assignedToId: assignedToId as string,
        currentStage: currentStage as string,
      });
      res.json(applications);
    } catch (error) {
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

  // Public endpoint for citizens to submit applications (no authentication required)
  app.post("/api/applications", async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        applicantId: req.body.applicantId || "anonymous", // Use provided applicantId or anonymous
      });
      const application = await storage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/applications/:id", authenticateToken, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error) {
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

  // Surveying decisions routes
  app.get("/api/surveying-decisions", authenticateToken, async (req, res) => {
    try {
      const { status, surveyorId } = req.query;
      const decisions = await storage.getSurveyingDecisions({
        status: status as string,
        surveyorId: surveyorId as string,
      });
      res.json(decisions);
    } catch (error) {
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

  app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
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
  app.post("/api/applications/:id/auto-assign", authenticateToken, requireRole(['manager', 'admin']), enforceLBACAccess('neighborhood'), async (req, res) => {
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
  app.post("/api/applications/:id/generate-invoice", authenticateToken, enforceLBACAccess('neighborhood'), async (req: AuthenticatedRequest, res) => {
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
        newStage: 'awaiting_assignment',
        changedById: req.user?.id || '',
        notes: `تم تأكيد السداد - ${paymentMethod || 'نقدي'}. في انتظار تكليف مهندس`
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
  app.post('/api/applications/:id/assign', authenticateToken, enforceLBACAccess('neighborhood'), async (req: AuthenticatedRequest, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
