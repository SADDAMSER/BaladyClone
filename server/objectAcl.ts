import { File } from "@google-cloud/storage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

// The type of the access group for Yemen Construction Platform
// Based on government organizational structure and geographic assignments
export enum ObjectAccessGroupType {
  USER_LIST = "USER_LIST", // Specific list of users (e.g., survey team members)
  GEOGRAPHIC_SCOPE = "GEOGRAPHIC_SCOPE", // Users with geographic assignments (LBAC)
  DEPARTMENT_MEMBERS = "DEPARTMENT_MEMBERS", // Members of specific government departments
  SURVEYOR_GROUP = "SURVEYOR_GROUP", // Certified surveyors for specific regions
  APPLICATION_STAKEHOLDERS = "APPLICATION_STAKEHOLDERS", // Users related to specific building permit/survey application
}

// The logic user group that can access the object.
export interface ObjectAccessGroup {
  // The type of the access group.
  type: ObjectAccessGroupType;
  // The logic id that is enough to identify the qualified group members.
  //
  // It may have different format for different types. For example:
  // - for USER_LIST: comma-separated list of user UUIDs
  // - for GEOGRAPHIC_SCOPE: JSON with governorateId, districtId, etc.
  // - for DEPARTMENT_MEMBERS: department UUID
  // - for SURVEYOR_GROUP: geographic region identifier
  // - for APPLICATION_STAKEHOLDERS: application UUID
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

// The ACL policy of the object.
// This would be set as part of the object custom metadata:
// - key: "custom:aclPolicy"
// - value: JSON string of the ObjectAclPolicy object.
export interface ObjectAclPolicy {
  owner: string; // User UUID who uploaded the file (usually surveyor)
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
  // Yemen Platform specific metadata
  applicationId?: string; // Related building permit or survey application
  sessionId?: string; // Related mobile survey session
  geographicScope?: {
    governorateId?: string;
    districtId?: string;
    subDistrictId?: string;
    neighborhoodId?: string;
  };
  // Content classification for government compliance
  classification?: "public" | "internal" | "restricted" | "confidential";
  retentionPolicy?: {
    retentionYears: number;
    archiveAfterYears?: number;
    requiresApprovalForDeletion?: boolean;
  };
}

// Check if the requested permission is allowed based on the granted permission.
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  // Users granted with read or write permissions can read the object.
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }

  // Only users granted with write permissions can write the object.
  return granted === ObjectPermission.WRITE;
}

// The base class for all access groups.
//
// Different types of access groups can be implemented according to the use case.
abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  // Check if the user is a member of the group.
  public abstract hasMember(userId: string): Promise<boolean>;
}

// User list access group implementation
class UserListAccessGroup extends BaseObjectAccessGroup {
  constructor(id: string) {
    super(ObjectAccessGroupType.USER_LIST, id);
  }

  async hasMember(userId: string): Promise<boolean> {
    try {
      const userList = this.id.split(',').map(u => u.trim());
      return userList.includes(userId);
    } catch (error) {
      console.error('Error checking user list membership:', error);
      return false;
    }
  }
}

// Geographic scope access group (integrates with LBAC system)
class GeographicScopeAccessGroup extends BaseObjectAccessGroup {
  constructor(id: string) {
    super(ObjectAccessGroupType.GEOGRAPHIC_SCOPE, id);
  }

  async hasMember(userId: string): Promise<boolean> {
    try {
      // Parse geographic scope from id (JSON string)
      const scope = JSON.parse(this.id);
      
      // This would integrate with the existing LBAC system
      // For now, we'll implement a simplified check
      // In production, this should call getUserGeographicAssignments()
      
      // TODO: Integrate with actual LBAC validation
      // const userAssignments = await getUserGeographicAssignments(userId);
      // return userAssignments.some(assignment => 
      //   matchesGeographicScope(assignment, scope)
      // );
      
      return true; // Simplified for MVP
    } catch (error) {
      console.error('Error checking geographic scope membership:', error);
      return false;
    }
  }
}

// Department members access group
class DepartmentMembersAccessGroup extends BaseObjectAccessGroup {
  constructor(id: string) {
    super(ObjectAccessGroupType.DEPARTMENT_MEMBERS, id);
  }

  async hasMember(userId: string): Promise<boolean> {
    try {
      // TODO: Integrate with department membership system
      // const userDepartments = await getUserDepartments(userId);
      // return userDepartments.some(dept => dept.id === this.id);
      
      return true; // Simplified for MVP
    } catch (error) {
      console.error('Error checking department membership:', error);
      return false;
    }
  }
}

// Surveyor group access (for region-specific survey data)
class SurveyorGroupAccessGroup extends BaseObjectAccessGroup {
  constructor(id: string) {
    super(ObjectAccessGroupType.SURVEYOR_GROUP, id);
  }

  async hasMember(userId: string): Promise<boolean> {
    try {
      // TODO: Integrate with surveyor certification system
      // const surveyorCertifications = await getSurveyorCertifications(userId);
      // return surveyorCertifications.some(cert => cert.regionId === this.id);
      
      return true; // Simplified for MVP
    } catch (error) {
      console.error('Error checking surveyor group membership:', error);
      return false;
    }
  }
}

// Application stakeholders group (citizens, engineers, government staff for specific applications)
class ApplicationStakeholdersAccessGroup extends BaseObjectAccessGroup {
  constructor(id: string) {
    super(ObjectAccessGroupType.APPLICATION_STAKEHOLDERS, id);
  }

  async hasMember(userId: string): Promise<boolean> {
    try {
      // TODO: Integrate with application stakeholder system
      // const applicationStakeholders = await getApplicationStakeholders(this.id);
      // return applicationStakeholders.some(stakeholder => stakeholder.userId === userId);
      
      return true; // Simplified for MVP
    } catch (error) {
      console.error('Error checking application stakeholder membership:', error);
      return false;
    }
  }
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    case ObjectAccessGroupType.USER_LIST:
      return new UserListAccessGroup(group.id);
    case ObjectAccessGroupType.GEOGRAPHIC_SCOPE:
      return new GeographicScopeAccessGroup(group.id);
    case ObjectAccessGroupType.DEPARTMENT_MEMBERS:
      return new DepartmentMembersAccessGroup(group.id);
    case ObjectAccessGroupType.SURVEYOR_GROUP:
      return new SurveyorGroupAccessGroup(group.id);
    case ObjectAccessGroupType.APPLICATION_STAKEHOLDERS:
      return new ApplicationStakeholdersAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// Sets the ACL policy to the object metadata.
export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }

  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
    },
  });
}

// Gets the ACL policy from the object metadata.
export async function getObjectAclPolicy(
  objectFile: File,
): Promise<ObjectAclPolicy | null> {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy as string);
}

// Checks if the user can access the object.
export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: File;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // When this function is called, the acl policy is required.
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }

  // Public objects are always accessible for read.
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Access control requires the user id.
  if (!userId) {
    return false;
  }

  // The owner of the object can always access it.
  if (aclPolicy.owner === userId) {
    return true;
  }

  // Go through the ACL rules to check if the user has the required permission.
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}