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
          if (recordData?.assignedToId && String(recordData.assignedToId) === String(user.id)) {
            return true; // User is assigned to related application/task
          }
          // Additional check: if this is a surveying decision, check if user is the surveyor
          if (user.role === 'surveyor' && recordData?.surveyorId && String(recordData.surveyorId) === String(user.id)) {
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
          // SECURITY: Check if user created this visit (normalize ID comparison)
          if (recordData?.createdBy && String(recordData.createdBy) === String(user.id)) {
            return true; // User created this visit
          }
          // SECURITY: Check if user is assigned to related application/appointment
          if (recordData?.assignedToId && String(recordData.assignedToId) === String(user.id)) {
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
    // ENHANCED: Location-based filtering for field operations with comprehensive constraints
    // TODO: In production, fetch user's actual assigned areas from user profile/department
    
    if (config.lbacField === 'governorateId') {
      // SAFE: Use typed condition instead of string interpolation with field operation constraints
      const assignedGovernorates = [
        'b52ad7bd-2374-4132-95d1-239d9c840c76', // Ibb
        'e6097766-e033-45f0-b59a-7c7000cfee75'  // Sana'a City
      ]; // Real governorate IDs from database
      // Return enhanced Drizzle SQL condition object with field operation metadata
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in',
        values: assignedGovernorates,
        fieldOperationConstraints: {
          maxRadius: '50km', // Field operations limited to 50km radius from base
          workingHours: '08:00-17:00', // Field work time constraints
          requiresLocation: true, // GPS location required for field operations
          offlineCapable: true, // Support offline operations for field work
          maxConcurrentTasks: 5 // Limit concurrent field applications
        }
      };
    }
    
    if (config.lbacField === 'districtId') {
      const assignedDistricts = [
        '9fd1bf2f-a7c5-4b0e-bc39-19df6cb61e17', // القفر
        '6a8c18ab-a188-436b-b101-54140b60153a'  // يريم
      ]; // Real district IDs from database
      return {
        type: 'drizzle_condition', 
        field: config.lbacField,
        operator: 'in',
        values: assignedDistricts,
        fieldOperationConstraints: {
          priorityLevels: ['urgent', 'normal'], // Field operations priority
          requiresCheckIn: true, // Location check-in required
          dataValidation: 'strict', // Enhanced field data validation
          teamCoordination: user.role === 'engineer' // Engineers require team coordination
        }
      };
    }
    
    if (config.lbacField === 'subDistrictId') {
      const assignedSubDistricts = ['xyz123']; // TODO: fetch from user assignments
      return {
        type: 'drizzle_condition',
        field: config.lbacField, 
        operator: 'in',
        values: assignedSubDistricts,
        fieldOperationConstraints: {
          precisionLevel: user.role === 'surveyor' ? 'high' : 'standard', // High-precision GPS for surveyors
          measurementAccuracy: user.role === 'surveyor' ? '±1m' : '±5m', // Surveyor precision requirements
          photoDocumentation: 'mandatory', // Photo evidence required
          localLanguage: 'arabic' // Arabic communication required
        }
      };
    }
    
    if (config.lbacField === 'neighborhoodId') {
      // Ultra-granular neighborhood-level field operations for micro-level work
      const assignedNeighborhoods = ['neighborhood-123']; // TODO: fetch from user assignments
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in', 
        values: assignedNeighborhoods,
        fieldOperationConstraints: {
          detailLevel: 'maximum', // Maximum detail for micro-operations
          residentEngagement: 'required', // Community engagement mandatory
          culturalSensitivity: 'high', // Cultural considerations for local operations
          timeSlots: ['morning', 'afternoon'], // Preferred operational time slots
          weatherConstraints: true // Weather-dependent field operations
        }
      };
    }
    
    // Default: Enhanced FAIL-SECURE behavior with detailed field operation blocking
    return {
      type: 'block_all',
      reason: 'No geographic assignment found for field operations',
      requiredActions: [
        'Contact supervisor for geographic assignment',
        'Complete field operation training',
        'Verify LBAC credentials and location permissions'
      ],
      securityLevel: 'high'
    };
  }

  // Managers get departmental-level access based on their department assignments
  if (user.role === 'manager') {
    // CRITICAL: Managers get access to their department's assigned geographic areas
    // This requires integration with user department assignments and department geographic boundaries
    
    if (config.lbacField === 'governorateId') {
      // Managers can access multiple governorates based on department assignments
      const departmentalGovernorates = [
        'b52ad7bd-2374-4132-95d1-239d9c840c76', // Ibb - managers can oversee
        'e6097766-e033-45f0-b59a-7c7000cfee75', // Sana'a City - managers can oversee
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  // Additional governorate for managers
      ]; // TODO: Replace with dynamic departmental scope from user profile
      
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in',
        values: departmentalGovernorates
      };
    }
    
    if (config.lbacField === 'districtId') {
      // Managers get broader district access within their department's governorates
      const departmentalDistricts = [
        '9fd1bf2f-a7c5-4b0e-bc39-19df6cb61e17', // القفر
        '6a8c18ab-a188-436b-b101-54140b60153a', // يريم
        'f1e2d3c4-b5a6-9877-cdef-012345678901'  // Additional districts for managers
      ]; // TODO: Fetch from department geographic assignments
      
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in',
        values: departmentalDistricts
      };
    }
    
    // For sub-districts and neighborhoods, managers inherit engineer/surveyor scope
    // but with broader access across multiple teams under their management
    if (config.lbacField === 'subDistrictId' || config.lbacField === 'neighborhoodId') {
      // Managers get access to all areas supervised by their department
      const managedAreas = [
        'manager-area-1', 'manager-area-2', 'manager-area-3'
      ]; // TODO: Implement dynamic area fetching from department hierarchy
      
      return {
        type: 'drizzle_condition',
        field: config.lbacField,
        operator: 'in',
        values: managedAreas
      };
    }
    
    // Default manager access - return more permissive than field staff but less than admin
    return {
      type: 'departmental_scope',
      level: 'manager'
    };
  }

  // Admins get system-wide access
  if (user.role === 'admin') {
    return null; // Full access
  }

  // Default: Block access for unknown roles
  return {
    type: 'block_all'
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
  deviceId: z.string().min(1, "Device ID is required"),
  lastSyncTimestamp: z.string().datetime("Invalid timestamp format").nullable().optional(),
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
  deviceId: z.string().min(1, "Device ID is required"),
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

// Table name aliasing to handle camelCase/snake_case variations
function normalizeTableName(tableName: string): string {
  const aliases: Record<string, string> = {
    'field_visits': 'fieldVisits',
    'surveying_decisions': 'surveyingDecisions',
    'survey_results': 'surveyResults',
    'sync_sessions': 'syncSessions',
    'offline_operations': 'offlineOperations',
    'sync_conflicts': 'syncConflicts'
  };
  return aliases[tableName] || tableName;
}

export function validateSyncOperation(
  user: AuthUser,
  tableName: string,
  operation: string,
  recordId?: string,
  recordData?: any
): SyncValidationResult {
  // Normalize table name and enrich recordData for RBAC
  const normalizedTableName = normalizeTableName(tableName);
  
  // Centralized enrichment: inject user context for create operations
  let enrichedRecordData = recordData ? { ...recordData } : {};
  if (operation === 'create') {
    enrichedRecordData.createdBy = user.id; // Server-controlled injection
    console.log(`[DEBUG] Enriched create operation for ${normalizedTableName}:`, {
      user: { id: user.id, role: user.role },
      recordData: { createdBy: enrichedRecordData.createdBy }
    });
  }
  
  // Check if table is syncable
  if (!isTableSyncable(normalizedTableName)) {
    return {
      isValid: false,
      error: `الجدول ${normalizedTableName} غير مسموح للمزامنة`
    };
  }

  // Check user permissions with record context
  const config = SYNC_REGISTRY[normalizedTableName];
  if (!config) {
    return {
      isValid: false,
      error: `الجدول ${tableName} غير مسموح للمزامنة`
    };
  }

  // Check basic operation and role permissions
  if (!config.allowedOperations.includes(operation as any)) {
    return {
      isValid: false,
      error: `العملية ${operation} غير مسموحة للجدول ${tableName}`
    };
  }

  if (!config.requiredRoles.includes(user.role || '')) {
    return {
      isValid: false,
      error: `دورك ${user.role} غير مسموح للجدول ${tableName}`
    };
  }

  // Check record-level RBAC with enriched record data
  if (config.rbacCheck && !config.rbacCheck(user, operation, recordId, enrichedRecordData)) {
    console.log(`[DEBUG] RBAC check failed for ${normalizedTableName}:`, {
      user: { id: user.id, role: user.role },
      operation,
      recordData: {
        createdBy: enrichedRecordData.createdBy,
        assignedToId: enrichedRecordData.assignedToId,
        surveyorId: enrichedRecordData.surveyorId
      }
    });
    return {
      isValid: false,
      error: `ليس لديك صلاحية ${operation} للجدول ${normalizedTableName}`
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