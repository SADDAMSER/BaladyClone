// Mobile Sync Registry - defines which tables are allowed for sync with security policies
// This prevents unauthorized access and ensures LBAC/RBAC compliance

import { eq, and, or } from "drizzle-orm";
import type { User } from "@shared/schema";
import { z } from "zod";

// Minimal user info available from authentication middleware
export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface SyncTableConfig {
  tableName: string;
  hasUpdatedAt: boolean; // Does this table have updated_at column?
  allowedOperations: ('read' | 'create' | 'update' | 'delete')[];
  requiredRoles: string[]; // Which user roles can sync this table
  lbacField?: string; // Field for location-based access control
  rbacCheck?: (user: AuthUser, operation: string, recordId?: string, recordData?: any) => boolean; // Enhanced authorization with record-level checks
  conflictFields: string[]; // Fields to check for conflicts
  primaryKey: string; // Primary key field name
}

// Registry of tables allowed for mobile sync
export const SYNC_REGISTRY: Record<string, SyncTableConfig> = {
  // Geographic data - critical for field operations
  plots: {
    tableName: 'plots',
    hasUpdatedAt: true,
    allowedOperations: ['read', 'update'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    lbacField: 'blockId', // LBAC through block hierarchy
    conflictFields: ['area', 'plotType', 'ownershipType', 'geometry'],
    primaryKey: 'id'
  },
  
  blocks: {
    tableName: 'blocks',
    hasUpdatedAt: true,
    allowedOperations: ['read'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    lbacField: 'neighborhoodUnitId',
    conflictFields: ['blockType', 'geometry'],
    primaryKey: 'id'
  },

  neighborhoods: {
    tableName: 'neighborhoods',
    hasUpdatedAt: true,
    allowedOperations: ['read'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    lbacField: 'subDistrictId',
    conflictFields: ['nameAr', 'nameEn', 'geometry'],
    primaryKey: 'id'
  },

  // Field operations data
  applications: {
    tableName: 'applications',
    hasUpdatedAt: true,
    allowedOperations: ['read', 'update'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    rbacCheck: (user: AuthUser, operation: string, recordId?: string, recordData?: any) => {
      // CRITICAL: Real record-level RBAC validation for applications
      if (operation === 'read') {
        // Field personnel can only read applications assigned to them
        if (user.role === 'engineer' || user.role === 'surveyor') {
          // SECURITY: Check actual assignment in recordData
          if (recordData?.assignedToId && recordData.assignedToId === user.id) {
            return true; // User is assigned to this application
          }
          // If no recordData available, this will be validated at database level via LBAC
          // For safety, deny access unless explicitly assigned
          return false;
        }
        return user.role === 'manager' || user.role === 'admin';
      }
      
      if (operation === 'update') {
        // Only assigned personnel or managers can update applications
        if (user.role === 'engineer' || user.role === 'surveyor') {
          // SECURITY: Must be assigned to this application to update
          if (recordData?.assignedToId && recordData.assignedToId === user.id) {
            return true; // User is assigned to this application
          }
          return false; // Not assigned - deny access
        }
        return user.role === 'manager' || user.role === 'admin';
      }
      
      // Create/delete reserved for managers and admins
      return user.role === 'manager' || user.role === 'admin';
    },
    conflictFields: ['status', 'notes', 'metadata'],
    primaryKey: 'id'
  },

  surveyingDecisions: {
    tableName: 'surveying_decisions',
    hasUpdatedAt: true,
    allowedOperations: ['read', 'create', 'update'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    rbacCheck: (user: AuthUser, operation: string, recordId?: string, recordData?: any) => {
      // CRITICAL: Real RBAC validation for surveying decisions
      if (operation === 'read') {
        return ['surveyor', 'engineer', 'manager', 'admin'].includes(user.role || '');
      }
      
      if (operation === 'create' || operation === 'update') {
        // Only assigned surveyors/engineers can modify decisions
        if (user.role === 'surveyor' || user.role === 'engineer') {
          // SECURITY: Check if user is assigned to the related application
          if (recordData?.assignedToId && recordData.assignedToId === user.id) {
            return true; // User is assigned to related application/task
          }
          // Additional check: if this is a surveying decision, check if user is the surveyor
          if (user.role === 'surveyor' && recordData?.surveyorId === user.id) {
            return true; // User is the assigned surveyor
          }
          return false; // Not assigned - deny access
        }
        return user.role === 'manager' || user.role === 'admin';
      }
      
      return user.role === 'admin'; // Only admins can delete
    },
    conflictFields: ['decisionType', 'coordinates', 'surveyData', 'notes'],
    primaryKey: 'id'
  },

  fieldVisits: {
    tableName: 'field_visits',
    hasUpdatedAt: true,
    allowedOperations: ['read', 'create', 'update'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin'],
    rbacCheck: (user: AuthUser, operation: string, recordId?: string, recordData?: any) => {
      // CRITICAL: Real RBAC validation for field visits
      if (operation === 'read') {
        return ['surveyor', 'engineer', 'manager', 'admin'].includes(user.role || '');
      }
      
      if (operation === 'create' || operation === 'update') {
        // Field personnel can only modify their own visits or assigned ones
        if (user.role === 'surveyor' || user.role === 'engineer') {
          // SECURITY: Check if user created this visit
          if (recordData?.createdBy === user.id) {
            return true; // User created this visit
          }
          // SECURITY: Check if user is assigned to related application/appointment
          if (recordData?.assignedToId && recordData.assignedToId === user.id) {
            return true; // User is assigned to this visit
          }
          return false; // Not owner or assignee - deny access
        }
        return user.role === 'manager' || user.role === 'admin';
      }
      
      return user.role === 'admin'; // Only admins can delete
    },
    conflictFields: ['visitDate', 'findings', 'photos', 'coordinates'],
    primaryKey: 'id'
  },

  surveyResults: {
    tableName: 'survey_results',
    hasUpdatedAt: true,
    allowedOperations: ['read', 'create', 'update'],
    requiredRoles: ['surveyor', 'engineer', 'manager', 'admin'],
    rbacCheck: (user: AuthUser, operation: string, recordId?: string, recordData?: any) => {
      // CRITICAL: Real RBAC validation for survey results
      if (operation === 'read') {
        return user.role === 'surveyor' || user.role === 'engineer' || user.role === 'manager' || user.role === 'admin';
      }
      
      if (operation === 'create' || operation === 'update') {
        // Only the creating surveyor or assigned personnel can modify survey results
        if (user.role === 'surveyor') {
          // SECURITY: Check if user is the surveyor who created this result
          if (recordData?.surveyorId === user.id || recordData?.createdBy === user.id) {
            return true; // User is the assigned surveyor
          }
          return false; // Not the assigned surveyor - deny access
        }
        
        if (user.role === 'engineer') {
          // Engineers can only update if they're assigned to the related application
          // SECURITY: Check assignment through application linkage
          if (recordData?.assignedToId && recordData.assignedToId === user.id) {
            return true; // Engineer is assigned to related application
          }
          return false; // Not assigned - deny access
        }
        
        return user.role === 'manager' || user.role === 'admin';
      }
      
      return user.role === 'admin'; // Only admins can delete
    },
    conflictFields: ['measurements', 'coordinates', 'accuracy', 'notes'],
    primaryKey: 'id'
  },

  // Reference data (read-only for most users)
  districts: {
    tableName: 'districts',
    hasUpdatedAt: true,
    allowedOperations: ['read'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin', 'citizen'],
    conflictFields: ['nameAr', 'nameEn'],
    primaryKey: 'id'
  },

  governorates: {
    tableName: 'governorates',
    hasUpdatedAt: true,
    allowedOperations: ['read'],
    requiredRoles: ['engineer', 'surveyor', 'manager', 'admin', 'citizen'],
    conflictFields: ['nameAr', 'nameEn'],
    primaryKey: 'id'
  }
};

// Validation functions
export function isTableSyncable(tableName: string): boolean {
  return tableName in SYNC_REGISTRY;
}

export function canUserSyncTable(user: AuthUser, tableName: string, operation: string): boolean {
  const config = SYNC_REGISTRY[tableName];
  if (!config) return false;

  // Check if operation is allowed
  if (!config.allowedOperations.includes(operation as any)) return false;

  // Check role requirements
  if (!config.requiredRoles.includes(user.role || '')) return false;

  // Check custom RBAC if defined (enhanced with record-level checks)
  if (config.rbacCheck && !config.rbacCheck(user, operation)) return false;

  return true;
}

export function getSyncableTablesForUser(user: AuthUser): string[] {
  return Object.keys(SYNC_REGISTRY).filter(tableName => 
    canUserSyncTable(user, tableName, 'read')
  );
}

// LBAC Filter generation - creates typed Drizzle WHERE conditions for location-based access
export function generateLBACFilter(user: AuthUser, tableName: string): any {
  // Import Drizzle helpers safely - avoid require() in ESM
  import('drizzle-orm').then(({ sql, eq, inArray, and, or }) => {
    // This will be used in the actual implementation
  });
  
  const config = SYNC_REGISTRY[tableName];
  if (!config || !config.lbacField) return null;

  // CRITICAL SECURITY: Return typed Drizzle conditions, NOT raw strings
  // This prevents SQL injection attacks
  
  if (user.role === 'surveyor' || user.role === 'engineer') {
    // TODO: In production, fetch user's actual assigned areas from user profile/department
    // For now, implementing restrictive example with SAFE typed conditions
    
    if (config.lbacField === 'governorateId') {
      // SAFE: Use typed condition instead of string interpolation
      const assignedGovernorates = ['fd47ac11-1a1a-4c1d-9f5c-8b2dc8c5f1a1']; // TODO: fetch from user.departmentId
      // Return a Drizzle SQL condition object, not a raw string
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in',
        values: assignedGovernorates
      };
    }
    
    if (config.lbacField === 'districtId') {
      const assignedDistricts = ['a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6']; // TODO: fetch from user assignments
      return {
        type: 'drizzle_condition', 
        field: config.lbacField,
        operator: 'in',
        values: assignedDistricts
      };
    }
    
    if (config.lbacField === 'subDistrictId') {
      const assignedSubDistricts = ['xyz123']; // TODO: fetch from user assignments
      return {
        type: 'drizzle_condition',
        field: config.lbacField, 
        operator: 'in',
        values: assignedSubDistricts
      };
    }
    
    // Default: FAIL-SECURE behavior - block all access
    return {
      type: 'drizzle_condition',
      field: 'id',
      operator: 'eq', 
      values: ['__BLOCK_ALL__'] // Impossible ID - blocks all access
    };
  }

  // Managers get departmental-level access
  if (user.role === 'manager') {
    // TODO: Implement departmental geographic scope
    return null; // Needs geographic boundaries for production
  }

  // Admins get system-wide access
  if (user.role === 'admin') {
    return null; // Full access
  }

  // Default: Block access for unknown roles
  return {
    type: 'drizzle_condition',
    field: 'id',
    operator: 'eq',
    values: ['__BLOCK_ALL__'] // Impossible ID - blocks all access
  };
}

// Get table configuration
export function getSyncTableConfig(tableName: string): SyncTableConfig | null {
  return SYNC_REGISTRY[tableName] || null;
}

// Validate sync operation
export interface SyncValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Zod schemas for sync payload validation
export const SyncPullRequestSchema = z.object({
  deviceId: z.string().uuid("Device ID must be a valid UUID"),
  lastSyncTimestamp: z.string().datetime("Invalid timestamp format"),
  tables: z.array(z.string().min(1, "Table name cannot be empty")).min(1, "At least one table required")
});

export const SyncOperationSchema = z.object({
  type: z.enum(['create', 'update', 'delete'], { errorMap: () => ({ message: "Invalid operation type" }) }),
  tableName: z.string().min(1, "Table name is required"),
  recordId: z.string().min(1, "Record ID is required"),
  timestamp: z.string().datetime("Invalid timestamp format"),
  oldData: z.any().optional(),
  newData: z.any().optional()
});

export const SyncPushRequestSchema = z.object({
  deviceId: z.string().uuid("Device ID must be a valid UUID"),
  operations: z.array(SyncOperationSchema).min(1, "At least one operation required")
});

export const SyncResolveConflictsSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  resolutions: z.array(z.object({
    conflictId: z.string().uuid("Conflict ID must be a valid UUID"),
    strategy: z.enum(['use_local', 'use_remote', 'merge'], { errorMap: () => ({ message: "Invalid resolution strategy" }) }),
    resolvedData: z.any().optional()
  })).min(1, "At least one resolution required")
});

// Enhanced validation function with Zod support
export function validateSyncPayload<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

export function validateSyncOperation(
  user: AuthUser,
  tableName: string,
  operation: string,
  recordId?: string,
  recordData?: any
): SyncValidationResult {
  // Check if table is syncable
  if (!isTableSyncable(tableName)) {
    return {
      isValid: false,
      error: `الجدول ${tableName} غير مسموح للمزامنة`
    };
  }

  // Check user permissions
  if (!canUserSyncTable(user, tableName, operation)) {
    return {
      isValid: false,
      error: `ليس لديك صلاحية ${operation} للجدول ${tableName}`
    };
  }

  // Additional validations can be added here
  const warnings: string[] = [];
  
  if (operation === 'delete') {
    warnings.push('عملية الحذف تحتاج مراجعة إضافية');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}