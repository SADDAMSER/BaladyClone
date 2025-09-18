// Mobile Authentication Middleware for Yemen Construction Platform
// Enhanced security for mobile API endpoints with LBAC/RBAC integration

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, userRoles, roles, userGeographicAssignments, mobileDeviceRegistrations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { accessControlService } from '../accessControlService';

// Enhanced user interface for mobile authentication
export interface AuthenticatedMobileUser {
  id: string;
  email: string;
  role: string;
  departmentId?: string;
  deviceId?: string;
  sessionId?: string;
  geographicAssignments?: Array<{
    governorateId: string | null;
    districtId: string | null;
    subDistrictId: string | null;
    neighborhoodId: string | null;
    canRead: boolean;
    canWrite: boolean;
    canApprove: boolean;
  }>;
}

declare global {
  namespace Express {
    interface Request {
      mobileUser?: AuthenticatedMobileUser;
    }
  }
}

/**
 * Mobile-specific authentication middleware
 * Validates JWT tokens and enriches request with mobile user context
 */
export const authenticateMobileAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header or mobile-specific header
    const authHeader = req.headers.authorization || req.headers['x-mobile-token'] as string;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: 'رمز المصادقة مطلوب للوصول لهذه الخدمة'
        }
      });
    }

    // Handle both 'Bearer token' and direct token formats
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'رمز المصادقة غير صحيح'
        }
      });
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[SECURITY] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_CONFIG_ERROR',
          message: 'خطأ في تكوين النظام'
        }
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      let errorMessage = 'رمز المصادقة منتهي الصلاحية أو غير صحيح';
      let errorCode = 'AUTH_TOKEN_EXPIRED';
      
      if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'رمز المصادقة تالف أو غير صحيح';
        errorCode = 'AUTH_TOKEN_MALFORMED';
      } else if (jwtError.name === 'NotBeforeError') {
        errorMessage = 'رمز المصادقة غير نشط بعد';
        errorCode = 'AUTH_TOKEN_NOT_ACTIVE';
      }

      return res.status(401).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        },
        timestamp: new Date().toISOString()
      });
    }

    // CRITICAL SECURITY ENFORCEMENT (strict validation - defense in depth)
    
    // STRICT: Validate token type MUST be 'mobile_access' for mobile endpoints
    if (!decoded.type || decoded.type !== 'mobile_access') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'رمز المصادقة غير مخصص للاستخدام المحمول'
        },
        timestamp: new Date().toISOString()
      });
    }

    // STRICT: Device ID MUST exist in both token and header for mobile access
    const requestDeviceId = req.headers['x-device-id'] as string;
    if (!decoded.deviceId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEVICE_ID_MISSING_IN_TOKEN',
          message: 'الرمز المميز غير مرتبط بجهاز'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!requestDeviceId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الجهاز مطلوب في header للوصول المحمول',
        code: 'DEVICE_ID_HEADER_MISSING',
        timestamp: new Date().toISOString()
      });
    }

    // CRITICAL: Device binding validation - token MUST be bound to this exact device
    if (decoded.deviceId !== requestDeviceId) {
      return res.status(403).json({
        success: false,
        error: 'الرمز المميز غير مرتبط بهذا الجهاز',
        code: 'DEVICE_BINDING_MISMATCH',
        timestamp: new Date().toISOString()
      });
    }

    // Support both decoded.userId (legacy) and decoded.id (new format) for compatibility
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'معرف المستخدم مفقود في الرمز المميز',
        code: 'USER_ID_MISSING',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch user details with roles and geographic assignments
    const userResults = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResults.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'المستخدم غير موجود أو تم حذف حسابه'
        }
      });
    }

    const user = userResults[0];

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'الحساب معطل. راجع الإدارة'
        }
      });
    }

    // CRITICAL: Device validation and tokenVersion enforcement (for immediate revocation)
    if (decoded.deviceId) {
      try {
        const deviceResults = await db.select()
          .from(mobileDeviceRegistrations)
          .where(and(
            eq(mobileDeviceRegistrations.deviceId, decoded.deviceId),
            eq(mobileDeviceRegistrations.userId, user.id)
          ))
          .limit(1);

        if (deviceResults.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'الجهاز غير مسجل أو تم إلغاؤه',
            code: 'DEVICE_NOT_REGISTERED',
            timestamp: new Date().toISOString()
          });
        }

        const device = deviceResults[0];

        // Check device status and activation
        if (device.status !== 'active' || device.isDeleted || !device.isActive) {
          return res.status(403).json({
            success: false,
            error: 'الجهاز معطل أو تم إلغاؤه',
            code: 'DEVICE_INACTIVE',
            timestamp: new Date().toISOString()
          });
        }

        // CRITICAL: Enforce tokenVersion to make logout/revocation immediate
        const tokenVersion = decoded.tokenVersion || 1;
        const deviceTokenVersion = device.tokenVersion || 1;
        
        if (tokenVersion !== deviceTokenVersion) {
          return res.status(401).json({
            success: false,
            error: 'الرمز المميز تم إلغاؤه',
            code: 'TOKEN_VERSION_MISMATCH',
            timestamp: new Date().toISOString()
          });
        }

        // Update device last seen timestamp (async, don't wait)
        db.update(mobileDeviceRegistrations)
          .set({ lastSeenAt: new Date() })
          .where(eq(mobileDeviceRegistrations.id, device.id))
          .catch(error => console.error('[DEVICE] Failed to update lastSeenAt:', error));

      } catch (deviceError) {
        console.error('[DEVICE VALIDATION ERROR]:', deviceError);
        return res.status(500).json({
          success: false,
          error: 'خطأ في التحقق من الجهاز',
          code: 'DEVICE_VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Get user roles and departments
    const userRolesData = await accessControlService.getUserRolesAndDepartments(user.id);
    const primaryRole = userRolesData[0]; // Use first role as primary

    // Get geographic assignments for LBAC
    const geographicAssignments = await accessControlService.getUserGeographicAssignments(user.id);

    // Create mobile user context
    const mobileUser: AuthenticatedMobileUser = {
      id: user.id,
      email: user.email,
      role: primaryRole?.roleCode || 'citizen',
      departmentId: primaryRole?.departmentId || undefined,
      deviceId: decoded.deviceId, // From mobile token
      sessionId: decoded.sessionId, // For session tracking
      geographicAssignments: geographicAssignments.map(assignment => ({
        governorateId: assignment.governorateId,
        districtId: assignment.districtId,
        subDistrictId: assignment.subDistrictId,
        neighborhoodId: assignment.neighborhoodId,
        canRead: assignment.canRead,
        canWrite: assignment.canWrite,
        canApprove: assignment.canApprove
      }))
    };

    // Attach to request for downstream middleware
    req.mobileUser = mobileUser;

    // Log successful authentication (for security audit)
    console.log(`[AUTH] Mobile user authenticated:`, {
      userId: user.id,
      role: mobileUser.role,
      deviceId: mobileUser.deviceId,
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });

    next();

  } catch (error) {
    console.error('[AUTH ERROR] Mobile authentication failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'خطأ في نظام المصادقة',
      code: 'AUTH_SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * LBAC validation middleware - validates location-based access
 */
export const validateLBACAccess = (requiredScope?: {
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mobileUser = req.mobileUser;
      
      if (!mobileUser) {
        return res.status(401).json({
          success: false,
          error: 'مصادقة مطلوبة للوصول',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin users bypass LBAC restrictions
      if (mobileUser.role === 'admin') {
        console.log(`[LBAC] Admin user bypassed LBAC:`, {
          userId: mobileUser.id,
          endpoint: req.path
        });
        return next();
      }

      // If no specific scope required, check if user has any geographic access
      if (!requiredScope) {
        if (mobileUser.geographicAssignments && mobileUser.geographicAssignments.length > 0) {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            error: 'لا توجد صلاحيات جغرافية للوصول',
            code: 'NO_GEOGRAPHIC_ACCESS'
          });
        }
      }

      // Validate specific geographic scope access
      const hasAccess = await accessControlService.hasGeographicAccess(mobileUser.id, requiredScope);
      
      if (!hasAccess) {
        console.warn(`[LBAC] Access denied for geographic scope:`, {
          userId: mobileUser.id,
          requiredScope,
          userAssignments: mobileUser.geographicAssignments,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'لا توجد صلاحية للوصول لهذه المنطقة الجغرافية',
          code: 'GEOGRAPHIC_ACCESS_DENIED'
        });
      }

      next();

    } catch (error) {
      console.error('[LBAC ERROR] Geographic access validation failed:', error);
      
      return res.status(500).json({
        success: false,
        error: 'خطأ في نظام التحقق من الصلاحيات',
        code: 'LBAC_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Device validation middleware for mobile endpoints  
 * Validates required headers and device information
 */
export const validateMobileDevice = (req: Request & { deviceId?: string }, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    const apiVersion = req.headers['api-version'] as string;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الجهاز مطلوب للوصول للخدمات المحمولة',
        code: 'MISSING_DEVICE_ID',
        timestamp: new Date().toISOString()
      });
    }

    // Validate device ID format (should be UUID or unique identifier)
    if (deviceId.length < 10 || deviceId.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'معرف الجهاز غير صحيح',
        code: 'INVALID_DEVICE_ID',
        timestamp: new Date().toISOString()
      });
    }

    if (!apiVersion || !apiVersion.match(/^[0-9]+\.[0-9]+$/)) {
      return res.status(400).json({
        success: false,
        error: 'إصدار API مطلوب ويجب أن يكون بصيغة صحيحة (مثال: 1.0)',
        code: 'INVALID_API_VERSION',
        timestamp: new Date().toISOString()
      });
    }

    // Check supported API versions
    const supportedVersions = ['1.0'];
    if (!supportedVersions.includes(apiVersion)) {
      return res.status(400).json({
        success: false,
        error: `إصدار API ${apiVersion} غير مدعوم. الإصدارات المدعومة: ${supportedVersions.join(', ')}`,
        code: 'UNSUPPORTED_API_VERSION',
        timestamp: new Date().toISOString()
      });
    }

    // Attach validated device ID to request
    req.deviceId = deviceId;
    
    // Log device access for security audit
    console.log(`[DEVICE] Mobile device validated:`, {
      deviceId: deviceId.substring(0, 8) + '***', // Partial logging for security
      apiVersion,
      ip: req.ip,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();

  } catch (error) {
    console.error('[DEVICE ERROR] Device validation failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'خطأ في نظام التحقق من الجهاز',
      code: 'DEVICE_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const mobileUser = req.mobileUser;
    
    if (!mobileUser) {
      return res.status(401).json({
        success: false,
        error: 'مصادقة مطلوبة',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(mobileUser.role)) {
      console.warn(`[RBAC] Role access denied:`, {
        userId: mobileUser.id,
        userRole: mobileUser.role,
        requiredRoles: allowedRoles,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'لا توجد صلاحية للوصول لهذه الخدمة',
        code: 'ROLE_ACCESS_DENIED'
      });
    }

    next();
  };
};