// Mobile Authentication Middleware for Yemen Construction Platform
// Enhanced security for mobile API endpoints with LBAC/RBAC integration

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, userRoles, roles, userGeographicAssignments } from '@shared/schema';
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
        error: 'رمز المصادقة مطلوب للوصول لهذه الخدمة',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // Handle both 'Bearer token' and direct token formats
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'رمز المصادقة غير صحيح',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[SECURITY] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'خطأ في تكوين النظام',
        code: 'SERVER_CONFIG_ERROR'
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
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch user details with roles and geographic assignments
    const userResults = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userResults.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير موجود أو تم حذف حسابه',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResults[0];

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'الحساب معطل. راجع الإدارة',
        code: 'ACCOUNT_DISABLED'
      });
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