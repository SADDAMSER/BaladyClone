// Frontend User Management Types - unified with shared/schema
import type { users, roles, permissions, departments, positions } from "@shared/schema";

// Base database types from shared schema
export type UserSelect = typeof users.$inferSelect;
export type RoleSelect = typeof roles.$inferSelect;
export type PermissionSelect = typeof permissions.$inferSelect;
export type DepartmentSelect = typeof departments.$inferSelect;
export type PositionSelect = typeof positions.$inferSelect;

// Frontend ViewModel for UserManagement page
export interface FrontendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  nationalId?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  
  // Department and Position info
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionTitle?: string;
  
  // Role information
  roles: FrontendRole[];
  legacyRole: string; // citizen, employee, manager, admin
}

export interface FrontendRole {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  isActive: boolean;
}

export interface FrontendPermission {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  category: string;
  resource: string;
  action: string;
  scope: string;
  isSystemPermission: boolean;
  isActive: boolean;
}

// API Response types for complex queries
export interface UserWithRelations extends UserSelect {
  department?: DepartmentSelect;
  position?: PositionSelect;
  roles?: (RoleSelect & {
    permissions?: PermissionSelect[];
  })[];
  permissions?: PermissionSelect[];
}

// Adapter function: Convert API response to FrontendUser
export function adaptUserToFrontend(apiUser: UserWithRelations): FrontendUser {
  return {
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    fullName: apiUser.fullName,
    phoneNumber: apiUser.phoneNumber || undefined,
    nationalId: apiUser.nationalId || undefined,
    isActive: apiUser.isActive || false,
    createdAt: new Date(apiUser.createdAt || Date.now()),
    lastLogin: undefined, // TODO: Implement in API when available
    
    // Department and Position
    departmentId: apiUser.departmentId || undefined,
    departmentName: apiUser.department?.name || undefined,
    positionId: apiUser.positionId || undefined,
    positionTitle: apiUser.position?.title || undefined,
    
    // Roles
    roles: (apiUser.roles || []).map(adaptRoleToFrontend),
    legacyRole: apiUser.role || 'citizen',
  };
}

// Adapter function: Convert API role to FrontendRole
export function adaptRoleToFrontend(apiRole: RoleSelect): FrontendRole {
  return {
    id: apiRole.id,
    code: apiRole.code,
    nameAr: apiRole.nameAr,
    nameEn: apiRole.nameEn,
    description: apiRole.description || undefined,
    level: apiRole.level,
    isSystemRole: apiRole.isSystemRole || false,
    isActive: apiRole.isActive || false,
  };
}

// Adapter function: Convert API permission to FrontendPermission
export function adaptPermissionToFrontend(apiPermission: PermissionSelect): FrontendPermission {
  return {
    id: apiPermission.id,
    code: apiPermission.code,
    nameAr: apiPermission.nameAr,
    nameEn: apiPermission.nameEn,
    description: apiPermission.description || undefined,
    category: apiPermission.category,
    resource: apiPermission.resource,
    action: apiPermission.action,
    scope: apiPermission.scope || 'own',
    isSystemPermission: apiPermission.isSystemPermission || false,
    isActive: apiPermission.isActive || false,
  };
}

// Search and filter parameters for user queries
export interface UserQueryParams {
  search?: string;
  roleId?: string;
  departmentId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// User statistics for dashboard
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

// Role assignment payload
export interface RoleAssignmentPayload {
  roleIds: string[];
}