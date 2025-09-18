// Access Control Service - Centralized service for user access validation
// Separated from ACL to avoid circular dependencies and provide clean architecture

import { db } from "./db";
import { 
  users, userRoles, roles, userGeographicAssignments, applications,
  mobileSurveySessions, governorates, districts, subDistricts, neighborhoods
} from "@shared/schema";
import { eq, and, or, inArray } from "drizzle-orm";

export interface GeographicScope {
  governorateId?: string;
  districtId?: string;
  subDistrictId?: string;
  neighborhoodId?: string;
}

export interface UserGeographicAssignment {
  id: string;
  governorateId: string | null;
  districtId: string | null;
  subDistrictId: string | null;
  neighborhoodId: string | null;
  assignmentLevel: string;
  canRead: boolean;
  canWrite: boolean;
  canApprove: boolean;
}

/**
 * Centralized Access Control Service for Yemen Construction Platform
 * Handles all user permission validation without depending on routes layer
 */
export class AccessControlService {
  
  /**
   * Get user's geographic assignments with LBAC constraints
   */
  async getUserGeographicAssignments(userId: string): Promise<UserGeographicAssignment[]> {
    try {
      const assignments = await db.select()
        .from(userGeographicAssignments)
        .where(and(
          eq(userGeographicAssignments.userId, userId),
          eq(userGeographicAssignments.isActive, true)
        ));
      
      return assignments.map(assignment => ({
        id: assignment.id,
        governorateId: assignment.governorateId,
        districtId: assignment.districtId,
        subDistrictId: assignment.subDistrictId,
        neighborhoodId: assignment.neighborhoodId,
        assignmentLevel: assignment.assignmentLevel || 'district',
        canRead: assignment.canRead || false,
        canWrite: assignment.canWrite || false,
        canApprove: assignment.canApprove || false
      }));
    } catch (error) {
      console.error('Error fetching user geographic assignments:', error);
      return [];
    }
  }

  /**
   * Check if user has access to a geographic scope
   */
  async hasGeographicAccess(userId: string, targetScope: GeographicScope): Promise<boolean> {
    try {
      const userAssignments = await this.getUserGeographicAssignments(userId);
      
      if (userAssignments.length === 0) {
        return false; // No geographic access
      }
      
      // Check if user has access to this geographic scope
      return userAssignments.some((assignment: UserGeographicAssignment) => {
        // Must have read access at minimum
        if (!assignment.canRead) return false;
        
        // Check hierarchical geographic access
        if (targetScope.governorateId && assignment.governorateId !== targetScope.governorateId) {
          return false;
        }
        if (targetScope.districtId && assignment.districtId !== targetScope.districtId) {
          return false;
        }
        if (targetScope.subDistrictId && assignment.subDistrictId !== targetScope.subDistrictId) {
          return false;
        }
        if (targetScope.neighborhoodId && assignment.neighborhoodId !== targetScope.neighborhoodId) {
          return false;
        }
        
        return true; // User has access to this scope
      });
      
    } catch (error) {
      console.error('Error checking geographic access:', error);
      return false; // SECURE DEFAULT: Deny access on error
    }
  }

  /**
   * Get user's roles and departments
   */
  async getUserRolesAndDepartments(userId: string): Promise<Array<{
    roleId: string;
    roleName: string;
    roleCode: string;
    departmentId: string | null;
  }>> {
    try {
      const userRoleResults = await db.select({
        roleId: userRoles.roleId,
        roleName: roles.name,
        roleCode: roles.code,
        departmentId: roles.departmentId
      })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));
      
      return userRoleResults.map(role => ({
        roleId: role.roleId,
        roleName: role.roleName || '',
        roleCode: role.roleCode || '',
        departmentId: role.departmentId
      }));
      
    } catch (error) {
      console.error('Error fetching user roles and departments:', error);
      return [];
    }
  }

  /**
   * Check if user is member of a department
   */
  async isDepartmentMember(userId: string, departmentId: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRolesAndDepartments(userId);
      
      return userRoles.some(role => 
        role.departmentId === departmentId
      );
      
    } catch (error) {
      console.error('Error checking department membership:', error);
      return false; // SECURE DEFAULT: Deny access on error
    }
  }

  /**
   * Check if user has surveyor/engineer role
   */
  async isSurveyorOrEngineer(userId: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRolesAndDepartments(userId);
      
      const surveyorRoles = ['surveyor', 'engineer', 'senior_engineer', 'chief_engineer'];
      return userRoles.some(role => 
        surveyorRoles.includes(role.roleCode)
      );
      
    } catch (error) {
      console.error('Error checking surveyor/engineer role:', error);
      return false; // SECURE DEFAULT: Deny access on error
    }
  }

  /**
   * Check if user is stakeholder for an application
   */
  async isApplicationStakeholder(userId: string, applicationId: string): Promise<boolean> {
    try {
      // Get application details
      const applicationResults = await db.select()
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);
      
      if (applicationResults.length === 0) {
        return false; // Application not found
      }
      
      const application = applicationResults[0];
      
      // Check if user is:
      // 1. The applicant (citizen who submitted the application)
      // 2. Assigned engineer/surveyor
      const isApplicant = application.applicantId === userId;
      const isAssigned = application.assignedToId === userId;
      
      return isApplicant || isAssigned;
      
    } catch (error) {
      console.error('Error checking application stakeholder membership:', error);
      return false; // SECURE DEFAULT: Deny access on error
    }
  }

  /**
   * Validate user access to a survey session (for attachment access)
   */
  async canAccessSurveySession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const sessionResults = await db.select()
        .from(mobileSurveySessions)
        .where(eq(mobileSurveySessions.id, sessionId))
        .limit(1);
      
      if (sessionResults.length === 0) {
        return false; // Session not found
      }
      
      const session = sessionResults[0];
      
      // Check if user is the surveyor who created the session
      if (session.surveyorId === userId) {
        return true;
      }
      
      // Check if user has geographic access to the session location
      if (session.startLocation) {
        const hasGeoAccess = await this.hasGeographicAccess(userId, {
          governorateId: session.startLocation.governorateId,
          districtId: session.startLocation.districtId,
          subDistrictId: session.startLocation.subDistrictId,
          neighborhoodId: session.startLocation.neighborhoodId,
        });
        
        if (hasGeoAccess) {
          return true;
        }
      }
      
      // Check if user is stakeholder for related application
      if (session.applicationId) {
        return await this.isApplicationStakeholder(userId, session.applicationId);
      }
      
      return false;
      
    } catch (error) {
      console.error('Error checking survey session access:', error);
      return false; // SECURE DEFAULT: Deny access on error
    }
  }
}

// Singleton instance for dependency injection
export const accessControlService = new AccessControlService();