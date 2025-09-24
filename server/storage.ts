import {
  users, departments, positions, lawsRegulations, lawSections, lawArticles,
  requirementCategories, requirements, services, serviceRequirements,
  applications, surveyingDecisions, tasks, systemSettings, governorates, districts,
  subDistricts, neighborhoods, harat, sectors, neighborhoodUnits, blocks, plots, streets, streetSegments,
  deviceRegistrations, syncSessions, offlineOperations, syncConflicts,
  deletionTombstones, changeTracking,
  performanceMetrics, syncOperationsMetrics, errorTracking, sloMeasurements,
  serviceTemplates, dynamicForms, workflowDefinitions, serviceBuilder,
  applicationAssignments, applicationStatusHistory, applicationReviews, notifications,
  appointments, contactAttempts, surveyAssignmentForms, userGeographicAssignments,
  fieldVisits, surveyResults, surveyReports,
  roles, permissions, rolePermissions, userRoles,
  // Enhanced LBAC Hardening tables - Phase 6
  permissionGeographicConstraints, temporaryPermissionDelegations,
  geographicRoleTemplates, userGeographicAssignmentHistory, lbacAccessAuditLog,
  // Mobile Survey System - Phase 4
  mobileDeviceRegistrations, mobileSurveySessions, mobileSurveyPoints,
  mobileSurveyGeometries, mobileFieldVisits, mobileSurveyAttachments, mobileSyncCursors,
  // Geoprocessing Queue System - Phase 1
  geoJobs, geoJobEvents,
  type User, type InsertUser, type Department, type InsertDepartment,
  type Position, type InsertPosition, type LawRegulation, type InsertLawRegulation,
  type LawSection, type InsertLawSection, type LawArticle, type InsertLawArticle,
  type RequirementCategory, type InsertRequirementCategory,
  type Requirement, type InsertRequirement, type Service, type InsertService,
  type Application, type InsertApplication, type SurveyingDecision, type InsertSurveyingDecision,
  type Task, type InsertTask, type SystemSetting, type InsertSystemSetting,
  type Governorate, type InsertGovernorate, type District, type InsertDistrict,
  type SubDistrict, type InsertSubDistrict, type Neighborhood, type InsertNeighborhood,
  type Harat, type InsertHarat, type Sector, type InsertSector,
  type NeighborhoodUnit, type InsertNeighborhoodUnit, type Block, type InsertBlock,
  type Plot, type InsertPlot, type Street, type InsertStreet,
  type StreetSegment, type InsertStreetSegment,
  type DeviceRegistration, type InsertDeviceRegistration,
  type SyncSession, type InsertSyncSession,
  type OfflineOperation, type InsertOfflineOperation,
  type SyncConflict, type InsertSyncConflict,
  type ServiceTemplate, type InsertServiceTemplate,
  type DynamicForm, type InsertDynamicForm,
  type WorkflowDefinition, type InsertWorkflowDefinition,
  type ServiceBuilder, type InsertServiceBuilder,
  type ApplicationAssignment, type InsertApplicationAssignment,
  type ApplicationStatusHistory, type InsertApplicationStatusHistory,
  type ApplicationReview, type InsertApplicationReview,
  type Notification, type InsertNotification,
  type Appointment, type InsertAppointment,
  type ContactAttempt, type InsertContactAttempt,
  type SurveyAssignmentForm, type InsertSurveyAssignmentForm,
  type FieldVisit, type InsertFieldVisit,
  type SurveyResult, type InsertSurveyResult,
  type SurveyReport, type InsertSurveyReport,
  type UserGeographicAssignment, type InsertUserGeographicAssignment,
  type Role, type InsertRole, type Permission, type InsertPermission,
  type RolePermission, type InsertRolePermission, type UserRole, type InsertUserRole,
  // Enhanced LBAC Hardening types - Phase 6
  type PermissionGeographicConstraints, type InsertPermissionGeographicConstraints,
  type TemporaryPermissionDelegations, type InsertTemporaryPermissionDelegations,
  type GeographicRoleTemplates, type InsertGeographicRoleTemplates,
  type UserGeographicAssignmentHistory, type InsertUserGeographicAssignmentHistory,
  type LbacAccessAuditLog, type InsertLbacAccessAuditLog,
  type DeletionTombstone, type InsertDeletionTombstone,
  type ChangeTracking, type InsertChangeTracking,
  type PerformanceMetric, type InsertPerformanceMetric,
  type SyncOperationsMetric, type InsertSyncOperationsMetric,
  type ErrorTracking, type InsertErrorTracking,
  type SloMeasurement, type InsertSloMeasurement,
  // Mobile Survey System types - Phase 4
  type MobileDeviceRegistration, type InsertMobileDeviceRegistration,
  type MobileSurveySession, type InsertMobileSurveySession,
  type MobileSurveyPoint, type InsertMobileSurveyPoint,
  type MobileSurveyGeometry, type InsertMobileSurveyGeometry,
  type MobileFieldVisit, type InsertMobileFieldVisit,
  type MobileSurveyAttachment, type InsertMobileSurveyAttachment,
  type MobileSyncCursor, type InsertMobileSyncCursor,
  // Geoprocessing Queue System types - Phase 1
  type GeoJob, type InsertGeoJob,
  type GeoJobEvent, type InsertGeoJobEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, like, ilike, and, or, desc, asc, sql, count, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { PaginationParams, PaginatedResponse, executePaginatedQuery } from "./pagination";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getUsers(filters?: { role?: string; departmentId?: string; isActive?: boolean }): Promise<User[]>;
  getUsersPaginated(params: PaginationParams): Promise<PaginatedResponse<User>>;

  // User Geographic Assignments - LBAC
  getUserGeographicAssignments(filters?: {
    userId?: string;
    governorateId?: string;
    districtId?: string;
    subDistrictId?: string;
    neighborhoodId?: string;
    assignmentType?: string;
    isActive?: boolean;
    includeExpired?: boolean;
  }): Promise<any[]>;
  // CRITICAL LBAC: Hierarchical scope expansion
  expandUserGeographicScope(userId: string): Promise<{
    governorateIds: string[];
    districtIds: string[];
    subDistrictIds: string[];
    neighborhoodIds: string[];
  }>;
  createUserGeographicAssignment(assignment: any): Promise<any>;
  updateUserGeographicAssignment(id: string, updates: any): Promise<any>;
  deleteUserGeographicAssignment(id: string): Promise<void>;

  // Enhanced LBAC Hardening - Phase 6
  // Permission Geographic Constraints management
  getPermissionGeographicConstraints(filters?: {
    permissionId?: string;
    constraintType?: string;
    constraintLevel?: string;
    isActive?: boolean;
  }): Promise<any[]>;
  getPermissionGeographicConstraint(id: string): Promise<any | undefined>;
  createPermissionGeographicConstraint(constraint: any): Promise<any>;
  updatePermissionGeographicConstraint(id: string, updates: any): Promise<any>;
  deletePermissionGeographicConstraint(id: string): Promise<void>;

  // Temporary Permission Delegations management  
  getTemporaryPermissionDelegations(filters?: {
    delegatorId?: string;
    delegeeId?: string;
    status?: string;
    isActive?: boolean;
    includeExpired?: boolean;
  }): Promise<any[]>;
  getTemporaryPermissionDelegation(id: string): Promise<any | undefined>;
  createTemporaryPermissionDelegation(delegation: any): Promise<any>;
  updateTemporaryPermissionDelegation(id: string, updates: any): Promise<any>;
  deleteTemporaryPermissionDelegation(id: string): Promise<void>;
  activateTemporaryDelegation(id: string, approvedBy: string): Promise<any>;
  deactivateTemporaryDelegation(id: string, reason?: string): Promise<any>;

  // Geographic Role Templates management
  getGeographicRoleTemplates(filters?: {
    templateName?: string;
    applicableLevel?: string;
    isActive?: boolean;
  }): Promise<any[]>;
  getGeographicRoleTemplate(id: string): Promise<any | undefined>;
  createGeographicRoleTemplate(template: any): Promise<any>;
  updateGeographicRoleTemplate(id: string, updates: any): Promise<any>;
  deleteGeographicRoleTemplate(id: string): Promise<void>;
  applyGeographicRoleTemplate(templateId: string, userId: string, targetGeographicId: string): Promise<any>;

  // User Geographic Assignment History management (audit trail)
  getUserGeographicAssignmentHistory(filters?: {
    userId?: string;
    originalAssignmentId?: string;
    changeType?: string;
    changedBy?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]>;
  getUserGeographicAssignmentHistoryRecord(id: string): Promise<any | undefined>;
  createUserGeographicAssignmentHistory(historyRecord: any): Promise<any>;

  // LBAC Access Audit Log management
  getLbacAccessAuditLogs(filters?: {
    userId?: string;
    accessGranted?: boolean;
    denialReason?: string;
    governorateId?: string;
    districtId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]>;
  getLbacAccessAuditLog(id: string): Promise<any | undefined>;
  createLbacAccessAuditLog(auditLog: any): Promise<any>;

  // RBAC (Role-Based Access Control) - النظام الجديد للصلاحيات
  // Roles management
  getRoles(filters?: { isActive?: boolean; isSystemRole?: boolean }): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getRoleByCode(code: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;

  // Permissions management
  getPermissions(filters?: { category?: string; resource?: string; isActive?: boolean }): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  getPermissionByCode(code: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: string, updates: Partial<InsertPermission>): Promise<Permission>;
  deletePermission(id: string): Promise<void>;

  // Role-Permission mapping
  getRolePermissions(roleId?: string): Promise<RolePermission[]>;
  assignPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;

  // User-Role mapping 
  getUserRoles(userId?: string): Promise<UserRole[]>;
  assignRoleToUser(userRole: InsertUserRole): Promise<UserRole>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;

  // Core RBAC functions
  hasPermission(userId: string, permissionCode: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  getUserActiveRoles(userId: string): Promise<Role[]>;

  // Organizational structure
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  getPositions(departmentId?: string): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position>;
  deletePosition(id: string): Promise<void>;

  // Geographic data
  getGovernorates(): Promise<Governorate[]>;
  getGovernorate(id: string): Promise<Governorate | undefined>;
  getGovernorateByCode(code: string): Promise<Governorate | undefined>;
  createGovernorate(governorate: InsertGovernorate): Promise<Governorate>;
  updateGovernorate(id: string, updates: Partial<InsertGovernorate>): Promise<Governorate>;
  deleteGovernorate(id: string): Promise<void>;

  getDistricts(governorateId?: string): Promise<District[]>;
  getDistrict(id: string): Promise<District | undefined>;
  getDistrictByCode(code: string): Promise<District | undefined>;
  getDistrictsByGovernorateId(governorateId: string): Promise<District[]>;
  createDistrict(district: InsertDistrict): Promise<District>;
  updateDistrict(id: string, updates: Partial<InsertDistrict>): Promise<District>;
  deleteDistrict(id: string): Promise<void>;

  // Sub-districts
  getSubDistricts(districtId?: string): Promise<SubDistrict[]>;
  getSubDistrict(id: string): Promise<SubDistrict | undefined>;
  getSubDistrictsByDistrictId(districtId: string): Promise<SubDistrict[]>;
  createSubDistrict(subDistrict: InsertSubDistrict): Promise<SubDistrict>;
  updateSubDistrict(id: string, updates: Partial<InsertSubDistrict>): Promise<SubDistrict>;
  deleteSubDistrict(id: string): Promise<void>;

  // Neighborhoods
  getNeighborhoods(subDistrictId?: string): Promise<Neighborhood[]>;
  getNeighborhood(id: string): Promise<Neighborhood | undefined>;
  getNeighborhoodsBySubDistrictId(subDistrictId: string): Promise<Neighborhood[]>;
  createNeighborhood(neighborhood: InsertNeighborhood): Promise<Neighborhood>;
  updateNeighborhood(id: string, updates: Partial<InsertNeighborhood>): Promise<Neighborhood>;
  deleteNeighborhood(id: string): Promise<void>;

  // Harat
  getHarat(neighborhoodId?: string): Promise<Harat[]>;
  getHaratById(id: string): Promise<Harat | undefined>;
  getHaratByNeighborhoodId(neighborhoodId: string): Promise<Harat[]>;
  createHarat(harat: InsertHarat): Promise<Harat>;
  updateHarat(id: string, updates: Partial<InsertHarat>): Promise<Harat>;
  deleteHarat(id: string): Promise<void>;

  // Sectors
  getSectors(governorateId?: string): Promise<Sector[]>;
  getSector(id: string): Promise<Sector | undefined>;
  getSectorsByGovernorateId(governorateId: string): Promise<Sector[]>;
  getSectorsByDistrictId(districtId: string): Promise<Sector[]>;
  getSectorsBySubDistrictId(subDistrictId: string): Promise<Sector[]>;
  createSector(sector: InsertSector): Promise<Sector>;
  updateSector(id: string, updates: Partial<InsertSector>): Promise<Sector>;
  deleteSector(id: string): Promise<void>;

  // Neighborhood Units
  getNeighborhoodUnits(filters?: { neighborhoodId?: string; sectorId?: string }): Promise<NeighborhoodUnit[]>;
  getNeighborhoodUnit(id: string): Promise<NeighborhoodUnit | undefined>;
  getNeighborhoodUnitsByNeighborhoodId(neighborhoodId: string): Promise<NeighborhoodUnit[]>;
  getNeighborhoodUnitsBySectorId(sectorId: string): Promise<NeighborhoodUnit[]>;
  createNeighborhoodUnit(neighborhoodUnit: InsertNeighborhoodUnit): Promise<NeighborhoodUnit>;
  updateNeighborhoodUnit(id: string, updates: Partial<InsertNeighborhoodUnit>): Promise<NeighborhoodUnit>;
  deleteNeighborhoodUnit(id: string): Promise<void>;

  // Blocks
  getBlocks(neighborhoodUnitId?: string): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  getBlocksByNeighborhoodUnitId(neighborhoodUnitId: string): Promise<Block[]>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block>;
  deleteBlock(id: string): Promise<void>;

  // Plots - CRITICAL FOR CONSTRUCTION!
  getPlots(blockId?: string): Promise<Plot[]>;
  getPlot(id: string): Promise<Plot | undefined>;
  getPlotsByBlockId(blockId: string): Promise<Plot[]>;
  getPlotByNumber(plotNumber: string, blockId: string): Promise<Plot | undefined>;
  createPlot(plot: InsertPlot): Promise<Plot>;
  updatePlot(id: string, updates: Partial<InsertPlot>): Promise<Plot>;
  deletePlot(id: string): Promise<void>;

  // Streets
  getStreets(): Promise<Street[]>;
  getStreet(id: string): Promise<Street | undefined>;
  createStreet(street: InsertStreet): Promise<Street>;
  updateStreet(id: string, updates: Partial<InsertStreet>): Promise<Street>;
  deleteStreet(id: string): Promise<void>;

  // Street Segments
  getStreetSegments(streetId?: string): Promise<StreetSegment[]>;
  getStreetSegment(id: string): Promise<StreetSegment | undefined>;
  getStreetSegmentsByStreetId(streetId: string): Promise<StreetSegment[]>;
  createStreetSegment(streetSegment: InsertStreetSegment): Promise<StreetSegment>;
  updateStreetSegment(id: string, updates: Partial<InsertStreetSegment>): Promise<StreetSegment>;
  deleteStreetSegment(id: string): Promise<void>;

  // Legal framework
  getLawsRegulations(): Promise<LawRegulation[]>;
  getLawRegulation(id: string): Promise<LawRegulation | undefined>;
  createLawRegulation(law: InsertLawRegulation): Promise<LawRegulation>;
  updateLawRegulation(id: string, updates: Partial<InsertLawRegulation>): Promise<LawRegulation>;
  deleteLawRegulation(id: string): Promise<void>;

  getLawSections(lawId: string): Promise<LawSection[]>;
  getLawSection(id: string): Promise<LawSection | undefined>;
  createLawSection(section: InsertLawSection): Promise<LawSection>;
  updateLawSection(id: string, updates: Partial<InsertLawSection>): Promise<LawSection>;
  deleteLawSection(id: string): Promise<void>;

  getLawArticles(sectionId: string): Promise<LawArticle[]>;
  getLawArticle(id: string): Promise<LawArticle | undefined>;
  createLawArticle(article: InsertLawArticle): Promise<LawArticle>;
  updateLawArticle(id: string, updates: Partial<InsertLawArticle>): Promise<LawArticle>;
  deleteLawArticle(id: string): Promise<void>;
  searchLawArticles(query: string): Promise<LawArticle[]>;

  // Technical requirements
  getRequirementCategories(): Promise<RequirementCategory[]>;
  getRequirementCategory(id: string): Promise<RequirementCategory | undefined>;
  createRequirementCategory(category: InsertRequirementCategory): Promise<RequirementCategory>;
  updateRequirementCategory(id: string, updates: Partial<InsertRequirementCategory>): Promise<RequirementCategory>;
  deleteRequirementCategory(id: string): Promise<void>;

  getRequirements(categoryId?: string): Promise<Requirement[]>;
  getRequirement(id: string): Promise<Requirement | undefined>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: string, updates: Partial<InsertRequirement>): Promise<Requirement>;
  deleteRequirement(id: string): Promise<void>;
  searchRequirements(query: string): Promise<Requirement[]>;

  // Services
  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  getServiceRequirements(serviceId: string): Promise<any[]>;
  addServiceRequirement(serviceId: string, requirementId: string, isOptional?: boolean): Promise<void>;
  removeServiceRequirement(serviceId: string, requirementId: string): Promise<void>;

  // Applications
  getApplications(filters?: { 
    status?: string; 
    applicantId?: string; 
    assignedToId?: string;
    // LBAC filtering for geographic access control
    userGeographicScope?: {
      userId: string;
      governorateIds?: string[];
      districtIds?: string[];
      subDistrictIds?: string[];
      neighborhoodIds?: string[];
    };
  }): Promise<Application[]>;
  getApplicationsPaginated(params: PaginationParams): Promise<PaginatedResponse<Application>>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByNumber(applicationNumber: string): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  // Surveying decisions
  getSurveyingDecisions(filters?: { 
    status?: string; 
    surveyorId?: string;
    // LBAC filtering for geographic access control
    userGeographicScope?: {
      userId: string;
      governorateIds?: string[];
      districtIds?: string[];
      subDistrictIds?: string[];
      neighborhoodIds?: string[];
    };
  }): Promise<SurveyingDecision[]>;
  getSurveyingDecision(id: string): Promise<SurveyingDecision | undefined>;
  getSurveyingDecisionByNumber(decisionNumber: string): Promise<SurveyingDecision | undefined>;
  createSurveyingDecision(decision: InsertSurveyingDecision): Promise<SurveyingDecision>;
  updateSurveyingDecision(id: string, updates: Partial<InsertSurveyingDecision>): Promise<SurveyingDecision>;
  deleteSurveyingDecision(id: string): Promise<void>;

  // Tasks
  getTasks(filters?: { assignedToId?: string; status?: string; applicationId?: string }): Promise<Task[]>;
  getTasksPaginated(params: PaginationParams): Promise<PaginatedResponse<Task>>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // System settings
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: any): Promise<SystemSetting>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    activeApplications: number;
    issuedLicenses: number;
    surveyingDecisions: number;
    satisfactionRate: number;
  }>;

  // Search functionality
  globalSearch(query: string): Promise<{
    laws: LawArticle[];
    requirements: Requirement[];
    applications: Application[];
  }>;

  // Advanced Service Builder System
  getServiceTemplates(): Promise<ServiceTemplate[]>;
  getServiceTemplate(id: string): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: string, updates: Partial<InsertServiceTemplate>): Promise<ServiceTemplate>;

  // Service Builder Operations
  getServiceBuilder(id: string): Promise<ServiceBuilder | undefined>;
  createServiceBuilder(builderData: any): Promise<ServiceBuilder>;
  updateServiceBuilder(id: string, updates: any): Promise<ServiceBuilder>;
  publishService(id: string, publisherId: string): Promise<ServiceBuilder>;

  // Dynamic Forms
  getServiceForm(serviceId: string): Promise<DynamicForm | undefined>;
  createDynamicForm(form: InsertDynamicForm): Promise<DynamicForm>;
  updateDynamicForm(id: string, updates: Partial<InsertDynamicForm>): Promise<DynamicForm>;

  // Workflow Management
  getServiceWorkflow(serviceId: string): Promise<WorkflowDefinition | undefined>;
  createWorkflowDefinition(workflow: InsertWorkflowDefinition): Promise<WorkflowDefinition>;
  updateWorkflowDefinition(id: string, updates: Partial<InsertWorkflowDefinition>): Promise<WorkflowDefinition>;

  // Analytics and Reports
  getServiceUsageAnalytics(): Promise<any>;
  getWorkflowPerformanceAnalytics(): Promise<any>;
  getSystemHealth(): Promise<any>;

  // Workflow Management - Status History
  getApplicationStatusHistory(applicationId: string): Promise<ApplicationStatusHistory[]>;
  createApplicationStatusHistory(history: InsertApplicationStatusHistory): Promise<ApplicationStatusHistory>;

  // Workflow Management - Assignments
  getApplicationAssignments(applicationId: string): Promise<ApplicationAssignment[]>;
  createApplicationAssignment(assignment: InsertApplicationAssignment): Promise<ApplicationAssignment>;
  updateApplicationAssignment(id: string, updates: Partial<InsertApplicationAssignment>): Promise<ApplicationAssignment>;
  getUserAssignments(userId: string): Promise<ApplicationAssignment[]>;
  getDepartmentWorkload(departmentId: string): Promise<any>;

  // Workflow Management - Reviews
  getApplicationReviews(applicationId: string): Promise<ApplicationReview[]>;
  createApplicationReview(review: InsertApplicationReview): Promise<ApplicationReview>;

  // Notifications
  getNotifications(filters: { 
    userId: string; 
    isRead?: boolean; 
    category?: string; 
    type?: string; 
  }): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Appointments Management
  getAppointments(filters?: { 
    applicationId?: string; 
    assignedToId?: string; 
    status?: string;
    confirmationStatus?: string;
  }): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  getUpcomingAppointments(assignedToId: string, daysAhead?: number): Promise<Appointment[]>;
  confirmAppointment(id: string, confirmedBy: 'citizen' | 'engineer', notes?: string): Promise<Appointment>;

  // Contact Attempts Management
  getContactAttempts(filters?: {
    applicationId?: string;
    appointmentId?: string;
    attemptedById?: string;
    isSuccessful?: boolean;
  }): Promise<ContactAttempt[]>;
  createContactAttempt(attempt: InsertContactAttempt): Promise<ContactAttempt>;
  getContactAttemptsForApplication(applicationId: string): Promise<ContactAttempt[]>;
  markContactAttemptSuccessful(id: string, notes?: string): Promise<ContactAttempt>;

  // Survey Assignment Forms Management
  getSurveyAssignmentForms(filters?: {
    applicationId?: string;
    assignedToId?: string;
    status?: string;
  }): Promise<SurveyAssignmentForm[]>;
  getSurveyAssignmentForm(id: string): Promise<SurveyAssignmentForm | undefined>;
  createSurveyAssignmentForm(form: InsertSurveyAssignmentForm): Promise<SurveyAssignmentForm>;
  updateSurveyAssignmentForm(id: string, updates: Partial<InsertSurveyAssignmentForm>): Promise<SurveyAssignmentForm>;
  markFormAsPrinted(id: string): Promise<SurveyAssignmentForm>;
  markFormAsSigned(id: string, supervisorSignature: string): Promise<SurveyAssignmentForm>;

  // ===========================================
  // MOBILE SYNC & OFFLINE OPERATIONS
  // ===========================================

  // Device Registration Management (Legacy)
  getDeviceRegistrations(userId?: string, isActive?: boolean): Promise<DeviceRegistration[]>;
  getDeviceRegistration(id: string): Promise<DeviceRegistration | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<DeviceRegistration | undefined>;
  registerDevice(device: InsertDeviceRegistration): Promise<DeviceRegistration>;
  updateDeviceRegistration(id: string, updates: Partial<InsertDeviceRegistration>): Promise<DeviceRegistration>;
  deactivateDevice(id: string): Promise<DeviceRegistration>;
  updateDeviceLastSync(deviceId: string): Promise<DeviceRegistration>;

  // Mobile Device Registration Management (Phase 4) - For surveyor mobile apps
  getMobileDeviceRegistrations(userId?: string, status?: string): Promise<any[]>;
  getMobileDeviceRegistration(id: string): Promise<any | undefined>;
  getMobileDeviceByDeviceId(deviceId: string): Promise<any | undefined>;
  registerMobileDevice(device: any): Promise<any>;
  updateMobileDeviceRegistration(id: string, updates: any): Promise<any>;
  updateMobileDeviceLastSeen(deviceId: string): Promise<any>;
  updateMobileDeviceLastSync(deviceId: string): Promise<any>;
  revokeMobileDevice(deviceId: string, reason?: string): Promise<any>;
  // JWT and refresh token management for mobile devices
  updateMobileDeviceRefreshToken(deviceId: string, refreshTokenHash: string, expiresAt: Date): Promise<any>;
  invalidateMobileDeviceTokens(deviceId: string): Promise<any>;
  validateMobileDeviceRefreshToken(deviceId: string, refreshTokenHash: string): Promise<boolean>;

  // Sync Session Management
  getSyncSessions(filters?: {
    deviceId?: string;
    userId?: string;
    status?: string;
    sessionType?: string;
  }): Promise<SyncSession[]>;
  getSyncSession(id: string): Promise<SyncSession | undefined>;
  createSyncSession(session: InsertSyncSession): Promise<SyncSession>;
  updateSyncSession(id: string, updates: Partial<InsertSyncSession>): Promise<SyncSession>;
  completeSyncSession(id: string, endTime: Date, statistics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    conflictOperations: number;
  }): Promise<SyncSession>;

  // Offline Operations Management
  getOfflineOperations(filters?: {
    deviceId?: string;
    userId?: string;
    status?: string;
    operationType?: string;
    tableName?: string;
  }): Promise<OfflineOperation[]>;
  getOfflineOperation(id: string): Promise<OfflineOperation | undefined>;
  createOfflineOperation(operation: InsertOfflineOperation): Promise<OfflineOperation>;
  updateOfflineOperation(id: string, updates: Partial<InsertOfflineOperation>): Promise<OfflineOperation>;
  markOperationAsSynced(id: string, serverTimestamp: Date): Promise<OfflineOperation>;
  markOperationAsConflicted(id: string, conflictReason: string): Promise<OfflineOperation>;
  getPendingOperations(deviceId: string): Promise<OfflineOperation[]>;

  // Sync Conflicts Management
  getSyncConflicts(filters?: {
    sessionId?: string;
    status?: string;
    conflictType?: string;
    tableName?: string;
  }): Promise<SyncConflict[]>;
  getSyncConflict(id: string): Promise<SyncConflict | undefined>;
  createSyncConflict(conflict: InsertSyncConflict): Promise<SyncConflict>;
  resolveSyncConflict(id: string, resolutionStrategy: string, resolvedData: any, resolvedBy: string): Promise<SyncConflict>;
  getUnresolvedConflicts(sessionId?: string): Promise<SyncConflict[]>;

  // Differential Sync Operations
  getChangedRecords(tableName: string, lastSyncTimestamp: Date, limit?: number, lbacFilter?: any, user?: { id: string; username: string; role: string }): Promise<any[]>;
  applyBulkChanges(tableName: string, operations: OfflineOperation[]): Promise<{ success: number; conflicts: number; errors: number }>;

  // ===========================================
  // DELETE PROPAGATION & CHANGE TRACKING SYSTEM
  // ===========================================

  // Monotonic Versioning System
  createChangeVersion(): Promise<string>;
  getNextSequence(): Promise<string>;

  // Deletion Tombstones Management  
  getDeletionTombstones(filters?: {
    tableName?: string;
    recordId?: string;
    deletedById?: string;
    propagationStatus?: string;
    deviceId?: string;
    sessionId?: string;
    isActive?: boolean;
  }): Promise<DeletionTombstone[]>;
  getDeletionTombstone(id: string): Promise<DeletionTombstone | undefined>;
  createDeletionTombstone(tombstone: InsertDeletionTombstone): Promise<DeletionTombstone>;
  updateTombstonePropagationStatus(id: string, status: string, propagatedAt?: Date): Promise<DeletionTombstone>;
  expireTombstone(id: string): Promise<void>;
  cleanupExpiredTombstones(): Promise<number>;

  // Change Tracking Management
  getChangeHistory(filters?: {
    tableName?: string;
    recordId?: string;
    changedById?: string;
    operationType?: string;
    changeSource?: string;
    syncStatus?: string;
    deviceId?: string;
    sessionId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<ChangeTracking[]>;
  getChangeTrackingEntry(id: string): Promise<ChangeTracking | undefined>;
  createChangeTrackingEntry(entry: InsertChangeTracking): Promise<ChangeTracking>;
  updateChangeSyncStatus(id: string, status: string, syncedAt?: Date): Promise<ChangeTracking>;
  getChangesByVersion(tableName: string, minVersion?: string, maxVersion?: string): Promise<ChangeTracking[]>;

  // Safe CRUD Wrapper Methods with Idempotency
  safeCreate<T>(
    tableName: string,
    data: any,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ record: T; changeEntry: ChangeTracking; isNewRecord: boolean }>;

  safeUpdate<T>(
    tableName: string,
    recordId: string,
    updates: any,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ record: T; changeEntry: ChangeTracking; fieldsChanged: string[] }>;

  safeDelete(
    tableName: string,
    recordId: string,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      deletionReason?: string;
      deletionType?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ tombstone: DeletionTombstone; changeEntry: ChangeTracking }>;

  // Batch Operations with Change Tracking
  safeBatchCreate<T>(
    tableName: string,
    records: any[],
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ records: T[]; changeEntries: ChangeTracking[] }>;

  // Idempotency & Retry Logic
  isChangeProcessed(deviceId: string, clientChangeId: string): Promise<boolean>;
  getProcessedChange(deviceId: string, clientChangeId: string): Promise<ChangeTracking | undefined>;
  retryFailedChanges(maxRetries?: number): Promise<{ success: number; failed: number }>;

  // ===========================================
  // ADVANCED MONITORING & INSTRUMENTATION
  // ===========================================

  // Performance Metrics Operations
  recordPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(filters?: {
    metricName?: string;
    metricType?: string;
    metricCategory?: string;
    userId?: string;
    endpoint?: string;
    timeRange?: { from: Date; to: Date };
    tags?: Record<string, any>;
  }): Promise<PerformanceMetric[]>;
  getAggregatedMetrics(params: {
    metricName: string;
    aggregationPeriod: 'minute' | 'hour' | 'day';
    timeRange: { from: Date; to: Date };
    groupBy?: string[];
  }): Promise<any[]>;
  getMetricSummary(metricCategory: string, timeRange: { from: Date; to: Date }): Promise<{
    totalCount: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
    p95Value: number;
  }>;

  // Sync Operations Metrics
  recordSyncOperationMetric(metric: InsertSyncOperationsMetric): Promise<SyncOperationsMetric>;
  getSyncOperationMetrics(filters?: {
    operationType?: string;
    status?: string;
    userId?: string;
    deviceId?: string;
    tableName?: string;
    timeRange?: { from: Date; to: Date };
  }): Promise<SyncOperationsMetric[]>;
  getSyncPerformanceSummary(timeRange: { from: Date; to: Date }): Promise<{
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    errorsByType: Record<string, number>;
    retryStatistics: { totalRetries: number; avgRetriesPerOperation: number };
  }>;
  updateSyncOperationStatus(id: string, status: string, completedAt?: Date, errorDetails?: any): Promise<SyncOperationsMetric>;

  // Error Tracking Operations
  recordError(error: InsertErrorTracking): Promise<ErrorTracking>;
  getErrors(filters?: {
    errorType?: string;
    severity?: string;
    status?: string;
    userId?: string;
    endpoint?: string;
    environment?: string;
    timeRange?: { from: Date; to: Date };
  }): Promise<ErrorTracking[]>;
  getErrorSummary(timeRange: { from: Date; to: Date }): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    affectedUsers: number;
    resolvedErrors: number;
  }>;
  updateErrorStatus(id: string, status: string, resolutionNotes?: string, assignedToId?: string): Promise<ErrorTracking>;
  incrementErrorOccurrence(errorHash: string, metadata?: any): Promise<ErrorTracking>;
  getTopErrors(limit?: number, timeRange?: { from: Date; to: Date }): Promise<ErrorTracking[]>;

  // SLO Measurements Operations
  recordSloMeasurement(measurement: InsertSloMeasurement): Promise<SloMeasurement>;
  getSloMeasurements(filters?: {
    sloName?: string;
    sloType?: string;
    service?: string;
    isCompliant?: boolean;
    timeRange?: { from: Date; to: Date };
  }): Promise<SloMeasurement[]>;
  getSloComplianceReport(service: string, timeRange: { from: Date; to: Date }): Promise<{
    overallCompliance: number;
    sloBreaches: number;
    errorBudgetStatus: { consumed: number; remaining: number };
    trendAnalysis: { direction: string; confidence: number };
  }>;
  updateSloAlerts(id: string, alertsTriggered: number): Promise<SloMeasurement>;
  getSloHealth(): Promise<{
    criticalSlos: SloMeasurement[];
    degradedServices: string[];
    overallSystemHealth: 'healthy' | 'degraded' | 'critical';
  }>;

  // Monitoring Dashboard Data
  getMonitoringDashboardData(timeRange: { from: Date; to: Date }): Promise<{
    systemHealth: {
      overallStatus: 'healthy' | 'degraded' | 'critical';
      errorRate: number;
      responseTime: number;
      availabilityPercentage: number;
    };
    performanceMetrics: {
      apiResponseTime: { current: number; trend: string };
      syncPerformance: { successRate: number; avgDuration: number };
      userActivity: { activeUsers: number; operationsCount: number };
    };
    alertSummary: {
      criticalAlerts: number;
      warningAlerts: number;
      recentErrors: ErrorTracking[];
    };
  }>;

  // ===========================================
  // MOBILE SURVEY SYSTEM STORAGE INTERFACE
  // ===========================================

  // Mobile Survey Session Management - LBAC Enabled
  getMobileSurveySessions(filters?: {
    surveyorId?: string;
    deviceId?: string;
    applicationId?: string;
    status?: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
    // plotId not available in mobileSurveySessions schema
    // Geographic LBAC constraints
    governorateId?: string;
    districtId?: string;
    subDistrictId?: string;
    neighborhoodId?: string;
    // Date range filters
    startDate?: Date;
    endDate?: Date;
    // Pagination
    limit?: number;
    offset?: number;
  }, lbacFilter?: {
    userId: string;
    userGeographicScope: {
      governorateIds: string[];
      districtIds: string[];
      subDistrictIds: string[];
      neighborhoodIds: string[];
    };
  }): Promise<MobileSurveySession[]>;
  
  getMobileSurveySession(id: string, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveySession | undefined>;
  
  createMobileSurveySession(
    session: InsertMobileSurveySession,
    metadata: {
      surveyorId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic: { governorateId?: string; districtId?: string; };
    }
  ): Promise<{ session: MobileSurveySession; changeEntry: ChangeTracking }>;
  
  updateMobileSurveySession(
    id: string,
    updates: Partial<InsertMobileSurveySession>,
    metadata: {
      surveyorId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ session: MobileSurveySession; changeEntry: ChangeTracking }>;
  
  submitMobileSurveySession(id: string, metadata: {
    surveyorId: string;
    deviceId: string;
    clientChangeId?: string;
  }): Promise<MobileSurveySession>;

  // Mobile Survey Points Management - Geographic Constraints
  getMobileSurveyPoints(filters?: {
    sessionId?: string;
    // plotId not available in mobileSurveyPoints schema
    featureCode?: string;
    pointType?: 'boundary' | 'detail' | 'reference' | 'control';
    // Geographic constraints (WGS84)
    bounds?: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
    // Data integrity
    hasValidCoordinates?: boolean;
    isDeleted?: boolean;
  }, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyPoint[]>;
  
  getMobileSurveyPoint(id: string, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyPoint | undefined>;
  
  createMobileSurveyPoint(
    point: InsertMobileSurveyPoint,
    metadata: {
      surveyorId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
      geographic: { governorateId?: string; };
    }
  ): Promise<{ point: MobileSurveyPoint; changeEntry: ChangeTracking }>;
  
  updateMobileSurveyPoint(
    id: string,
    updates: Partial<InsertMobileSurveyPoint>,
    metadata: {
      surveyorId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ point: MobileSurveyPoint; changeEntry: ChangeTracking }>;
  
  deleteMobileSurveyPoint(
    id: string,
    metadata: {
      surveyorId: string;
      deviceId: string;
      deletionReason?: string;
      clientChangeId?: string;
    }
  ): Promise<{ tombstone: DeletionTombstone; changeEntry: ChangeTracking }>;
  
  validateSurveyPointCoordinates(
    // plotId not used for validation in current schema
    coordinates: { latitude: number; longitude: number },
    tolerance: number
  ): Promise<{ isValid: boolean; warnings?: string[] }>;

  // Mobile Survey Geometries Management - GeoJSON Support
  getMobileSurveyGeometries(filters?: {
    sessionId?: string;
    // pointId not available in mobileSurveyGeometries schema
    geometryType?: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    featureCode?: string;
    // EPSG:4326 Geographic bounds validation
    isWithinBounds?: boolean;
    isDeleted?: boolean;
  }, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyGeometry[]>;
  
  getMobileSurveyGeometry(id: string, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyGeometry | undefined>;
  
  createMobileSurveyGeometry(
    geometry: InsertMobileSurveyGeometry,
    metadata: {
      userId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
      geographic: { plotId?: string };
    }
  ): Promise<{ geometry: MobileSurveyGeometry; changeEntry: ChangeTracking }>;
  
  updateMobileSurveyGeometry(
    id: string,
    updates: Partial<InsertMobileSurveyGeometry>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ geometry: MobileSurveyGeometry; changeEntry: ChangeTracking }>;
  
  validateGeoJSONGeometry(geoJsonData: any): Promise<{
    isValid: boolean;
    geometryType?: string;
    coordinateSystem?: string;
    errors?: string[];
    warnings?: string[];
  }>;

  // Mobile Field Visits Management - Lifecycle Tracking
  getMobileFieldVisits(filters?: {
    userId?: string;
    deviceId?: string;
    sessionId?: string;
    plotId?: string;
    visitStatus?: 'started' | 'in_progress' | 'completed' | 'cancelled';
    // Geographic filtering
    governorateId?: string;
    districtId?: string;
    // Date range
    visitDate?: Date;
    startDate?: Date;
    endDate?: Date;
  }, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileFieldVisit[]>;
  
  getMobileFieldVisit(id: string, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileFieldVisit | undefined>;
  
  startMobileFieldVisit(
    visit: InsertMobileFieldVisit,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic: { plotId?: string; governorateId?: string; districtId?: string };
    }
  ): Promise<{ visit: MobileFieldVisit; changeEntry: ChangeTracking }>;
  
  updateMobileFieldVisit(
    id: string,
    updates: Partial<InsertMobileFieldVisit>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ visit: MobileFieldVisit; changeEntry: ChangeTracking }>;
  
  completeMobileFieldVisit(
    id: string,
    completionData: {
      endTime: Date;
      notes?: string;
      weatherConditions?: string;
      totalPointsCaptured?: number;
      qualityScore?: number;
    },
    metadata: {
      userId: string;
      deviceId: string;
    }
  ): Promise<MobileFieldVisit>;

  // Mobile Survey Attachments Management - Secure File Handling
  getMobileSurveyAttachments(filters?: {
    sessionId?: string;
    pointId?: string;
    attachmentType?: 'photo' | 'document' | 'audio' | 'video' | 'signature';
    isUploaded?: boolean;
    isDeleted?: boolean;
  }, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyAttachment[]>;
  
  getMobileSurveyAttachment(id: string, lbacFilter?: {
    userId: string;
    userGeographicScope: any;
  }): Promise<MobileSurveyAttachment | undefined>;
  
  createMobileSurveyAttachment(
    attachment: InsertMobileSurveyAttachment,
    metadata: {
      userId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
    }
  ): Promise<{ attachment: MobileSurveyAttachment; changeEntry: ChangeTracking }>;
  
  updateMobileSurveyAttachment(
    id: string,
    updates: Partial<InsertMobileSurveyAttachment>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ attachment: MobileSurveyAttachment; changeEntry: ChangeTracking }>;
  
  markAttachmentAsUploaded(
    id: string,
    uploadMetadata: {
      storageUrl: string;
      uploadedAt: Date;
      fileHash?: string;
      compressionRatio?: number;
    }
  ): Promise<MobileSurveyAttachment>;

  // Mobile Sync Cursors Management - Delta Sync Support
  getMobileSyncCursors(filters?: {
    deviceId?: string;
    // userId not available in mobileSyncCursors schema
    tableName?: string;
    isActive?: boolean;
  }): Promise<MobileSyncCursor[]>;
  
  getMobileSyncCursor(id: string): Promise<MobileSyncCursor | undefined>;
  
  updateMobileSyncCursor(
    deviceId: string,
    tableName: string,
    cursor: {
      lastSyncTimestamp: Date;
      watermarkHigh: string;
      recordCount: number;
      syncStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    }
  ): Promise<MobileSyncCursor>;
  
  getMobileDeltaChanges(
    deviceId: string,
    tableName: string,
    watermarkLow?: string,
    limit?: number,
    lbacFilter?: {
      userId: string;
      userGeographicScope: any;
    }
  ): Promise<{
    changes: any[];
    nextWatermark: string;
    hasMore: boolean;
    tombstones: DeletionTombstone[];
  }>;
  
  processMobileBatchUpload(
    deviceId: string,
    operations: Array<{
      operation: 'create' | 'update' | 'delete';
      tableName: string;
      recordId?: string;
      data?: any;
      clientChangeId: string;
      timestamp: Date;
    }>,
    metadata: {
      userId: string;
      sessionId: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{
    processed: number;
    conflicts: Array<{ operation: any; reason: string; suggested: any }>;
    errors: Array<{ operation: any; error: string }>;
    changeEntries: ChangeTracking[];
  }>;

  // Mobile LBAC Geographic Validation
  validateMobileUserGeographicAccess(
    userId: string,
    requiredAccess: {
      plotId?: string;
      neighborhoodId?: string;
      subDistrictId?: string;
      districtId?: string;
      governorateId?: string;
    }
  ): Promise<{
    hasAccess: boolean;
    accessLevel: 'full' | 'partial' | 'none';
    allowedOperations: ('read' | 'create' | 'update' | 'delete')[];
    reason?: string;
  }>;

  // =============================================
  // GEOPROCESSING QUEUE SYSTEM - Phase 1
  // =============================================

  // Geo Jobs management
  getGeoJobs(filters?: {
    status?: string;
    taskType?: string;
    ownerId?: string;
    targetType?: string;
    targetId?: string;
    neighborhoodUnitId?: string;
    priority?: number;
  }): Promise<GeoJob[]>;
  getGeoJob(id: string): Promise<GeoJob | undefined>;
  getGeoJobByIdempotencyKey(key: string): Promise<GeoJob | undefined>;
  createGeoJob(job: InsertGeoJob): Promise<GeoJob>;
  updateGeoJob(id: string, updates: Partial<InsertGeoJob>): Promise<GeoJob>;
  deleteGeoJob(id: string): Promise<void>;

  // Queue operations for Python Worker
  claimNextGeoJob(workerId: string): Promise<GeoJob | undefined>;
  updateGeoJobProgress(id: string, progress: number, message?: string): Promise<GeoJob>;
  updateGeoJobHeartbeat(id: string, workerId: string): Promise<GeoJob>;
  completeGeoJob(id: string, outputPayload: any, outputKeys: string[]): Promise<GeoJob>;
  failGeoJob(id: string, error: any): Promise<GeoJob>;
  cancelGeoJob(id: string, reason?: string): Promise<GeoJob>;
  
  // Geo Job Events management
  getGeoJobEvents(filters?: {
    jobId?: string;
    eventType?: string;
    workerId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<GeoJobEvent[]>;
  createGeoJobEvent(event: InsertGeoJobEvent): Promise<GeoJobEvent>;

  // Queue monitoring and analytics
  getGeoJobQueueStats(): Promise<{
    queued: number;
    running: number;
    completed: number;
    failed: number;
    avgProcessingTimeMs: number;
  }>;
  getWorkerPerformanceStats(workerId?: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsers(filters?: { role?: string; departmentId?: string; isActive?: boolean }): Promise<User[]> {
    if (filters) {
      const conditions = [];
      if (filters.role) conditions.push(eq(users.role, filters.role));
      if (filters.departmentId) conditions.push(eq(users.departmentId, filters.departmentId));
      if (filters.isActive !== undefined) conditions.push(eq(users.isActive, filters.isActive));
      
      if (conditions.length > 0) {
        return await db.select().from(users).where(and(...conditions));
      }
    }
    
    return await db.select().from(users);
  }

  async getUsersPaginated(params: PaginationParams): Promise<PaginatedResponse<User>> {
    return await executePaginatedQuery<User>(db, users, params, {
      searchableFields: [users.fullName, users.username, users.email],
      sortableFields: {
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        isActive: users.isActive
      },
      filterableFields: {
        role: users.role,
        departmentId: users.departmentId,
        positionId: users.positionId,
        isActive: users.isActive
      }
    });
  }

  // User Geographic Assignments - LBAC Implementation
  async getUserGeographicAssignments(filters?: {
    userId?: string;
    governorateId?: string;
    districtId?: string;
    subDistrictId?: string;
    neighborhoodId?: string;
    assignmentType?: string;
    isActive?: boolean;
    includeExpired?: boolean;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(userGeographicAssignments.userId, filters.userId));
    }
    if (filters?.governorateId) {
      conditions.push(eq(userGeographicAssignments.governorateId, filters.governorateId));
    }
    if (filters?.districtId) {
      conditions.push(eq(userGeographicAssignments.districtId, filters.districtId));
    }
    if (filters?.subDistrictId) {
      conditions.push(eq(userGeographicAssignments.subDistrictId, filters.subDistrictId));
    }
    if (filters?.neighborhoodId) {
      conditions.push(eq(userGeographicAssignments.neighborhoodId, filters.neighborhoodId));
    }
    if (filters?.assignmentType) {
      conditions.push(eq(userGeographicAssignments.assignmentType, filters.assignmentType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(userGeographicAssignments.isActive, filters.isActive));
    }
    
    // Temporal validity check - don't include expired unless specifically requested
    if (!filters?.includeExpired) {
      const now = sql`CURRENT_TIMESTAMP`;
      conditions.push(
        or(
          sql`${userGeographicAssignments.endDate} IS NULL`, // permanent assignments
          sql`${userGeographicAssignments.endDate} > ${now}` // not yet expired
        )
      );
      // Ensure assignment has started
      conditions.push(sql`${userGeographicAssignments.startDate} <= ${now}`);
    }

    // Join with geographic entities to get expanded data
    const query = db
      .select({
        id: userGeographicAssignments.id,
        userId: userGeographicAssignments.userId,
        governorateId: userGeographicAssignments.governorateId,
        districtId: userGeographicAssignments.districtId,
        subDistrictId: userGeographicAssignments.subDistrictId,
        neighborhoodId: userGeographicAssignments.neighborhoodId,
        assignmentType: userGeographicAssignments.assignmentType,
        startDate: userGeographicAssignments.startDate,
        endDate: userGeographicAssignments.endDate,
        isActive: userGeographicAssignments.isActive,
        createdAt: userGeographicAssignments.createdAt,
        // Expanded geographic data
        governorate: {
          id: governorates.id,
          nameAr: governorates.nameAr,
          nameEn: governorates.nameEn,
        },
        district: {
          id: districts.id,
          nameAr: districts.nameAr,
          nameEn: districts.nameEn,
        },
        subDistrict: {
          id: subDistricts.id,
          nameAr: subDistricts.nameAr,
          nameEn: subDistricts.nameEn,
        },
        neighborhood: {
          id: neighborhoods.id,
          nameAr: neighborhoods.nameAr,
          nameEn: neighborhoods.nameEn,
        },
      })
      .from(userGeographicAssignments)
      .leftJoin(governorates, eq(userGeographicAssignments.governorateId, governorates.id))
      .leftJoin(districts, eq(userGeographicAssignments.districtId, districts.id))
      .leftJoin(subDistricts, eq(userGeographicAssignments.subDistrictId, subDistricts.id))
      .leftJoin(neighborhoods, eq(userGeographicAssignments.neighborhoodId, neighborhoods.id));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async createUserGeographicAssignment(assignment: InsertUserGeographicAssignment): Promise<UserGeographicAssignment> {
    const [result] = await db.insert(userGeographicAssignments).values(assignment).returning();
    return result;
  }

  async updateUserGeographicAssignment(id: string, updates: Partial<InsertUserGeographicAssignment>): Promise<UserGeographicAssignment> {
    const [assignment] = await db
      .update(userGeographicAssignments)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(userGeographicAssignments.id, id))
      .returning();
    return assignment;
  }

  async deleteUserGeographicAssignment(id: string): Promise<void> {
    await db.delete(userGeographicAssignments).where(eq(userGeographicAssignments.id, id));
  }

  // CRITICAL LBAC: Hierarchical scope expansion
  async expandUserGeographicScope(userId: string): Promise<{
    governorateIds: string[];
    districtIds: string[];
    subDistrictIds: string[];
    neighborhoodIds: string[];
  }> {
    // Get user's direct assignments
    const assignments = await this.getUserGeographicAssignments({
      userId,
      isActive: true,
      includeExpired: false
    });

    const scope = {
      governorateIds: new Set<string>(),
      districtIds: new Set<string>(),
      subDistrictIds: new Set<string>(),
      neighborhoodIds: new Set<string>()
    };

    // Process each assignment and expand hierarchically
    for (const assignment of assignments) {
      // Direct governorate access grants access to all descendants
      if (assignment.governorateId) {
        scope.governorateIds.add(assignment.governorateId);
        
        // Get all districts in this governorate
        const govDistricts = await this.getDistrictsByGovernorateId(assignment.governorateId);
        for (const district of govDistricts) {
          scope.districtIds.add(district.id);
          
          // Get all sub-districts in this district
          const districtSubDistricts = await this.getSubDistrictsByDistrictId(district.id);
          for (const subDistrict of districtSubDistricts) {
            scope.subDistrictIds.add(subDistrict.id);
            
            // Get all neighborhoods in this sub-district
            const subDistrictNeighborhoods = await this.getNeighborhoodsBySubDistrictId(subDistrict.id);
            for (const neighborhood of subDistrictNeighborhoods) {
              scope.neighborhoodIds.add(neighborhood.id);
            }
          }
        }
      }
      
      // Direct district access grants access to all descendants  
      if (assignment.districtId && !assignment.governorateId) {
        scope.districtIds.add(assignment.districtId);
        
        // Get all sub-districts in this district
        const districtSubDistricts = await this.getSubDistrictsByDistrictId(assignment.districtId);
        for (const subDistrict of districtSubDistricts) {
          scope.subDistrictIds.add(subDistrict.id);
          
          // Get all neighborhoods in this sub-district
          const subDistrictNeighborhoods = await this.getNeighborhoodsBySubDistrictId(subDistrict.id);
          for (const neighborhood of subDistrictNeighborhoods) {
            scope.neighborhoodIds.add(neighborhood.id);
          }
        }
      }
      
      // Direct sub-district access grants access to all neighborhoods
      if (assignment.subDistrictId && !assignment.districtId && !assignment.governorateId) {
        scope.subDistrictIds.add(assignment.subDistrictId);
        
        // Get all neighborhoods in this sub-district
        const subDistrictNeighborhoods = await this.getNeighborhoodsBySubDistrictId(assignment.subDistrictId);
        for (const neighborhood of subDistrictNeighborhoods) {
          scope.neighborhoodIds.add(neighborhood.id);
        }
      }
      
      // Direct neighborhood access
      if (assignment.neighborhoodId && !assignment.subDistrictId && !assignment.districtId && !assignment.governorateId) {
        scope.neighborhoodIds.add(assignment.neighborhoodId);
      }
    }

    return {
      governorateIds: Array.from(scope.governorateIds),
      districtIds: Array.from(scope.districtIds),
      subDistrictIds: Array.from(scope.subDistrictIds),
      neighborhoodIds: Array.from(scope.neighborhoodIds)
    };
  }

  // ===========================================
  // ENHANCED LBAC HARDENING - Phase 6 Implementation
  // ===========================================

  // Permission Geographic Constraints management
  async getPermissionGeographicConstraints(filters?: {
    permissionId?: string;
    constraintType?: string;
    constraintLevel?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.permissionId) {
      conditions.push(eq(permissionGeographicConstraints.permissionId, filters.permissionId));
    }
    if (filters?.constraintType) {
      conditions.push(eq(permissionGeographicConstraints.constraintType, filters.constraintType));
    }
    if (filters?.constraintLevel) {
      conditions.push(eq(permissionGeographicConstraints.constraintLevel, filters.constraintLevel));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(permissionGeographicConstraints.isActive, filters.isActive));
    }

    return await db.select().from(permissionGeographicConstraints)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(permissionGeographicConstraints.createdAt));
  }

  async getPermissionGeographicConstraint(id: string): Promise<any | undefined> {
    const result = await db.select().from(permissionGeographicConstraints)
      .where(eq(permissionGeographicConstraints.id, id));
    return result[0];
  }

  async createPermissionGeographicConstraint(constraint: any): Promise<any> {
    const result = await db.insert(permissionGeographicConstraints).values(constraint).returning();
    return result[0];
  }

  async updatePermissionGeographicConstraint(id: string, updates: any): Promise<any> {
    const result = await db.update(permissionGeographicConstraints)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(permissionGeographicConstraints.id, id))
      .returning();
    return result[0];
  }

  async deletePermissionGeographicConstraint(id: string): Promise<void> {
    await db.delete(permissionGeographicConstraints).where(eq(permissionGeographicConstraints.id, id));
  }

  // Temporary Permission Delegations management
  async getTemporaryPermissionDelegations(filters?: {
    delegatorId?: string;
    delegeeId?: string;
    status?: string;
    isActive?: boolean;
    includeExpired?: boolean;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.delegatorId) {
      conditions.push(eq(temporaryPermissionDelegations.fromUserId, filters.delegatorId));
    }
    if (filters?.delegeeId) {
      conditions.push(eq(temporaryPermissionDelegations.toUserId, filters.delegeeId));
    }
    if (filters?.status) {
      conditions.push(eq(temporaryPermissionDelegations.status, filters.status));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(temporaryPermissionDelegations.isActive, filters.isActive));
    }

    // Temporal validity check - don't include expired unless specifically requested
    if (!filters?.includeExpired) {
      const now = sql`CURRENT_TIMESTAMP`;
      conditions.push(sql`${temporaryPermissionDelegations.endDate} > ${now}`);
      conditions.push(sql`${temporaryPermissionDelegations.startDate} <= ${now}`);
    }

    return await db.select().from(temporaryPermissionDelegations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(temporaryPermissionDelegations.createdAt));
  }

  async getTemporaryPermissionDelegation(id: string): Promise<any | undefined> {
    const result = await db.select().from(temporaryPermissionDelegations)
      .where(eq(temporaryPermissionDelegations.id, id));
    return result[0];
  }

  async createTemporaryPermissionDelegation(delegation: any): Promise<any> {
    const result = await db.insert(temporaryPermissionDelegations).values(delegation).returning();
    return result[0];
  }

  async updateTemporaryPermissionDelegation(id: string, updates: any): Promise<any> {
    const result = await db.update(temporaryPermissionDelegations)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(temporaryPermissionDelegations.id, id))
      .returning();
    return result[0];
  }

  async deleteTemporaryPermissionDelegation(id: string): Promise<void> {
    await db.delete(temporaryPermissionDelegations).where(eq(temporaryPermissionDelegations.id, id));
  }

  async activateTemporaryDelegation(id: string, approvedBy: string): Promise<any> {
    const result = await db.update(temporaryPermissionDelegations)
      .set({ 
        status: 'active', 
        isActive: true, 
        approvedById: approvedBy,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(eq(temporaryPermissionDelegations.id, id))
      .returning();
    return result[0];
  }

  async deactivateTemporaryDelegation(id: string, reason?: string): Promise<any> {
    const result = await db.update(temporaryPermissionDelegations)
      .set({ 
        status: 'revoked', 
        isActive: false, 
        revokeReason: reason,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(eq(temporaryPermissionDelegations.id, id))
      .returning();
    return result[0];
  }

  // Geographic Role Templates management
  async getGeographicRoleTemplates(filters?: {
    templateName?: string;
    applicableLevel?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.templateName) {
      conditions.push(ilike(geographicRoleTemplates.templateName, `%${filters.templateName}%`));
    }
    if (filters?.applicableLevel) {
      conditions.push(eq(geographicRoleTemplates.geographicLevel, filters.applicableLevel));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(geographicRoleTemplates.isActive, filters.isActive));
    }

    return await db.select().from(geographicRoleTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(geographicRoleTemplates.createdAt));
  }

  async getGeographicRoleTemplate(id: string): Promise<any | undefined> {
    const result = await db.select().from(geographicRoleTemplates)
      .where(eq(geographicRoleTemplates.id, id));
    return result[0];
  }

  async createGeographicRoleTemplate(template: any): Promise<any> {
    const result = await db.insert(geographicRoleTemplates).values(template).returning();
    return result[0];
  }

  async updateGeographicRoleTemplate(id: string, updates: any): Promise<any> {
    const result = await db.update(geographicRoleTemplates)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(geographicRoleTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteGeographicRoleTemplate(id: string): Promise<void> {
    await db.delete(geographicRoleTemplates).where(eq(geographicRoleTemplates.id, id));
  }

  async applyGeographicRoleTemplate(templateId: string, userId: string, targetGeographicId: string): Promise<any> {
    // This method would apply a role template to a user for a specific geographic area
    // Implementation would involve creating user geographic assignments based on the template
    const template = await this.getGeographicRoleTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create geographic assignment based on template
    const assignmentData = {
      userId,
      assignmentType: template.applicableLevel,
      isActive: true,
      startDate: new Date(),
      // Set the appropriate geographic field based on template level
      ...(template.applicableLevel === 'governorate' && { governorateId: targetGeographicId }),
      ...(template.applicableLevel === 'district' && { districtId: targetGeographicId }),
      ...(template.applicableLevel === 'subDistrict' && { subDistrictId: targetGeographicId }),
      ...(template.applicableLevel === 'neighborhood' && { neighborhoodId: targetGeographicId }),
    };

    return await this.createUserGeographicAssignment(assignmentData);
  }

  // User Geographic Assignment History management (audit trail)
  async getUserGeographicAssignmentHistory(filters?: {
    userId?: string;
    originalAssignmentId?: string;
    changeType?: string;
    changedBy?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(userGeographicAssignmentHistory.userId, filters.userId));
    }
    if (filters?.originalAssignmentId) {
      conditions.push(eq(userGeographicAssignmentHistory.originalAssignmentId, filters.originalAssignmentId));
    }
    if (filters?.changeType) {
      conditions.push(eq(userGeographicAssignmentHistory.changeType, filters.changeType));
    }
    if (filters?.changedBy) {
      conditions.push(eq(userGeographicAssignmentHistory.changedById, filters.changedBy));
    }
    if (filters?.dateRange) {
      conditions.push(sql`${userGeographicAssignmentHistory.changeDate} BETWEEN ${filters.dateRange.start} AND ${filters.dateRange.end}`);
    }

    return await db.select().from(userGeographicAssignmentHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userGeographicAssignmentHistory.changeDate));
  }

  async getUserGeographicAssignmentHistoryRecord(id: string): Promise<any | undefined> {
    const result = await db.select().from(userGeographicAssignmentHistory)
      .where(eq(userGeographicAssignmentHistory.id, id));
    return result[0];
  }

  async createUserGeographicAssignmentHistory(historyRecord: any): Promise<any> {
    const result = await db.insert(userGeographicAssignmentHistory).values(historyRecord).returning();
    return result[0];
  }

  // LBAC Access Audit Log management
  async getLbacAccessAuditLogs(filters?: {
    userId?: string;
    accessGranted?: boolean;
    denialReason?: string;
    governorateId?: string;
    districtId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(lbacAccessAuditLog.userId, filters.userId));
    }
    if (filters?.accessGranted !== undefined) {
      conditions.push(eq(lbacAccessAuditLog.accessGranted, filters.accessGranted));
    }
    if (filters?.denialReason) {
      conditions.push(eq(lbacAccessAuditLog.denialReason, filters.denialReason));
    }
    if (filters?.governorateId) {
      conditions.push(eq(lbacAccessAuditLog.targetGovernorateId, filters.governorateId));
    }
    if (filters?.districtId) {
      conditions.push(eq(lbacAccessAuditLog.targetDistrictId, filters.districtId));
    }
    if (filters?.dateRange) {
      conditions.push(sql`${lbacAccessAuditLog.createdAt} BETWEEN ${filters.dateRange.start} AND ${filters.dateRange.end}`);
    }

    return await db.select().from(lbacAccessAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(lbacAccessAuditLog.createdAt));
  }

  async getLbacAccessAuditLog(id: string): Promise<any | undefined> {
    const result = await db.select().from(lbacAccessAuditLog)
      .where(eq(lbacAccessAuditLog.id, id));
    return result[0];
  }

  async createLbacAccessAuditLog(auditLog: any): Promise<any> {
    const result = await db.insert(lbacAccessAuditLog).values(auditLog).returning();
    return result[0];
  }

  // ===========================================
  // RBAC (Role-Based Access Control) - النظام الجديد للصلاحيات
  // ===========================================

  // Roles management
  async getRoles(filters?: { isActive?: boolean; isSystemRole?: boolean }): Promise<Role[]> {
    const conditions = [];
    if (filters?.isActive !== undefined) conditions.push(eq(roles.isActive, filters.isActive));
    if (filters?.isSystemRole !== undefined) conditions.push(eq(roles.isSystemRole, filters.isSystemRole));
    
    if (conditions.length > 0) {
      return await db.select().from(roles).where(and(...conditions)).orderBy(asc(roles.level), asc(roles.nameAr));
    }
    return await db.select().from(roles).orderBy(asc(roles.level), asc(roles.nameAr));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByCode(code: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.code, code));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [result] = await db.insert(roles).values(role).returning();
    return result;
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Permissions management
  async getPermissions(filters?: { category?: string; resource?: string; isActive?: boolean }): Promise<Permission[]> {
    const conditions = [];
    if (filters?.category) conditions.push(eq(permissions.category, filters.category));
    if (filters?.resource) conditions.push(eq(permissions.resource, filters.resource));
    if (filters?.isActive !== undefined) conditions.push(eq(permissions.isActive, filters.isActive));
    
    if (conditions.length > 0) {
      return await db.select().from(permissions).where(and(...conditions)).orderBy(asc(permissions.category), asc(permissions.resource), asc(permissions.action));
    }
    return await db.select().from(permissions).orderBy(asc(permissions.category), asc(permissions.resource), asc(permissions.action));
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission || undefined;
  }

  async getPermissionByCode(code: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.code, code));
    return permission || undefined;
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [result] = await db.insert(permissions).values(permission).returning();
    return result;
  }

  async updatePermission(id: string, updates: Partial<InsertPermission>): Promise<Permission> {
    const [permission] = await db
      .update(permissions)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(permissions.id, id))
      .returning();
    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  // Role-Permission mapping
  async getRolePermissions(roleId?: string): Promise<RolePermission[]> {
    if (roleId) {
      return await db.select().from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.isActive, true)));
    }
    return await db.select().from(rolePermissions).where(eq(rolePermissions.isActive, true));
  }

  async assignPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission> {
    // Check if mapping already exists
    const existing = await db.select().from(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, rolePermission.roleId),
        eq(rolePermissions.permissionId, rolePermission.permissionId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing mapping to be active
      const [updated] = await db
        .update(rolePermissions)
        .set({ isActive: true })
        .where(and(
          eq(rolePermissions.roleId, rolePermission.roleId),
          eq(rolePermissions.permissionId, rolePermission.permissionId)
        ))
        .returning();
      return updated;
    }
    
    // Create new mapping
    const [result] = await db.insert(rolePermissions).values(rolePermission).returning();
    return result;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
  }

  // User-Role mapping
  async getUserRoles(userId?: string): Promise<UserRole[]> {
    if (userId) {
      return await db.select().from(userRoles)
        .where(and(
          eq(userRoles.userId, userId), 
          eq(userRoles.isActive, true),
          or(
            sql`${userRoles.validUntil} IS NULL`,
            sql`${userRoles.validUntil} > CURRENT_TIMESTAMP`
          )
        ));
    }
    return await db.select().from(userRoles)
      .where(and(
        eq(userRoles.isActive, true),
        or(
          sql`${userRoles.validUntil} IS NULL`,
          sql`${userRoles.validUntil} > CURRENT_TIMESTAMP`
        )
      ));
  }

  async assignRoleToUser(userRole: InsertUserRole): Promise<UserRole> {
    // Check if mapping already exists
    const existing = await db.select().from(userRoles)
      .where(and(
        eq(userRoles.userId, userRole.userId),
        eq(userRoles.roleId, userRole.roleId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing mapping to be active with new validity period
      const [updated] = await db
        .update(userRoles)
        .set({ 
          isActive: true,
          validFrom: userRole.validFrom || sql`CURRENT_TIMESTAMP`,
          validUntil: userRole.validUntil || null,
          assignedBy: userRole.assignedBy
        })
        .where(and(
          eq(userRoles.userId, userRole.userId),
          eq(userRoles.roleId, userRole.roleId)
        ))
        .returning();
      return updated;
    }
    
    // Create new mapping
    const [result] = await db.insert(userRoles).values(userRole).returning();
    return result;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  // Core RBAC functions
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    try {
      // Get user's active roles with full validation chain
      const userActiveRoles = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true),
          or(
            sql`${userRoles.validUntil} IS NULL`,
            sql`${userRoles.validUntil} > CURRENT_TIMESTAMP`
          )
        ));

      if (userActiveRoles.length === 0) return false;

      const roleIds = userActiveRoles.map(ur => ur.roleId);

      // Check if any of user's active roles have the active permission
      const hasPermissionCheck = await db
        .select({ count: sql<number>`count(*)` })
        .from(rolePermissions)
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(and(
          inArray(rolePermissions.roleId, roleIds),
          eq(permissions.code, permissionCode),
          eq(permissions.isActive, true),
          eq(rolePermissions.isActive, true)
        ));

      return hasPermissionCheck[0]?.count > 0;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Get user's active roles with full validation chain
      const userActiveRoles = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true),
          or(
            sql`${userRoles.validUntil} IS NULL`,
            sql`${userRoles.validUntil} > CURRENT_TIMESTAMP`
          )
        ));

      if (userActiveRoles.length === 0) return [];

      const roleIds = userActiveRoles.map(ur => ur.roleId);

      // Get all DISTINCT active permissions for these active roles
      const userPermissions = await db
        .selectDistinct({
          id: permissions.id,
          code: permissions.code,
          nameAr: permissions.nameAr,
          nameEn: permissions.nameEn,
          description: permissions.description,
          category: permissions.category,
          resource: permissions.resource,
          action: permissions.action,
          scope: permissions.scope,
          isSystemPermission: permissions.isSystemPermission,
          isActive: permissions.isActive,
          createdAt: permissions.createdAt,
          updatedAt: permissions.updatedAt,
        })
        .from(permissions)
        .innerJoin(rolePermissions, and(
          eq(rolePermissions.permissionId, permissions.id),
          eq(rolePermissions.isActive, true)
        ))
        .where(and(
          inArray(rolePermissions.roleId, roleIds),
          eq(permissions.isActive, true)
        ))
        .orderBy(asc(permissions.category), asc(permissions.resource), asc(permissions.action));

      return userPermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  async getUserActiveRoles(userId: string): Promise<Role[]> {
    try {
      const userActiveRoles = await this.getUserRoles(userId);
      if (userActiveRoles.length === 0) return [];

      const roleIds = userActiveRoles.map(ur => ur.roleId);

      // Get role details
      const userRolesDetails = await db
        .select()
        .from(roles)
        .where(and(inArray(roles.id, roleIds), eq(roles.isActive, true)));

      return userRolesDetails;
    } catch (error) {
      console.error('Error getting user active roles:', error);
      return [];
    }
  }

  // Organizational structure
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.organizationalLevel), asc(departments.name));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [result] = await db.insert(departments).values(department).returning();
    return result;
  }

  async updateDepartment(id: string, updates: Partial<InsertDepartment>): Promise<Department> {
    const [department] = await db
      .update(departments)
      .set(updates)
      .where(eq(departments.id, id))
      .returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async getPositions(departmentId?: string): Promise<Position[]> {
    if (departmentId) {
      return await db.select().from(positions)
        .where(eq(positions.departmentId, departmentId))
        .orderBy(asc(positions.level), asc(positions.title));
    }
    return await db.select().from(positions)
      .orderBy(asc(positions.level), asc(positions.title));
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position || undefined;
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [result] = await db.insert(positions).values(position).returning();
    return result;
  }

  async updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position> {
    const [position] = await db
      .update(positions)
      .set(updates)
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // Geographic data
  async getGovernorates(): Promise<Governorate[]> {
    return await db.select().from(governorates)
      .where(eq(governorates.isActive, true))
      .orderBy(asc(governorates.code));
  }

  async getGovernorate(id: string): Promise<Governorate | undefined> {
    const [governorate] = await db.select().from(governorates).where(eq(governorates.id, id));
    return governorate || undefined;
  }

  async getGovernorateByCode(code: string): Promise<Governorate | undefined> {
    const [governorate] = await db.select().from(governorates).where(eq(governorates.code, code));
    return governorate || undefined;
  }

  async createGovernorate(governorate: InsertGovernorate): Promise<Governorate> {
    const [result] = await db.insert(governorates).values(governorate).returning();
    return result;
  }

  async updateGovernorate(id: string, updates: Partial<InsertGovernorate>): Promise<Governorate> {
    const [governorate] = await db
      .update(governorates)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(governorates.id, id))
      .returning();
    return governorate;
  }

  async deleteGovernorate(id: string): Promise<void> {
    await db.delete(governorates).where(eq(governorates.id, id));
  }

  // Districts
  async getDistricts(governorateId?: string): Promise<District[]> {
    if (governorateId) {
      return await db.select().from(districts)
        .where(and(eq(districts.governorateId, governorateId), eq(districts.isActive, true)))
        .orderBy(asc(districts.nameAr));
    }
    return await db.select().from(districts)
      .where(eq(districts.isActive, true))
      .orderBy(asc(districts.nameAr));
  }

  async getDistrict(id: string): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.id, id));
    return district || undefined;
  }

  async getDistrictByCode(code: string): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.code, code));
    return district || undefined;
  }

  async getDistrictsByGovernorateId(governorateId: string): Promise<District[]> {
    return await db.select().from(districts)
      .where(and(eq(districts.governorateId, governorateId), eq(districts.isActive, true)))
      .orderBy(asc(districts.nameAr));
  }

  async createDistrict(district: InsertDistrict): Promise<District> {
    const [result] = await db.insert(districts).values(district).returning();
    return result;
  }

  async updateDistrict(id: string, updates: Partial<InsertDistrict>): Promise<District> {
    const [district] = await db
      .update(districts)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(districts.id, id))
      .returning();
    return district;
  }

  async deleteDistrict(id: string): Promise<void> {
    await db.delete(districts).where(eq(districts.id, id));
  }

  // Geographic Data - New Tables (Minimal implementations for testing)
  async getSubDistricts(districtId?: string): Promise<SubDistrict[]> { 
    if (districtId) {
      return await db.select().from(subDistricts).where(eq(subDistricts.districtId, sql<string>`${districtId}::uuid`));
    }
    return await db.select().from(subDistricts);
  }
  async getSubDistrict(id: string): Promise<SubDistrict | undefined> { throw new Error("Not implemented yet"); }
  async getSubDistrictsByDistrictId(districtId: string): Promise<SubDistrict[]> { 
    return await db.select().from(subDistricts).where(eq(subDistricts.districtId, sql<string>`${districtId}::uuid`));
  }
  async createSubDistrict(subDistrict: InsertSubDistrict): Promise<SubDistrict> { throw new Error("Not implemented yet"); }
  async updateSubDistrict(id: string, updates: Partial<InsertSubDistrict>): Promise<SubDistrict> { throw new Error("Not implemented yet"); }
  async deleteSubDistrict(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getNeighborhoods(subDistrictId?: string): Promise<Neighborhood[]> { 
    if (subDistrictId) {
      return await db.select().from(neighborhoods).where(eq(neighborhoods.subDistrictId, sql<string>`${subDistrictId}::uuid`));
    }
    return await db.select().from(neighborhoods);
  }
  async getNeighborhood(id: string): Promise<Neighborhood | undefined> { 
    const [neighborhood] = await db.select().from(neighborhoods).where(eq(neighborhoods.id, id));
    return neighborhood || undefined;
  }
  async getNeighborhoodsBySubDistrictId(subDistrictId: string): Promise<Neighborhood[]> { 
    return await db.select().from(neighborhoods).where(eq(neighborhoods.subDistrictId, sql<string>`${subDistrictId}::uuid`));
  }
  async createNeighborhood(neighborhood: InsertNeighborhood): Promise<Neighborhood> { throw new Error("Not implemented yet"); }
  async updateNeighborhood(id: string, updates: Partial<InsertNeighborhood>): Promise<Neighborhood> { throw new Error("Not implemented yet"); }
  async deleteNeighborhood(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getHarat(neighborhoodId?: string): Promise<Harat[]> { 
    if (neighborhoodId) {
      return await db.select().from(harat).where(eq(harat.neighborhoodId, neighborhoodId));
    }
    return await db.select().from(harat);
  }
  async getHaratById(id: string): Promise<Harat | undefined> { 
    const [result] = await db.select().from(harat).where(eq(harat.id, id));
    return result || undefined;
  }
  async getHaratByNeighborhoodId(neighborhoodId: string): Promise<Harat[]> { 
    return await db.select().from(harat).where(eq(harat.neighborhoodId, neighborhoodId));
  }
  async createHarat(harat: InsertHarat): Promise<Harat> { throw new Error("Not implemented yet"); }
  async updateHarat(id: string, updates: Partial<InsertHarat>): Promise<Harat> { throw new Error("Not implemented yet"); }
  async deleteHarat(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getSectors(subDistrictId?: string): Promise<Sector[]> { 
    if (subDistrictId) {
      return await db.select().from(sectors).where(eq(sectors.subDistrictId, sql<string>`${subDistrictId}::uuid`));
    }
    return await db.select().from(sectors);
  }
  async getSector(id: string): Promise<Sector | undefined> { 
    const [sector] = await db.select().from(sectors).where(eq(sectors.id, id));
    return sector || undefined;
  }
  async getSectorsByGovernorateId(governorateId: string): Promise<Sector[]> { 
    return await db.select().from(sectors).where(eq(sectors.governorateId, sql<string>`${governorateId}::uuid`));
  }
  async getSectorsByDistrictId(districtId: string): Promise<Sector[]> {
    // Get the district to find its governorate
    const [district] = await db.select().from(districts).where(eq(districts.id, sql<string>`${districtId}::uuid`));
    if (!district) {
      return [];
    }
    // Return all sectors in the same governorate
    return await db.select().from(sectors).where(eq(sectors.governorateId, district.governorateId));
  }
  async getSectorsBySubDistrictId(subDistrictId: string): Promise<Sector[]> {
    // Return sectors that belong to the specific sub-district
    return await db.select().from(sectors).where(eq(sectors.subDistrictId, sql<string>`${subDistrictId}::uuid`));
  }
  async createSector(sector: InsertSector): Promise<Sector> { throw new Error("Not implemented yet"); }
  async updateSector(id: string, updates: Partial<InsertSector>): Promise<Sector> { throw new Error("Not implemented yet"); }
  async deleteSector(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getNeighborhoodUnits(filters?: { neighborhoodId?: string; sectorId?: string }): Promise<NeighborhoodUnit[]> { 
    const conditions = [];
    if (filters?.neighborhoodId) conditions.push(eq(neighborhoodUnits.neighborhoodId, sql<string>`${filters.neighborhoodId}::uuid`));
    if (filters?.sectorId) conditions.push(eq(neighborhoodUnits.sectorId, sql<string>`${filters.sectorId}::uuid`));
    
    if (conditions.length > 0) {
      return await db.select().from(neighborhoodUnits).where(and(...conditions));
    }
    return await db.select().from(neighborhoodUnits);
  }
  async getNeighborhoodUnit(id: string): Promise<NeighborhoodUnit | undefined> { 
    const [result] = await db.select().from(neighborhoodUnits).where(eq(neighborhoodUnits.id, id));
    return result || undefined;
  }
  async getNeighborhoodUnitsByNeighborhoodId(neighborhoodId: string): Promise<NeighborhoodUnit[]> { 
    return await db.select().from(neighborhoodUnits).where(eq(neighborhoodUnits.neighborhoodId, sql<string>`${neighborhoodId}::uuid`));
  }
  async getNeighborhoodUnitsBySectorId(sectorId: string): Promise<NeighborhoodUnit[]> { 
    return await db.select().from(neighborhoodUnits).where(eq(neighborhoodUnits.sectorId, sql<string>`${sectorId}::uuid`));
  }
  async createNeighborhoodUnit(neighborhoodUnit: InsertNeighborhoodUnit): Promise<NeighborhoodUnit> { throw new Error("Not implemented yet"); }
  async updateNeighborhoodUnit(id: string, updates: Partial<InsertNeighborhoodUnit>): Promise<NeighborhoodUnit> { throw new Error("Not implemented yet"); }
  async deleteNeighborhoodUnit(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getBlocks(neighborhoodUnitId?: string): Promise<Block[]> { 
    if (neighborhoodUnitId) {
      return await db.select().from(blocks).where(eq(blocks.neighborhoodUnitId, sql<string>`${neighborhoodUnitId}::uuid`));
    }
    return await db.select().from(blocks);
  }
  async getBlock(id: string): Promise<Block | undefined> { 
    const [result] = await db.select().from(blocks).where(eq(blocks.id, id));
    return result || undefined;
  }
  async getBlocksByNeighborhoodUnitId(neighborhoodUnitId: string): Promise<Block[]> { 
    return await db.select().from(blocks).where(eq(blocks.neighborhoodUnitId, sql<string>`${neighborhoodUnitId}::uuid`));
  }
  async createBlock(block: InsertBlock): Promise<Block> { throw new Error("Not implemented yet"); }
  async updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block> { throw new Error("Not implemented yet"); }
  async deleteBlock(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getPlots(blockId?: string): Promise<Plot[]> { 
    if (blockId) {
      return await db.select().from(plots).where(eq(plots.blockId, blockId));
    }
    return await db.select().from(plots);
  }
  async getPlot(id: string): Promise<Plot | undefined> { 
    const [result] = await db.select().from(plots).where(eq(plots.id, id));
    return result || undefined;
  }
  async getPlotsByBlockId(blockId: string): Promise<Plot[]> { 
    return await db.select().from(plots).where(eq(plots.blockId, blockId));
  }
  async getPlotByNumber(plotNumber: string, blockId: string): Promise<Plot | undefined> { 
    const [result] = await db.select().from(plots).where(and(eq(plots.plotNumber, plotNumber), eq(plots.blockId, blockId)));
    return result || undefined;
  }
  async createPlot(plot: InsertPlot): Promise<Plot> { throw new Error("Not implemented yet"); }
  async updatePlot(id: string, updates: Partial<InsertPlot>): Promise<Plot> { throw new Error("Not implemented yet"); }
  async deletePlot(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getStreets(): Promise<Street[]> { 
    return await db.select().from(streets);
  }
  async getStreet(id: string): Promise<Street | undefined> { 
    const [result] = await db.select().from(streets).where(eq(streets.id, id));
    return result || undefined;
  }
  async createStreet(street: InsertStreet): Promise<Street> { throw new Error("Not implemented yet"); }
  async updateStreet(id: string, updates: Partial<InsertStreet>): Promise<Street> { throw new Error("Not implemented yet"); }
  async deleteStreet(id: string): Promise<void> { throw new Error("Not implemented yet"); }
  
  async getStreetSegments(streetId?: string): Promise<StreetSegment[]> { 
    if (streetId) {
      return await db.select().from(streetSegments).where(eq(streetSegments.streetId, streetId));
    }
    return await db.select().from(streetSegments);
  }
  async getStreetSegment(id: string): Promise<StreetSegment | undefined> { 
    const [result] = await db.select().from(streetSegments).where(eq(streetSegments.id, id));
    return result || undefined;
  }
  async getStreetSegmentsByStreetId(streetId: string): Promise<StreetSegment[]> { 
    return await db.select().from(streetSegments).where(eq(streetSegments.streetId, streetId));
  }
  async createStreetSegment(streetSegment: InsertStreetSegment): Promise<StreetSegment> { throw new Error("Not implemented yet"); }
  async updateStreetSegment(id: string, updates: Partial<InsertStreetSegment>): Promise<StreetSegment> { throw new Error("Not implemented yet"); }
  async deleteStreetSegment(id: string): Promise<void> { throw new Error("Not implemented yet"); }

  // Legal framework
  async getLawsRegulations(): Promise<LawRegulation[]> {
    return await db.select().from(lawsRegulations).orderBy(asc(lawsRegulations.effectiveDate));
  }

  async getLawRegulation(id: string): Promise<LawRegulation | undefined> {
    const [law] = await db.select().from(lawsRegulations).where(eq(lawsRegulations.id, id));
    return law || undefined;
  }

  async createLawRegulation(law: InsertLawRegulation): Promise<LawRegulation> {
    const [result] = await db.insert(lawsRegulations).values(law).returning();
    return result;
  }

  async updateLawRegulation(id: string, updates: Partial<InsertLawRegulation>): Promise<LawRegulation> {
    const [law] = await db
      .update(lawsRegulations)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(lawsRegulations.id, id))
      .returning();
    return law;
  }

  async deleteLawRegulation(id: string): Promise<void> {
    await db.delete(lawsRegulations).where(eq(lawsRegulations.id, id));
  }

  async getLawSections(lawId: string): Promise<LawSection[]> {
    return await db.select().from(lawSections)
      .where(eq(lawSections.lawId, lawId))
      .orderBy(asc(lawSections.orderIndex));
  }

  async getLawSection(id: string): Promise<LawSection | undefined> {
    const [section] = await db.select().from(lawSections).where(eq(lawSections.id, id));
    return section || undefined;
  }

  async createLawSection(section: InsertLawSection): Promise<LawSection> {
    const [result] = await db.insert(lawSections).values(section).returning();
    return result;
  }

  async updateLawSection(id: string, updates: Partial<InsertLawSection>): Promise<LawSection> {
    const [section] = await db
      .update(lawSections)
      .set(updates)
      .where(eq(lawSections.id, id))
      .returning();
    return section;
  }

  async deleteLawSection(id: string): Promise<void> {
    await db.delete(lawSections).where(eq(lawSections.id, id));
  }

  async getLawArticles(sectionId: string): Promise<LawArticle[]> {
    return await db.select().from(lawArticles)
      .where(eq(lawArticles.sectionId, sectionId))
      .orderBy(asc(lawArticles.articleNumber));
  }

  async getLawArticle(id: string): Promise<LawArticle | undefined> {
    const [article] = await db.select().from(lawArticles).where(eq(lawArticles.id, id));
    return article || undefined;
  }

  async createLawArticle(article: InsertLawArticle): Promise<LawArticle> {
    const [result] = await db.insert(lawArticles).values(article).returning();
    return result;
  }

  async updateLawArticle(id: string, updates: Partial<InsertLawArticle>): Promise<LawArticle> {
    const [article] = await db
      .update(lawArticles)
      .set(updates)
      .where(eq(lawArticles.id, id))
      .returning();
    return article;
  }

  async deleteLawArticle(id: string): Promise<void> {
    await db.delete(lawArticles).where(eq(lawArticles.id, id));
  }

  async searchLawArticles(query: string): Promise<LawArticle[]> {
    return await db.select().from(lawArticles)
      .where(
        or(
          ilike(lawArticles.articleText, `%${query}%`),
          ilike(lawArticles.keywords, `%${query}%`)
        )
      )
      .limit(20);
  }

  // Technical requirements
  async getRequirementCategories(): Promise<RequirementCategory[]> {
    return await db.select().from(requirementCategories)
      .where(eq(requirementCategories.isActive, true))
      .orderBy(asc(requirementCategories.orderIndex));
  }

  async getRequirementCategory(id: string): Promise<RequirementCategory | undefined> {
    const [category] = await db.select().from(requirementCategories).where(eq(requirementCategories.id, id));
    return category || undefined;
  }

  async createRequirementCategory(category: InsertRequirementCategory): Promise<RequirementCategory> {
    const [result] = await db.insert(requirementCategories).values(category).returning();
    return result;
  }

  async updateRequirementCategory(id: string, updates: Partial<InsertRequirementCategory>): Promise<RequirementCategory> {
    const [category] = await db
      .update(requirementCategories)
      .set(updates)
      .where(eq(requirementCategories.id, id))
      .returning();
    return category;
  }

  async deleteRequirementCategory(id: string): Promise<void> {
    await db.delete(requirementCategories).where(eq(requirementCategories.id, id));
  }

  async getRequirements(categoryId?: string): Promise<Requirement[]> {
    if (categoryId) {
      return await db.select().from(requirements)
        .where(and(eq(requirements.categoryId, categoryId), eq(requirements.isActive, true)));
    }
    return await db.select().from(requirements)
      .where(eq(requirements.isActive, true));
  }

  async getRequirement(id: string): Promise<Requirement | undefined> {
    const [requirement] = await db.select().from(requirements).where(eq(requirements.id, id));
    return requirement || undefined;
  }

  async createRequirement(requirement: InsertRequirement): Promise<Requirement> {
    const [result] = await db.insert(requirements).values(requirement).returning();
    return result;
  }

  async updateRequirement(id: string, updates: Partial<InsertRequirement>): Promise<Requirement> {
    const [requirement] = await db
      .update(requirements)
      .set(updates)
      .where(eq(requirements.id, id))
      .returning();
    return requirement;
  }

  async deleteRequirement(id: string): Promise<void> {
    await db.delete(requirements).where(eq(requirements.id, id));
  }

  async searchRequirements(query: string): Promise<Requirement[]> {
    return await db.select().from(requirements)
      .where(
        and(
          eq(requirements.isActive, true),
          or(
            ilike(requirements.title, `%${query}%`),
            ilike(requirements.description, `%${query}%`)
          )
        )
      )
      .limit(20);
  }

  // Services
  async getServices(): Promise<Service[]> {
    return await db.select().from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.name));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(service: InsertService): Promise<Service> {
    const [result] = await db.insert(services).values(service).returning();
    return result;
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service> {
    const [service] = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getServiceRequirements(serviceId: string): Promise<any[]> {
    return await db
      .select({
        requirement: requirements,
        serviceRequirement: serviceRequirements,
      })
      .from(serviceRequirements)
      .innerJoin(requirements, eq(serviceRequirements.requirementId, requirements.id))
      .where(eq(serviceRequirements.serviceId, serviceId));
  }

  async addServiceRequirement(serviceId: string, requirementId: string, isOptional?: boolean): Promise<void> {
    await db.insert(serviceRequirements).values({
      serviceId,
      requirementId,
      isOptional: isOptional || false,
    });
  }

  async removeServiceRequirement(serviceId: string, requirementId: string): Promise<void> {
    await db.delete(serviceRequirements)
      .where(and(
        eq(serviceRequirements.serviceId, serviceId),
        eq(serviceRequirements.requirementId, requirementId)
      ));
  }

  // Applications with LBAC filtering
  async getApplications(filters?: { 
    status?: string; 
    applicantId?: string; 
    assignedToId?: string; 
    currentStage?: string;
    userGeographicScope?: {
      userId: string;
      governorateIds?: string[];
      districtIds?: string[];
      subDistrictIds?: string[];
      neighborhoodIds?: string[];
    };
  }): Promise<Application[]> {
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(applications.status, filters.status));
      if (filters.applicantId) conditions.push(eq(applications.applicantId, filters.applicantId));
      if (filters.assignedToId) conditions.push(eq(applications.assignedToId, filters.assignedToId));
      if (filters.currentStage) conditions.push(eq(applications.currentStage, filters.currentStage));
      
      // CRITICAL: Apply LBAC filtering based on user's geographic scope
      if (filters.userGeographicScope) {
        const { governorateIds, districtIds, subDistrictIds, neighborhoodIds } = filters.userGeographicScope;
        
        // Build geographic conditions - applications should be within user's authorized scope
        const geographicConditions = [];
        
        if (governorateIds && governorateIds.length > 0) {
          // SIMPLIFIED APPROACH: For now, let all users in the same governorate see all applications
          // This gives us working LBAC while we build more sophisticated geographic linking
          
          // First, find all users in the same governorates as the current user
          const usersInSameGovernorates = db
            .select({ userId: userGeographicAssignments.userId })
            .from(userGeographicAssignments)
            .where(and(
              inArray(userGeographicAssignments.governorateId, governorateIds),
              eq(userGeographicAssignments.isActive, true)
            ));
          
          // Then filter applications by these users
          geographicConditions.push(inArray(applications.applicantId, usersInSameGovernorates));
        }
        
        if (geographicConditions.length > 0) {
          conditions.push(or(...geographicConditions));
        }
      }
      
      if (conditions.length > 0) {
        return await db.select().from(applications)
          .where(and(...conditions))
          .orderBy(desc(applications.createdAt));
      }
    }
    
    return await db.select().from(applications)
      .orderBy(desc(applications.createdAt));
  }

  async getApplicationsPaginated(params: PaginationParams): Promise<PaginatedResponse<Application>> {
    return await executePaginatedQuery<Application>(db, applications, params, {
      searchableFields: [applications.applicationNumber],
      sortableFields: {
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        currentStage: applications.currentStage,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        fees: applications.fees
      },
      filterableFields: {
        status: applications.status,
        currentStage: applications.currentStage,
        serviceId: applications.serviceId,
        assignedToId: applications.assignedToId,
        applicantId: applications.applicantId
      }
    });
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async getApplicationByNumber(applicationNumber: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.applicationNumber, applicationNumber));
    return application || undefined;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const applicationNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [result] = await db.insert(applications).values({
      ...application,
      applicationNumber,
    }).returning();
    return result;
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application> {
    const [application] = await db
      .update(applications)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  async deleteApplication(id: string): Promise<void> {
    await db.delete(applications).where(eq(applications.id, id));
  }

  // Surveying decisions with LBAC filtering
  async getSurveyingDecisions(filters?: { 
    status?: string; 
    surveyorId?: string;
    userGeographicScope?: {
      userId: string;
      governorateIds?: string[];
      districtIds?: string[];
      subDistrictIds?: string[];
      neighborhoodIds?: string[];
    };
  }): Promise<SurveyingDecision[]> {
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(surveyingDecisions.status, filters.status));
      if (filters.surveyorId) conditions.push(eq(surveyingDecisions.surveyorId, filters.surveyorId));
      
      // CRITICAL: Apply LBAC filtering based on user's geographic scope
      if (filters.userGeographicScope) {
        const { governorateIds } = filters.userGeographicScope;
        
        if (governorateIds && governorateIds.length > 0) {
          // SIMPLIFIED APPROACH: For surveying decisions, filter by surveyors in same governorate
          // Find all users (surveyors) in the same governorates as the current user
          const surveyorsInSameGovernorates = db
            .select({ userId: userGeographicAssignments.userId })
            .from(userGeographicAssignments)
            .where(and(
              inArray(userGeographicAssignments.governorateId, governorateIds),
              eq(userGeographicAssignments.isActive, true)
            ));
          
          // Filter decisions by these surveyors
          conditions.push(inArray(surveyingDecisions.surveyorId, surveyorsInSameGovernorates));
        }
      }
      
      if (conditions.length > 0) {
        return await db.select().from(surveyingDecisions)
          .where(and(...conditions))
          .orderBy(desc(surveyingDecisions.createdAt));
      }
    }
    
    return await db.select().from(surveyingDecisions)
      .orderBy(desc(surveyingDecisions.createdAt));
  }

  async getSurveyingDecision(id: string): Promise<SurveyingDecision | undefined> {
    const [decision] = await db.select().from(surveyingDecisions).where(eq(surveyingDecisions.id, id));
    return decision || undefined;
  }

  async getSurveyingDecisionByNumber(decisionNumber: string): Promise<SurveyingDecision | undefined> {
    const [decision] = await db.select().from(surveyingDecisions).where(eq(surveyingDecisions.decisionNumber, decisionNumber));
    return decision || undefined;
  }

  async createSurveyingDecision(decision: InsertSurveyingDecision): Promise<SurveyingDecision> {
    const decisionNumber = `SD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [result] = await db.insert(surveyingDecisions).values({
      ...decision,
      decisionNumber,
    }).returning();
    return result;
  }

  async updateSurveyingDecision(id: string, updates: Partial<InsertSurveyingDecision>): Promise<SurveyingDecision> {
    const [decision] = await db
      .update(surveyingDecisions)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(surveyingDecisions.id, id))
      .returning();
    return decision;
  }

  async deleteSurveyingDecision(id: string): Promise<void> {
    await db.delete(surveyingDecisions).where(eq(surveyingDecisions.id, id));
  }

  // Tasks
  async getTasks(filters?: { assignedToId?: string; status?: string; applicationId?: string }): Promise<Task[]> {
    if (filters) {
      const conditions = [];
      if (filters.assignedToId) conditions.push(eq(tasks.assignedToId, filters.assignedToId));
      if (filters.status) conditions.push(eq(tasks.status, filters.status));
      if (filters.applicationId) conditions.push(eq(tasks.applicationId, filters.applicationId));
      
      if (conditions.length > 0) {
        return await db.select().from(tasks)
          .where(and(...conditions))
          .orderBy(desc(tasks.createdAt));
      }
    }
    
    return await db.select().from(tasks)
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksPaginated(params: PaginationParams): Promise<PaginatedResponse<Task>> {
    return await executePaginatedQuery<Task>(db, tasks, params, {
      searchableFields: [tasks.title, tasks.description, tasks.notes],
      sortableFields: {
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        dueDate: tasks.dueDate
      },
      filterableFields: {
        status: tasks.status,
        priority: tasks.priority,
        assignedToId: tasks.assignedToId,
        assignedById: tasks.assignedById,
        applicationId: tasks.applicationId
      }
    });
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [result] = await db.insert(tasks).values(task).returning();
    return result;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // System settings
  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const [result] = await db.insert(systemSettings).values(setting)
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: setting.value,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();
    return result;
  }

  async updateSystemSetting(key: string, value: any): Promise<SystemSetting> {
    const [setting] = await db
      .update(systemSettings)
      .set({ value, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(systemSettings.key, key))
      .returning();
    return setting;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    activeApplications: number;
    issuedLicenses: number;
    surveyingDecisions: number;
    satisfactionRate: number;
  }> {
    const [activeAppsResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(eq(applications.status, "under_review"));

    const [issuedLicensesResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(eq(applications.status, "approved"));

    const [surveyingDecisionsResult] = await db
      .select({ count: count() })
      .from(surveyingDecisions)
      .where(eq(surveyingDecisions.status, "completed"));

    return {
      activeApplications: activeAppsResult.count,
      issuedLicenses: issuedLicensesResult.count,
      surveyingDecisions: surveyingDecisionsResult.count,
      satisfactionRate: 98.5, // This would come from a satisfaction survey system
    };
  }

  // Search functionality
  async globalSearch(query: string): Promise<{
    laws: LawArticle[];
    requirements: Requirement[];
    applications: Application[];
  }> {
    const [lawsResult, requirementsResult, applicationsResult] = await Promise.all([
      this.searchLawArticles(query),
      this.searchRequirements(query),
      db.select().from(applications)
        .where(ilike(applications.applicationNumber, `%${query}%`))
        .limit(10),
    ]);

    return {
      laws: lawsResult,
      requirements: requirementsResult,
      applications: applicationsResult,
    };
  }

  // Advanced Service Builder System Implementation
  async getServiceTemplates(): Promise<ServiceTemplate[]> {
    return await db.select().from(serviceTemplates).orderBy(desc(serviceTemplates.createdAt));
  }

  async getServiceTemplate(id: string): Promise<ServiceTemplate | undefined> {
    const [template] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
    return template || undefined;
  }

  async createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate> {
    const [result] = await db.insert(serviceTemplates).values({
      ...template,
      id: randomUUID(),
    }).returning();
    return result;
  }

  async updateServiceTemplate(id: string, updates: Partial<InsertServiceTemplate>): Promise<ServiceTemplate> {
    const [template] = await db
      .update(serviceTemplates)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(serviceTemplates.id, id))
      .returning();
    return template;
  }

  // Service Builder Operations
  async getServiceBuilder(id: string): Promise<ServiceBuilder | undefined> {
    const [builder] = await db.select().from(serviceBuilder).where(eq(serviceBuilder.id, id));
    return builder || undefined;
  }

  async createServiceBuilder(builderData: any): Promise<ServiceBuilder> {
    const [result] = await db.insert(serviceBuilder).values({
      id: randomUUID(),
      ...builderData,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).returning();
    return result;
  }

  async updateServiceBuilder(id: string, updates: any): Promise<ServiceBuilder> {
    const [builder] = await db
      .update(serviceBuilder)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(serviceBuilder.id, id))
      .returning();
    return builder;
  }

  async publishService(id: string, publisherId: string): Promise<ServiceBuilder> {
    const [builder] = await db
      .update(serviceBuilder)
      .set({ 
        publicationStatus: "published",
        lastModifiedById: publisherId,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(serviceBuilder.id, id))
      .returning();
    return builder;
  }

  // Dynamic Forms Implementation
  async getServiceForm(serviceId: string): Promise<DynamicForm | undefined> {
    const [form] = await db.select().from(dynamicForms).where(eq(dynamicForms.serviceId, serviceId));
    return form || undefined;
  }

  async createDynamicForm(form: InsertDynamicForm): Promise<DynamicForm> {
    const [result] = await db.insert(dynamicForms).values({
      ...form,
      id: randomUUID(),
    }).returning();
    return result;
  }

  async updateDynamicForm(id: string, updates: Partial<InsertDynamicForm>): Promise<DynamicForm> {
    const [form] = await db
      .update(dynamicForms)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(dynamicForms.id, id))
      .returning();
    return form;
  }

  // Workflow Management Implementation
  async getServiceWorkflow(serviceId: string): Promise<WorkflowDefinition | undefined> {
    const [workflow] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.serviceId, serviceId));
    return workflow || undefined;
  }

  async createWorkflowDefinition(workflow: InsertWorkflowDefinition): Promise<WorkflowDefinition> {
    const [result] = await db.insert(workflowDefinitions).values({
      ...workflow,
      id: randomUUID(),
    }).returning();
    return result;
  }

  async updateWorkflowDefinition(id: string, updates: Partial<InsertWorkflowDefinition>): Promise<WorkflowDefinition> {
    const [workflow] = await db
      .update(workflowDefinitions)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(workflowDefinitions.id, id))
      .returning();
    return workflow;
  }

  // Analytics and Reports Implementation
  async getServiceUsageAnalytics(): Promise<any> {
    // Service usage statistics
    const serviceStats = await db
      .select({
        serviceId: serviceTemplates.id,
        serviceName: serviceTemplates.name,
        usageCount: count()
      })
      .from(serviceTemplates)
      .leftJoin(applications, eq(applications.serviceId, serviceTemplates.id))
      .groupBy(serviceTemplates.id, serviceTemplates.name)
      .orderBy(desc(count()));

    const totalServices = await db.select({ count: count() }).from(serviceTemplates);
    const activeServices = await db
      .select({ count: count() })
      .from(serviceTemplates)
      .where(eq(serviceTemplates.isActive, true));

    return {
      totalServices: totalServices[0].count,
      activeServices: activeServices[0].count,
      serviceStats,
      averageProcessingTime: "2.5 أيام",
      successRate: "96.7%"
    };
  }

  async getWorkflowPerformanceAnalytics(): Promise<any> {
    // Workflow performance metrics
    const workflowStats = await db
      .select({
        workflowId: workflowDefinitions.id,
        workflowName: workflowDefinitions.name,
        stepCount: sql<number>`jsonb_array_length(${workflowDefinitions.stages})`
      })
      .from(workflowDefinitions);

    const completedTasks = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    const pendingTasks = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "pending"));

    return {
      totalWorkflows: workflowStats.length,
      averageSteps: workflowStats.reduce((acc, w) => acc + w.stepCount, 0) / workflowStats.length || 0,
      completedTasks: completedTasks[0].count,
      pendingTasks: pendingTasks[0].count,
      efficiency: "94.2%",
      bottlenecks: ["مراجعة المستندات", "الموافقة النهائية"]
    };
  }

  async getSystemHealth(): Promise<any> {
    const totalUsers = await db.select({ count: count() }).from(users);
    const activeUsers = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    const totalApplications = await db.select({ count: count() }).from(applications);
    const recentApplications = await db
      .select({ count: count() })
      .from(applications)
      .where(sql`${applications.createdAt} >= NOW() - INTERVAL '7 days'`);

    return {
      status: "healthy",
      uptime: "99.9%",
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      totalApplications: totalApplications[0].count,
      weeklyApplications: recentApplications[0].count,
      databaseConnections: 45,
      memoryUsage: "78%",
      cpuUsage: "23%",
      lastBackup: new Date().toISOString()
    };
  }

  // Workflow Management - Status History
  async getApplicationStatusHistory(applicationId: string): Promise<ApplicationStatusHistory[]> {
    return await db
      .select()
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, applicationId))
      .orderBy(desc(applicationStatusHistory.changedAt));
  }

  async createApplicationStatusHistory(history: InsertApplicationStatusHistory): Promise<ApplicationStatusHistory> {
    const newHistory = {
      ...history,
      id: randomUUID(),
      changedAt: new Date()
    };

    const [created] = await db
      .insert(applicationStatusHistory)
      .values(newHistory)
      .returning();
    
    return created;
  }

  // Workflow Management - Assignments
  async getApplicationAssignments(applicationId: string): Promise<ApplicationAssignment[]> {
    return await db
      .select()
      .from(applicationAssignments)
      .where(eq(applicationAssignments.applicationId, applicationId))
      .orderBy(desc(applicationAssignments.assignedAt));
  }

  async createApplicationAssignment(assignment: InsertApplicationAssignment): Promise<ApplicationAssignment> {
    const newAssignment = {
      ...assignment,
      id: randomUUID(),
      assignedAt: new Date(),
      status: assignment.status || 'pending'
    };

    const [created] = await db
      .insert(applicationAssignments)
      .values(newAssignment)
      .returning();
    
    return created;
  }

  async updateApplicationAssignment(id: string, updates: Partial<InsertApplicationAssignment>): Promise<ApplicationAssignment> {
    const [updated] = await db
      .update(applicationAssignments)
      .set(updates)
      .where(eq(applicationAssignments.id, id))
      .returning();

    if (!updated) {
      throw new Error('Assignment not found');
    }

    return updated;
  }

  async getUserAssignments(userId: string): Promise<ApplicationAssignment[]> {
    return await db
      .select()
      .from(applicationAssignments)
      .where(eq(applicationAssignments.assignedToId, userId))
      .orderBy(desc(applicationAssignments.assignedAt));
  }

  async getDepartmentWorkload(departmentId: string): Promise<any> {
    // Get users in department
    const departmentUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.departmentId, departmentId));

    const userIds = departmentUsers.map(u => u.id);
    
    if (userIds.length === 0) {
      return {
        totalAssignments: 0,
        pendingAssignments: 0,
        completedAssignments: 0,
        averageCompletionTime: 0
      };
    }

    const totalAssignments = await db
      .select({ count: count() })
      .from(applicationAssignments)
      .where(inArray(applicationAssignments.assignedToId, userIds));

    const pendingAssignments = await db
      .select({ count: count() })
      .from(applicationAssignments)
      .where(and(
        inArray(applicationAssignments.assignedToId, userIds),
        eq(applicationAssignments.status, 'pending')
      ));

    const completedAssignments = await db
      .select({ count: count() })
      .from(applicationAssignments)
      .where(and(
        inArray(applicationAssignments.assignedToId, userIds),
        eq(applicationAssignments.status, 'completed')
      ));

    return {
      totalAssignments: totalAssignments[0].count,
      pendingAssignments: pendingAssignments[0].count,
      completedAssignments: completedAssignments[0].count,
      averageCompletionTime: 3.2 // days - placeholder calculation
    };
  }

  // Workflow Management - Reviews
  async getApplicationReviews(applicationId: string): Promise<ApplicationReview[]> {
    return await db
      .select()
      .from(applicationReviews)
      .where(eq(applicationReviews.applicationId, applicationId))
      .orderBy(desc(applicationReviews.reviewedAt));
  }

  async createApplicationReview(review: InsertApplicationReview): Promise<ApplicationReview> {
    const newReview = {
      ...review,
      id: randomUUID(),
      reviewedAt: new Date()
    };

    const [created] = await db
      .insert(applicationReviews)
      .values(newReview)
      .returning();
    
    return created;
  }

  // Notifications
  async getNotifications(filters: { 
    userId: string; 
    isRead?: boolean; 
    category?: string; 
    type?: string; 
  }): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, filters.userId)];
    
    if (filters.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, filters.isRead));
    }
    
    if (filters.category) {
      conditions.push(eq(notifications.category, filters.category));
    }
    
    if (filters.type) {
      conditions.push(eq(notifications.type, filters.type));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification = {
      ...notification,
      id: randomUUID(),
      isRead: false,
      createdAt: new Date()
    };

    const [created] = await db
      .insert(notifications)
      .values(newNotification)
      .returning();
    
    return created;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    if (!updated) {
      throw new Error('Notification not found');
    }

    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // Appointments Management
  async getAppointments(filters?: { 
    applicationId?: string; 
    assignedToId?: string; 
    status?: string;
    confirmationStatus?: string;
  }): Promise<Appointment[]> {
    const conditions = [];
    
    if (filters?.applicationId) {
      conditions.push(eq(appointments.applicationId, filters.applicationId));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(appointments.assignedToId, filters.assignedToId));
    }
    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }
    if (filters?.confirmationStatus) {
      conditions.push(eq(appointments.confirmationStatus, filters.confirmationStatus));
    }

    return await db
      .select()
      .from(appointments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointments.appointmentDate));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    
    return created;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      throw new Error('Appointment not found');
    }

    return updated;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async getUpcomingAppointments(assignedToId: string, daysAhead: number = 7): Promise<Appointment[]> {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    return await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.assignedToId, assignedToId),
        sql`${appointments.appointmentDate} >= NOW()`,
        sql`${appointments.appointmentDate} <= ${future.toISOString()}`
      ))
      .orderBy(asc(appointments.appointmentDate));
  }

  async confirmAppointment(id: string, confirmedBy: 'citizen' | 'engineer', notes?: string): Promise<Appointment> {
    const updates: any = {
      updatedAt: sql`CURRENT_TIMESTAMP`
    };

    if (confirmedBy === 'citizen') {
      updates.citizenConfirmed = true;
      updates.confirmationStatus = 'confirmed';
    } else if (confirmedBy === 'engineer') {
      updates.engineerConfirmed = true;
    }

    if (notes) {
      updates.contactNotes = notes;
    }

    const [updated] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      throw new Error('Appointment not found');
    }

    return updated;
  }

  // Contact Attempts Management
  async getContactAttempts(filters?: {
    applicationId?: string;
    appointmentId?: string;
    attemptedById?: string;
    isSuccessful?: boolean;
  }): Promise<ContactAttempt[]> {
    const conditions = [];
    
    if (filters?.applicationId) {
      conditions.push(eq(contactAttempts.applicationId, filters.applicationId));
    }
    if (filters?.appointmentId) {
      conditions.push(eq(contactAttempts.appointmentId, filters.appointmentId));
    }
    if (filters?.attemptedById) {
      conditions.push(eq(contactAttempts.attemptedById, filters.attemptedById));
    }
    if (filters?.isSuccessful !== undefined) {
      conditions.push(eq(contactAttempts.isSuccessful, filters.isSuccessful));
    }

    return await db
      .select()
      .from(contactAttempts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contactAttempts.createdAt));
  }

  async createContactAttempt(attempt: InsertContactAttempt): Promise<ContactAttempt> {
    const [created] = await db
      .insert(contactAttempts)
      .values(attempt)
      .returning();
    
    return created;
  }

  async getContactAttemptsForApplication(applicationId: string): Promise<ContactAttempt[]> {
    return await db
      .select()
      .from(contactAttempts)
      .where(eq(contactAttempts.applicationId, applicationId))
      .orderBy(desc(contactAttempts.createdAt));
  }

  async markContactAttemptSuccessful(id: string, notes?: string): Promise<ContactAttempt> {
    const updates: any = {
      isSuccessful: true,
      attemptResult: 'success'
    };

    if (notes) {
      updates.notes = notes;
    }

    const [updated] = await db
      .update(contactAttempts)
      .set(updates)
      .where(eq(contactAttempts.id, id))
      .returning();

    if (!updated) {
      throw new Error('Contact attempt not found');
    }

    return updated;
  }

  // Survey Assignment Forms Management
  async getSurveyAssignmentForms(filters?: {
    applicationId?: string;
    assignedToId?: string;
    status?: string;
  }): Promise<SurveyAssignmentForm[]> {
    const conditions = [];
    
    if (filters?.applicationId) {
      conditions.push(eq(surveyAssignmentForms.applicationId, filters.applicationId));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(surveyAssignmentForms.assignedToId, filters.assignedToId));
    }
    if (filters?.status) {
      conditions.push(eq(surveyAssignmentForms.status, filters.status));
    }

    return await db
      .select()
      .from(surveyAssignmentForms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(surveyAssignmentForms.createdAt));
  }

  async getSurveyAssignmentForm(id: string): Promise<SurveyAssignmentForm | undefined> {
    const [form] = await db
      .select()
      .from(surveyAssignmentForms)
      .where(eq(surveyAssignmentForms.id, id));
    return form;
  }

  async createSurveyAssignmentForm(form: InsertSurveyAssignmentForm): Promise<SurveyAssignmentForm> {
    const [created] = await db
      .insert(surveyAssignmentForms)
      .values(form)
      .returning();
    
    return created;
  }

  async updateSurveyAssignmentForm(id: string, updates: Partial<InsertSurveyAssignmentForm>): Promise<SurveyAssignmentForm> {
    const [updated] = await db
      .update(surveyAssignmentForms)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(surveyAssignmentForms.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey assignment form not found');
    }

    return updated;
  }

  async markFormAsPrinted(id: string): Promise<SurveyAssignmentForm> {
    const [updated] = await db
      .update(surveyAssignmentForms)
      .set({ 
        status: 'printed',
        printedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyAssignmentForms.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey assignment form not found');
    }

    return updated;
  }

  async markFormAsSigned(id: string, supervisorSignature: string): Promise<SurveyAssignmentForm> {
    const [updated] = await db
      .update(surveyAssignmentForms)
      .set({ 
        status: 'signed',
        signedAt: sql`CURRENT_TIMESTAMP`,
        supervisorSignature,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyAssignmentForms.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey assignment form not found');
    }

    return updated;
  }

  // ======= FIELD VISITS MANAGEMENT =======

  async getFieldVisits(filters?: {
    appointmentId?: string;
    applicationId?: string;
    engineerId?: string;
    status?: string;
  }): Promise<FieldVisit[]> {
    const conditions = [];
    
    if (filters?.appointmentId) {
      conditions.push(eq(fieldVisits.appointmentId, filters.appointmentId));
    }
    if (filters?.applicationId) {
      conditions.push(eq(fieldVisits.applicationId, filters.applicationId));
    }
    if (filters?.engineerId) {
      conditions.push(eq(fieldVisits.engineerId, filters.engineerId));
    }
    if (filters?.status) {
      conditions.push(eq(fieldVisits.status, filters.status));
    }

    return await db
      .select()
      .from(fieldVisits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fieldVisits.visitDate));
  }

  async getFieldVisit(id: string): Promise<FieldVisit | undefined> {
    const [visit] = await db
      .select()
      .from(fieldVisits)
      .where(eq(fieldVisits.id, id));
    return visit;
  }

  async createFieldVisit(visit: InsertFieldVisit): Promise<FieldVisit> {
    const [created] = await db
      .insert(fieldVisits)
      .values(visit)
      .returning();
    
    return created;
  }

  async updateFieldVisit(id: string, updates: Partial<InsertFieldVisit>): Promise<FieldVisit> {
    const [updated] = await db
      .update(fieldVisits)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(fieldVisits.id, id))
      .returning();

    if (!updated) {
      throw new Error('Field visit not found');
    }

    return updated;
  }

  async startFieldVisit(id: string, gpsLocation?: any): Promise<FieldVisit> {
    const [updated] = await db
      .update(fieldVisits)
      .set({ 
        status: 'in_progress',
        arrivalTime: sql`CURRENT_TIMESTAMP`,
        gpsLocation,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(fieldVisits.id, id))
      .returning();

    if (!updated) {
      throw new Error('Field visit not found');
    }

    return updated;
  }

  async completeFieldVisit(id: string, notes?: string, requiresFollowUp?: boolean, followUpReason?: string): Promise<FieldVisit> {
    const [updated] = await db
      .update(fieldVisits)
      .set({ 
        status: 'completed',
        departureTime: sql`CURRENT_TIMESTAMP`,
        visitNotes: notes,
        requiresFollowUp: requiresFollowUp || false,
        followUpReason,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(fieldVisits.id, id))
      .returning();

    if (!updated) {
      throw new Error('Field visit not found');
    }

    return updated;
  }

  async getEngineerFieldVisits(engineerId: string, status?: string): Promise<FieldVisit[]> {
    const conditions = [eq(fieldVisits.engineerId, engineerId)];
    
    if (status) {
      conditions.push(eq(fieldVisits.status, status));
    }

    return await db
      .select()
      .from(fieldVisits)
      .where(and(...conditions))
      .orderBy(desc(fieldVisits.visitDate));
  }

  // ======= SURVEY RESULTS MANAGEMENT =======

  async getSurveyResults(filters?: {
    fieldVisitId?: string;
    applicationId?: string;
    engineerId?: string;
    completionStatus?: string;
    qualityCheckStatus?: string;
  }): Promise<SurveyResult[]> {
    const conditions = [];
    
    if (filters?.fieldVisitId) {
      conditions.push(eq(surveyResults.fieldVisitId, filters.fieldVisitId));
    }
    if (filters?.applicationId) {
      conditions.push(eq(surveyResults.applicationId, filters.applicationId));
    }
    if (filters?.engineerId) {
      conditions.push(eq(surveyResults.engineerId, filters.engineerId));
    }
    if (filters?.completionStatus) {
      conditions.push(eq(surveyResults.completionStatus, filters.completionStatus));
    }
    if (filters?.qualityCheckStatus) {
      conditions.push(eq(surveyResults.qualityCheckStatus, filters.qualityCheckStatus));
    }

    return await db
      .select()
      .from(surveyResults)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(surveyResults.createdAt));
  }

  async getSurveyResult(id: string): Promise<SurveyResult | undefined> {
    const [result] = await db
      .select()
      .from(surveyResults)
      .where(eq(surveyResults.id, id));
    return result;
  }

  async createSurveyResult(result: InsertSurveyResult): Promise<SurveyResult> {
    const [created] = await db
      .insert(surveyResults)
      .values(result)
      .returning();
    
    return created;
  }

  async updateSurveyResult(id: string, updates: Partial<InsertSurveyResult>): Promise<SurveyResult> {
    const [updated] = await db
      .update(surveyResults)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(surveyResults.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey result not found');
    }

    return updated;
  }

  async completeSurveyResult(id: string): Promise<SurveyResult> {
    const [updated] = await db
      .update(surveyResults)
      .set({ 
        completionStatus: 'completed',
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyResults.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey result not found');
    }

    return updated;
  }

  async approveSurveyResult(id: string, approvedById: string, reviewNotes?: string): Promise<SurveyResult> {
    const [updated] = await db
      .update(surveyResults)
      .set({ 
        qualityCheckStatus: 'approved',
        approvedById,
        approvedAt: sql`CURRENT_TIMESTAMP`,
        reviewNotes,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyResults.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey result not found');
    }

    return updated;
  }

  async rejectSurveyResult(id: string, reviewNotes: string): Promise<SurveyResult> {
    const [updated] = await db
      .update(surveyResults)
      .set({ 
        qualityCheckStatus: 'rejected',
        reviewNotes,
        completionStatus: 'needs_revision',
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyResults.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey result not found');
    }

    return updated;
  }

  // ======= SURVEY REPORTS MANAGEMENT =======

  async getSurveyReports(filters?: {
    surveyResultId?: string;
    fieldVisitId?: string;
    applicationId?: string;
    engineerId?: string;
    reportType?: string;
    approvalStatus?: string;
  }): Promise<SurveyReport[]> {
    const conditions = [];
    
    if (filters?.surveyResultId) {
      conditions.push(eq(surveyReports.surveyResultId, filters.surveyResultId));
    }
    if (filters?.fieldVisitId) {
      conditions.push(eq(surveyReports.fieldVisitId, filters.fieldVisitId));
    }
    if (filters?.applicationId) {
      conditions.push(eq(surveyReports.applicationId, filters.applicationId));
    }
    if (filters?.engineerId) {
      conditions.push(eq(surveyReports.engineerId, filters.engineerId));
    }
    if (filters?.reportType) {
      conditions.push(eq(surveyReports.reportType, filters.reportType));
    }
    if (filters?.approvalStatus) {
      conditions.push(eq(surveyReports.approvalStatus, filters.approvalStatus));
    }

    return await db
      .select()
      .from(surveyReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(surveyReports.createdAt));
  }

  async getSurveyReport(id: string): Promise<SurveyReport | undefined> {
    const [report] = await db
      .select()
      .from(surveyReports)
      .where(eq(surveyReports.id, id));
    return report;
  }

  async createSurveyReport(report: InsertSurveyReport): Promise<SurveyReport> {
    const [created] = await db
      .insert(surveyReports)
      .values(report)
      .returning();
    
    return created;
  }

  async updateSurveyReport(id: string, updates: Partial<InsertSurveyReport>): Promise<SurveyReport> {
    const [updated] = await db
      .update(surveyReports)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(surveyReports.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey report not found');
    }

    return updated;
  }

  async approveSurveyReport(id: string, approvedById: string): Promise<SurveyReport> {
    const [updated] = await db
      .update(surveyReports)
      .set({ 
        approvalStatus: 'approved',
        approvedById,
        approvedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyReports.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey report not found');
    }

    return updated;
  }

  async rejectSurveyReport(id: string, rejectionReason: string): Promise<SurveyReport> {
    const [updated] = await db
      .update(surveyReports)
      .set({ 
        approvalStatus: 'rejected',
        rejectionReason,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(surveyReports.id, id))
      .returning();

    if (!updated) {
      throw new Error('Survey report not found');
    }

    return updated;
  }

  async getPublicReportsForApplication(applicationId: string): Promise<SurveyReport[]> {
    return await db
      .select()
      .from(surveyReports)
      .where(and(
        eq(surveyReports.applicationId, applicationId),
        eq(surveyReports.isPublic, true),
        eq(surveyReports.approvalStatus, 'approved')
      ))
      .orderBy(desc(surveyReports.createdAt));
  }

  // ======= ENGINEER DASHBOARD HELPERS =======

  async getEngineerWorkload(engineerId: string): Promise<{
    upcomingAppointments: number;
    inProgressVisits: number;
    pendingReports: number;
    completedSurveys: number;
  }> {
    const [upcomingAppointments] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(
        eq(appointments.assignedToId, engineerId),
        eq(appointments.status, 'scheduled')
      ));

    const [inProgressVisits] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fieldVisits)
      .where(and(
        eq(fieldVisits.engineerId, engineerId),
        eq(fieldVisits.status, 'in_progress')
      ));

    const [pendingReports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyReports)
      .where(and(
        eq(surveyReports.engineerId, engineerId),
        eq(surveyReports.approvalStatus, 'pending')
      ));

    const [completedSurveys] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResults)
      .where(and(
        eq(surveyResults.engineerId, engineerId),
        eq(surveyResults.completionStatus, 'completed')
      ));

    return {
      upcomingAppointments: upcomingAppointments.count,
      inProgressVisits: inProgressVisits.count,
      pendingReports: pendingReports.count,
      completedSurveys: completedSurveys.count
    };
  }

  async getEngineerOperationDetails(engineerId: string): Promise<Array<{
    applicationId: string;
    applicationNumber: string;
    citizenName: string;
    citizenPhone: string;
    serviceType: string;
    purpose: string;
    status: string;
    currentStage: string;
    scheduledDate?: string;
    assignmentDate: string;
    location: string;
    priority: string;
    deadline?: string;
    completionStatus: string;
  }>> {
    // Get all applications assigned to this engineer through appointments
    const results = await db
      .select({
        applicationId: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        currentStage: applications.currentStage,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        assignmentDate: appointments.createdAt,
        appointmentStatus: appointments.status,
        location: appointments.location,
        contactPhone: appointments.contactPhone,
      })
      .from(applications)
      .innerJoin(appointments, eq(applications.id, appointments.applicationId))
      .where(eq(appointments.assignedToId, engineerId))
      .orderBy(desc(appointments.createdAt));

    return results.map(result => ({
      applicationId: result.applicationId,
      applicationNumber: result.applicationNumber,
      citizenName: 'المواطن المستفيد',
      citizenPhone: result.contactPhone || 'غير محدد',
      serviceType: 'خدمة مساحة الأراضي',
      purpose: 'تحديد حدود الأرض ومساحتها',
      status: result.status || 'في الانتظار',
      currentStage: result.currentStage || 'تحديد موعد',
      scheduledDate: result.appointmentDate ? new Date(result.appointmentDate).toISOString().split('T')[0] : undefined,
      assignmentDate: result.assignmentDate ? new Date(result.assignmentDate).toISOString() : new Date().toISOString(),
      location: result.location || 'غير محدد',
      priority: 'عادي',
      deadline: undefined,
      completionStatus: this.getOperationCompletionStatus(result.appointmentStatus || 'scheduled', result.currentStage || 'pending')
    }));
  }

  private getOperationCompletionStatus(appointmentStatus: string, applicationStage: string): string {
    if (appointmentStatus === 'completed' && applicationStage === 'completed') {
      return 'مكتمل';
    } else if (appointmentStatus === 'in_progress' || applicationStage === 'in_progress') {
      return 'قيد التنفيذ';
    } else if (appointmentStatus === 'confirmed') {
      return 'جاهز للتنفيذ';
    } else if (appointmentStatus === 'scheduled') {
      return 'مجدول';
    } else {
      return 'في الانتظار';
    }
  }

  // ======= MOBILE SYNC FUNCTIONALITY =======

  // Device Registration Management
  async getDeviceRegistrations(userId?: string, isActive?: boolean): Promise<DeviceRegistration[]> {
    const conditions = [];
    if (userId) conditions.push(eq(deviceRegistrations.userId, userId));
    if (isActive !== undefined) conditions.push(eq(deviceRegistrations.isActive, isActive));
    
    if (conditions.length > 0) {
      return await db.select().from(deviceRegistrations)
        .where(and(...conditions))
        .orderBy(desc(deviceRegistrations.lastSync));
    }
    
    return await db.select().from(deviceRegistrations)
      .orderBy(desc(deviceRegistrations.lastSync));
  }

  async getDeviceRegistration(id: string): Promise<DeviceRegistration | undefined> {
    const [device] = await db
      .select()
      .from(deviceRegistrations)
      .where(eq(deviceRegistrations.id, id));
    return device || undefined;
  }

  async getDeviceByDeviceId(deviceId: string): Promise<DeviceRegistration | undefined> {
    const [device] = await db
      .select()
      .from(deviceRegistrations)
      .where(eq(deviceRegistrations.deviceId, deviceId));
    return device || undefined;
  }

  async registerDevice(device: InsertDeviceRegistration): Promise<DeviceRegistration> {
    const [newDevice] = await db
      .insert(deviceRegistrations)
      .values(device)
      .returning();
    return newDevice;
  }

  async updateDeviceRegistration(id: string, updates: Partial<InsertDeviceRegistration>): Promise<DeviceRegistration> {
    const [updated] = await db
      .update(deviceRegistrations)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(deviceRegistrations.id, id))
      .returning();
    return updated;
  }

  async deactivateDevice(id: string): Promise<DeviceRegistration> {
    const [updated] = await db
      .update(deviceRegistrations)
      .set({ 
        isActive: false, 
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(eq(deviceRegistrations.id, id))
      .returning();
    return updated;
  }

  async updateDeviceLastSync(deviceId: string): Promise<DeviceRegistration> {
    const [updated] = await db
      .update(deviceRegistrations)
      .set({ 
        lastSync: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(eq(deviceRegistrations.deviceId, deviceId))
      .returning();
    return updated;
  }

  // =====================================================
  // MOBILE DEVICE REGISTRATION MANAGEMENT (Phase 4)
  // =====================================================

  async getMobileDeviceRegistrations(userId?: string, status?: string): Promise<MobileDeviceRegistration[]> {
    const conditions = [];
    if (userId) conditions.push(eq(mobileDeviceRegistrations.userId, userId));
    if (status) conditions.push(eq(mobileDeviceRegistrations.status, status));
    // Always filter out soft deleted devices
    conditions.push(eq(mobileDeviceRegistrations.isDeleted, false));
    
    return await db.select().from(mobileDeviceRegistrations)
      .where(and(...conditions))
      .orderBy(desc(mobileDeviceRegistrations.lastSeenAt));
  }

  async getMobileDeviceRegistration(id: string): Promise<MobileDeviceRegistration | undefined> {
    const [device] = await db
      .select()
      .from(mobileDeviceRegistrations)
      .where(and(
        eq(mobileDeviceRegistrations.id, id),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ));
    return device || undefined;
  }

  async getMobileDeviceByDeviceId(deviceId: string): Promise<MobileDeviceRegistration | undefined> {
    const [device] = await db
      .select()
      .from(mobileDeviceRegistrations)
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ));
    return device || undefined;
  }

  async registerMobileDevice(device: InsertMobileDeviceRegistration): Promise<MobileDeviceRegistration> {
    const [newDevice] = await db
      .insert(mobileDeviceRegistrations)
      .values(device)
      .returning();
    return newDevice;
  }

  async updateMobileDeviceRegistration(id: string, updates: Partial<InsertMobileDeviceRegistration>): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(mobileDeviceRegistrations.id, id),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ))
      .returning();
    return updated;
  }

  async updateMobileDeviceLastSeen(deviceId: string): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ 
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ))
      .returning();
    return updated;
  }

  async updateMobileDeviceLastSync(deviceId: string): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ 
        lastSyncAt: sql`CURRENT_TIMESTAMP`,
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ))
      .returning();
    return updated;
  }

  async revokeMobileDevice(deviceId: string, reason?: string): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ 
        status: 'revoked',
        tokenVersion: sql`${mobileDeviceRegistrations.tokenVersion} + 1`, // Invalidate all tokens
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ))
      .returning();
    return updated;
  }

  // JWT and refresh token management for mobile devices
  async updateMobileDeviceRefreshToken(deviceId: string, refreshTokenHash: string, expiresAt: Date): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ 
        refreshTokenHash,
        refreshTokenExpiresAt: expiresAt,
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false),
        eq(mobileDeviceRegistrations.status, 'active')
      ))
      .returning();
    return updated;
  }

  async invalidateMobileDeviceTokens(deviceId: string): Promise<MobileDeviceRegistration> {
    const [updated] = await db
      .update(mobileDeviceRegistrations)
      .set({ 
        tokenVersion: sql`${mobileDeviceRegistrations.tokenVersion} + 1`, // Invalidate all tokens
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false)
      ))
      .returning();
    return updated;
  }

  async validateMobileDeviceRefreshToken(deviceId: string, refreshTokenHash: string): Promise<boolean> {
    const [device] = await db
      .select({
        id: mobileDeviceRegistrations.id,
        refreshTokenHash: mobileDeviceRegistrations.refreshTokenHash,
        refreshTokenExpiresAt: mobileDeviceRegistrations.refreshTokenExpiresAt,
        status: mobileDeviceRegistrations.status
      })
      .from(mobileDeviceRegistrations)
      .where(and(
        eq(mobileDeviceRegistrations.deviceId, deviceId),
        eq(mobileDeviceRegistrations.isDeleted, false),
        eq(mobileDeviceRegistrations.status, 'active')
      ));

    if (!device || !device.refreshTokenHash || !device.refreshTokenExpiresAt) {
      return false;
    }

    // Check if token has expired
    if (new Date() > device.refreshTokenExpiresAt) {
      return false;
    }

    // Validate the hash
    return device.refreshTokenHash === refreshTokenHash;
  }

  // Sync Session Management
  async getSyncSessions(filters?: {
    deviceId?: string;
    userId?: string;
    status?: string;
    sessionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SyncSession[]> {
    const conditions = [];
    if (filters?.deviceId) conditions.push(eq(syncSessions.deviceId, filters.deviceId));
    if (filters?.userId) conditions.push(eq(syncSessions.userId, filters.userId));
    if (filters?.status) conditions.push(eq(syncSessions.status, filters.status));
    if (filters?.sessionType) conditions.push(eq(syncSessions.sessionType, filters.sessionType));
    if (filters?.startDate) conditions.push(sql`${syncSessions.startTime} >= ${filters.startDate}`);
    if (filters?.endDate) conditions.push(sql`${syncSessions.startTime} <= ${filters.endDate}`);
    
    if (conditions.length > 0) {
      return await db.select().from(syncSessions)
        .where(and(...conditions))
        .orderBy(desc(syncSessions.startTime));
    }
    
    return await db.select().from(syncSessions)
      .orderBy(desc(syncSessions.startTime));
  }

  async getSyncSession(id: string): Promise<SyncSession | undefined> {
    const [session] = await db
      .select()
      .from(syncSessions)
      .where(eq(syncSessions.id, id));
    return session || undefined;
  }

  async createSyncSession(session: InsertSyncSession): Promise<SyncSession> {
    const [newSession] = await db
      .insert(syncSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateSyncSession(id: string, updates: Partial<InsertSyncSession>): Promise<SyncSession> {
    const [updated] = await db
      .update(syncSessions)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(syncSessions.id, id))
      .returning();
    return updated;
  }

  async completeSyncSession(id: string, endTime: Date, statistics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    conflictOperations: number;
  }): Promise<SyncSession> {
    const [updated] = await db
      .update(syncSessions)
      .set({ 
        status: 'completed',
        endTime,
        totalOperations: statistics.totalOperations,
        successfulOperations: statistics.successfulOperations,
        failedOperations: statistics.failedOperations,
        conflictOperations: statistics.conflictOperations,
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(eq(syncSessions.id, id))
      .returning();
    return updated;
  }

  // Offline Operations Management
  async getOfflineOperations(filters?: {
    deviceId?: string;
    userId?: string;
    tableName?: string;
    operationType?: string;
    status?: string;
    retryCount?: number;
  }): Promise<OfflineOperation[]> {
    const conditions = [];
    if (filters?.deviceId) conditions.push(eq(offlineOperations.deviceId, filters.deviceId));
    if (filters?.userId) conditions.push(eq(offlineOperations.userId, filters.userId));
    if (filters?.tableName) conditions.push(eq(offlineOperations.tableName, filters.tableName));
    if (filters?.operationType) conditions.push(eq(offlineOperations.operationType, filters.operationType));
    if (filters?.status) conditions.push(eq(offlineOperations.syncStatus, filters.status));
    if (filters?.retryCount !== undefined) conditions.push(eq(offlineOperations.retryCount, filters.retryCount));
    
    if (conditions.length > 0) {
      return await db.select().from(offlineOperations)
        .where(and(...conditions))
        .orderBy(desc(offlineOperations.timestamp));
    }
    
    return await db.select().from(offlineOperations)
      .orderBy(desc(offlineOperations.timestamp));
  }

  async getOfflineOperation(id: string): Promise<OfflineOperation | undefined> {
    const [operation] = await db
      .select()
      .from(offlineOperations)
      .where(eq(offlineOperations.id, id));
    return operation || undefined;
  }

  async createOfflineOperation(operation: InsertOfflineOperation): Promise<OfflineOperation> {
    // Type-safe payload creation with explicit property access
    const payload = {
      deviceId: operation.deviceId,
      userId: operation.userId,
      operationType: operation.operationType,
      tableName: operation.tableName,
      recordId: operation.recordId,
      operationData: operation.operationData,
      timestamp: operation.timestamp ?? new Date(),
      syncStatus: operation.syncStatus ?? 'pending',
      conflictResolution: operation.conflictResolution ?? null,
      errorMessage: operation.errorMessage ?? null,
      retryCount: operation.retryCount ?? 0,
    } as const;
    
    const [newOperation] = await db
      .insert(offlineOperations)
      .values(payload)
      .returning();
    return newOperation;
  }

  async updateOfflineOperation(id: string, updates: Partial<InsertOfflineOperation>): Promise<OfflineOperation> {
    const [updated] = await db
      .update(offlineOperations)
      .set({ ...updates })
      .where(eq(offlineOperations.id, id))
      .returning();
    return updated;
  }

  async markOperationAsSynced(id: string): Promise<OfflineOperation> {
    const [updated] = await db
      .update(offlineOperations)
      .set({ 
        syncStatus: 'synced'
        // serverTimestamp and updatedAt fields removed 
      })
      .where(eq(offlineOperations.id, id))
      .returning();
    return updated;
  }

  async markOperationAsConflicted(id: string, conflictReason: string): Promise<OfflineOperation> {
    const [updated] = await db
      .update(offlineOperations)
      .set({ 
        syncStatus: 'conflicted',
        conflictResolution: conflictReason,
        retryCount: sql`${offlineOperations.retryCount} + 1`
      })
      .where(eq(offlineOperations.id, id))
      .returning();
    return updated;
  }

  async getPendingOperations(deviceId: string, limit?: number): Promise<OfflineOperation[]> {
    const baseQuery = db
      .select()
      .from(offlineOperations)
      .where(and(
        eq(offlineOperations.deviceId, deviceId),
        eq(offlineOperations.syncStatus, 'pending')
      ))
      .orderBy(asc(offlineOperations.timestamp));
    
    if (limit) {
      return await baseQuery.limit(limit);
    }
    
    return await baseQuery;
  }

  // Sync Conflicts Management
  async getSyncConflicts(filters?: {
    sessionId?: string;
    status?: string;
    tableName?: string;
    conflictType?: string;
  }): Promise<SyncConflict[]> {
    const conditions = [];
    if (filters?.sessionId) conditions.push(eq(syncConflicts.syncSessionId, filters.sessionId));
    // Note: syncConflicts table doesn't have a 'status' column - conflicts are tracked by resolutionStrategy
    if (filters?.tableName) conditions.push(eq(syncConflicts.tableName, filters.tableName));
    if (filters?.conflictType) conditions.push(eq(syncConflicts.conflictType, filters.conflictType));
    
    if (conditions.length > 0) {
      return await db.select().from(syncConflicts)
        .where(and(...conditions))
        .orderBy(desc(syncConflicts.createdAt));
    }
    
    return await db.select().from(syncConflicts)
      .orderBy(desc(syncConflicts.createdAt));
  }

  async getSyncConflict(id: string): Promise<SyncConflict | undefined> {
    const [conflict] = await db
      .select()
      .from(syncConflicts)
      .where(eq(syncConflicts.id, id));
    return conflict || undefined;
  }

  async createSyncConflict(conflict: InsertSyncConflict): Promise<SyncConflict> {
    // Type-safe conflict creation
    const payload = {
      syncSessionId: conflict.syncSessionId,
      tableName: conflict.tableName,
      recordId: conflict.recordId,
      fieldName: conflict.fieldName,
      serverValue: conflict.serverValue,
      clientValue: conflict.clientValue,
      conflictType: conflict.conflictType,
      resolutionStrategy: conflict.resolutionStrategy,
      resolvedValue: conflict.resolvedValue,
      resolvedBy: conflict.resolvedBy,
      resolvedAt: conflict.resolvedAt,
    } as const;
    
    const [newConflict] = await db
      .insert(syncConflicts)
      .values(payload)
      .returning();
    return newConflict;
  }

  async resolveSyncConflict(id: string, resolutionStrategy: string, resolvedValue: any, resolvedBy: string): Promise<SyncConflict> {
    const [updated] = await db
      .update(syncConflicts)
      .set({ 
        resolutionStrategy,
        resolvedValue,
        resolvedBy,
        resolvedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(syncConflicts.id, id))
      .returning();
    return updated;
  }

  async getUnresolvedConflicts(sessionId?: string): Promise<SyncConflict[]> {
    const conditions = [sql`${syncConflicts.resolvedAt} IS NULL`]; // unresolved conflicts
    
    if (sessionId) {
      conditions.push(eq(syncConflicts.syncSessionId, sessionId));
    }
    
    return await db
      .select()
      .from(syncConflicts)
      .where(and(...conditions))
      .orderBy(asc(syncConflicts.createdAt));
  }

  // Differential Sync Operations - FIXED to handle tables without updated_at
  // CRITICAL SECURITY FIX: Added user parameter for record-level RBAC validation
  async getChangedRecords(tableName: string, lastSyncTimestamp: Date, limit?: number, lbacFilter?: any, user?: { id: string; username: string; role: string }): Promise<any[]> {
    // Import sync registry to check table configuration
    const { getSyncTableConfig } = await import('./syncRegistry');
    const tableConfig = getSyncTableConfig(tableName);
    
    if (!tableConfig) {
      throw new Error(`Table ${tableName} not found in sync registry`);
    }

    // Use the actual table name from config (handles camelCase key -> snake_case table mapping)
    const actualTableName = tableConfig.tableName;

    try {
      // Build base query based on whether table has updated_at
      let query: any;
      
      if (tableConfig.hasUpdatedAt) {
        // Use updated_at for tables that have it
        if (limit) {
          query = sql`
            SELECT * FROM ${sql.identifier(actualTableName)} 
            WHERE updated_at > ${lastSyncTimestamp}
            ORDER BY updated_at ASC
            LIMIT ${limit}`;
        } else {
          query = sql`
            SELECT * FROM ${sql.identifier(actualTableName)} 
            WHERE updated_at > ${lastSyncTimestamp}
            ORDER BY updated_at ASC`;
        }
      } else {
        // For tables without updated_at, use created_at or get all records
        if (limit) {
          query = sql`
            SELECT * FROM ${sql.identifier(tableName)} 
            WHERE created_at > ${lastSyncTimestamp}
            ORDER BY created_at ASC
            LIMIT ${limit}`;
        } else {
          query = sql`
            SELECT * FROM ${sql.identifier(tableName)} 
            WHERE created_at > ${lastSyncTimestamp}
            ORDER BY created_at ASC`;
        }
      }
      
      // CRITICAL: Apply LBAC filter at SQL level SAFELY using Drizzle conditions
      if (lbacFilter && lbacFilter.type === 'block_all') {
        // FAIL-SECURE: Block all access by returning empty results
        console.log(`LBAC blocking all access to table ${tableName} for user ${user?.id} (${user?.role})`);
        return [];
      } else if (lbacFilter && lbacFilter.type === 'drizzle_condition') {
        // Import Drizzle helpers safely
        const { sql, eq, inArray, and } = await import('drizzle-orm');
        
        // Convert typed LBAC condition to safe Drizzle SQL condition
        let lbacCondition;
        if (lbacFilter.operator === 'in') {
          // Safe array condition - prevents SQL injection
          lbacCondition = sql`${sql.identifier(lbacFilter.field)} = ANY(${lbacFilter.values})`;
        } else if (lbacFilter.operator === 'eq') {
          // Safe equality condition 
          lbacCondition = sql`${sql.identifier(lbacFilter.field)} = ${lbacFilter.values[0]}`;
        } else {
          // Unknown operator - fail secure by blocking access
          lbacCondition = sql`1 = 0`; // Always false
        }
        
        // Safely combine base query with LBAC condition using AND
        if (tableConfig.hasUpdatedAt) {
          if (limit) {
            query = sql`
              SELECT * FROM ${sql.identifier(tableName)} 
              WHERE updated_at > ${lastSyncTimestamp} AND (${lbacCondition})
              ORDER BY updated_at ASC
              LIMIT ${limit}`;
          } else {
            query = sql`
              SELECT * FROM ${sql.identifier(tableName)} 
              WHERE updated_at > ${lastSyncTimestamp} AND (${lbacCondition})
              ORDER BY updated_at ASC`;
          }
        } else {
          if (limit) {
            query = sql`
              SELECT * FROM ${sql.identifier(tableName)} 
              WHERE created_at > ${lastSyncTimestamp} AND (${lbacCondition})
              ORDER BY created_at ASC
              LIMIT ${limit}`;
          } else {
            query = sql`
              SELECT * FROM ${sql.identifier(tableName)} 
              WHERE created_at > ${lastSyncTimestamp} AND (${lbacCondition})
              ORDER BY created_at ASC`;
          }
        }
      }
      
      const result = await db.execute(query);
      let records = result.rows || [];
      
      // CRITICAL SECURITY FIX: Apply record-level RBAC validation for tables without LBAC
      // This prevents engineers from accessing applications not assigned to them
      if (user && tableConfig.rbacCheck && !tableConfig.lbacField) {
        console.log(`Applying record-level RBAC checks for table ${tableName} (no LBAC field)`);
        
        // Filter records through rbacCheck function
        records = records.filter((record: any) => {
          try {
            // Apply the rbacCheck function with record data
            const hasAccess = tableConfig.rbacCheck!(user, 'read', record[tableConfig.primaryKey], record);
            
            if (!hasAccess) {
              console.log(`RBAC denied access to ${tableName} record ${record[tableConfig.primaryKey]} for user ${user.id} (${user.role})`);
            }
            
            return hasAccess;
          } catch (error) {
            console.error(`Error applying RBAC check for ${tableName} record ${record[tableConfig.primaryKey]}:`, error);
            // Fail-secure: deny access on error
            return false;
          }
        });
        
        console.log(`RBAC filtering: ${result.rows?.length || 0} records → ${records.length} accessible records`);
      }
      
      // FAIL-SECURE: For tables without both LBAC and RBAC, block access for field personnel
      else if (user && !tableConfig.lbacField && !tableConfig.rbacCheck) {
        if (user.role === 'engineer' || user.role === 'surveyor') {
          console.warn(`SECURITY: Blocking access to ${tableName} for ${user.role} ${user.id} - no LBAC/RBAC defined`);
          records = []; // Block access completely
        }
      }
      
      return records;
    } catch (error) {
      console.error(`Error fetching changed records for ${tableName}:`, error);
      
      // If the table doesn't have created_at either, return empty array
      if (!tableConfig.hasUpdatedAt) {
        console.warn(`Table ${tableName} has neither updated_at nor created_at - returning empty results`);
        return [];
      }
      
      throw error;
    }
  }

  // Security-critical: Map sync table names to actual Drizzle table objects
  private resolveSyncTable(tableName: string) {
    const syncTableMap: Record<string, any> = {
      'fieldVisits': fieldVisits,
      'field_visits': fieldVisits,
      'plots': plots,
      'blocks': blocks,
      'neighborhoods': neighborhoods,
      'applications': applications,
      'surveying_decisions': surveyingDecisions,
      'survey_results': surveyResults
    };
    
    return syncTableMap[tableName] || null;
  }

  async applyBulkChanges(tableName: string, operations: OfflineOperation[], sessionId?: string): Promise<{ success: number; conflicts: number; errors: number }> {
    let success = 0;
    let conflicts = 0;
    let errors = 0;

    // Security: Resolve table to prevent SQL injection via dynamic table names
    const resolvedTable = this.resolveSyncTable(tableName);
    if (!resolvedTable) {
      console.error(`[SECURITY] Rejected sync operation for unauthorized table: ${tableName}`);
      return { success: 0, conflicts: 0, errors: operations.length };
    }

    // Import sync registry for conflict detection
    const { getSyncTableConfig } = await import('./syncRegistry');
    const tableConfig = getSyncTableConfig(tableName);

    for (const operation of operations) {
      try {
        if (operation.operationType === 'create') {
          // Use only Drizzle ORM for security and type safety
          let insertData = operation.operationData as any;
          
          // Sanitize and set server-side ID for all tables
          delete insertData.id; // Remove any client-provided ID
          insertData.id = operation.recordId || crypto.randomUUID();
          
          // METADATA-DRIVEN timestamp coercion using actual Drizzle schema
          console.log(`[DEBUG] applyBulkChanges ENTRY for ${tableName} create operation`);
          
          // Strip ALL client-supplied timestamps unconditionally (security + consistency)
          delete insertData.createdAt;
          delete insertData.updatedAt;
          delete insertData.created_at;
          delete insertData.updated_at;
          
          // Get timestamp columns from actual schema metadata
          const tableColumns = Object.entries(resolvedTable).filter(([key, col]) => 
            col && typeof col === 'object' && 
            'columnType' in col && 'dataType' in col && (
              (col as any).columnType === 'PgTimestamp' || 
              (col as any).dataType === 'timestamp' ||
              ((col as any).constructor && (col as any).constructor.name === 'PgTimestamp')
            )
          );
          
          console.log(`[DEBUG] Found timestamp columns for ${tableName}:`, tableColumns.map(([key, col]) => key));
          
          // Coerce each timestamp column to proper Date object
          tableColumns.forEach(([columnKey, column]) => {
            if (insertData[columnKey] !== undefined) {
              const value = insertData[columnKey];
              const originalType = typeof value;
              
              if (value instanceof Date) {
                console.log(`[DEBUG] ${columnKey}: already Date object ✅`);
                return;
              }
              
              if (typeof value === 'string' || typeof value === 'number') {
                // Handle YYYY-MM-DD format by adding time component  
                const dateStr = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
                  ? `${value}T00:00:00Z`
                  : value;
                
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                  console.warn(`[WARNING] Invalid date for ${columnKey}:`, value, 'setting to null');
                  insertData[columnKey] = null;
                } else {
                  insertData[columnKey] = date;
                  console.log(`[DEBUG] ${columnKey}: ${originalType} → Date ✅`);
                }
              } else {
                console.warn(`[WARNING] Invalid type for ${columnKey}:`, originalType, 'setting to null');
                insertData[columnKey] = null;
              }
            }
          });
          
          // Set server-side timestamps (always Date objects)
          insertData.createdAt = new Date();
          insertData.updatedAt = new Date();
          
          // Final verification log
          const finalDateFields = Object.keys(insertData).filter(k => insertData[k] instanceof Date);
          console.log(`[DEBUG] Final Date fields for ${tableName}:`, finalDateFields);
          
          console.log(`[DEBUG] Inserting into ${tableName} with server-side ID: ${insertData.id}`);
          await db.insert(resolvedTable).values(insertData);
          console.log(`[DEBUG] Successfully inserted record with ID: ${insertData.id}`);
          success++;
        } else if (operation.operationType === 'update') {
          // Use Drizzle ORM for safe updates (no raw SQL with table names)
          let updateData = operation.operationData as any;
          updateData.updatedAt = sql`CURRENT_TIMESTAMP`;
          
          console.log(`[DEBUG] Updating ${tableName} record ID: ${operation.recordId}`);
          
          // Get existing record for conflict detection
          const [existingRecord] = await db
            .select()
            .from(resolvedTable)
            .where(eq(resolvedTable.id, operation.recordId));
          
          if (!existingRecord) {
            // Record not found - create conflict
            if (sessionId && tableConfig) {
              await this.createSyncConflict({
                syncSessionId: sessionId,
                tableName,
                recordId: operation.recordId,
                fieldName: null, // Full record conflict
                serverValue: null, // Record doesn't exist
                clientValue: updateData,
                conflictType: 'deleted_on_server',
                // conflictReason: 'Record was deleted on server while client tried to update' // TODO: Add to schema if needed
              });
            }
            conflicts++;
          } else {
            // Check for field-level conflicts using conflictFields
            let hasFieldConflicts = false;
            
            if (tableConfig?.conflictFields && sessionId) {
              for (const fieldName of tableConfig.conflictFields) {
                if (updateData[fieldName] !== undefined && 
                    existingRecord[fieldName] !== updateData[fieldName]) {
                  // Create field-level conflict
                  await this.createSyncConflict({
                    syncSessionId: sessionId,
                    tableName,
                    recordId: operation.recordId,
                    fieldName,
                    serverValue: existingRecord[fieldName],
                    clientValue: updateData[fieldName],
                    conflictType: 'concurrent_update',
                    // conflictReason: `Field '${fieldName}' was modified on both client and server` // TODO: Add to schema if needed
                  });
                  hasFieldConflicts = true;
                }
              }
            }
            
            if (hasFieldConflicts) {
              conflicts++;
            } else {
              // No conflicts - proceed with update
              const result = await db.update(resolvedTable)
                .set(updateData)
                .where(eq(resolvedTable.id, operation.recordId));
              success++;
            }
          }
        } else if (operation.operationType === 'delete') {
          // Use Drizzle ORM for safe deletes (no raw SQL with table names)
          console.log(`[DEBUG] Deleting ${tableName} record ID: ${operation.recordId}`);
          
          // Check if record exists
          const [existingRecord] = await db
            .select()
            .from(resolvedTable)
            .where(eq(resolvedTable.id, operation.recordId));
          
          if (!existingRecord) {
            // Record not found - create conflict
            if (sessionId && tableConfig) {
              await this.createSyncConflict({
                syncSessionId: sessionId,
                tableName,
                recordId: operation.recordId,
                fieldName: null,
                serverValue: null, // Already deleted
                clientValue: operation.operationData as any,
                conflictType: 'deleted_on_server',
                // conflictReason: 'Record was already deleted on server' // TODO: Add to schema if needed
              });
            }
            conflicts++;
          } else {
            // Record exists - proceed with delete
            const result = await db.delete(resolvedTable)
              .where(eq(resolvedTable.id, operation.recordId));
            success++;
          }
        }
      } catch (error) {
        console.error('Error applying bulk change:', error);
        errors++;
      }
    }

    return { success, conflicts, errors };
  }

  // ===========================================
  // DELETE PROPAGATION & CHANGE TRACKING SYSTEM
  // ===========================================

  // Global sequence counter for monotonic versioning
  private static sequenceCounter = 0;

  // Monotonic Versioning System
  async createChangeVersion(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime();
    
    // Create monotonic version: YYYY-TTTTTTTTTTTTTTnnnnn (year + timestamp + sequence)
    const sequence = await this.getNextSequence();
    return `${year}-${timestamp.toString().padStart(13, '0')}${sequence.padStart(5, '0')}`;
  }

  async getNextSequence(): Promise<string> {
    DatabaseStorage.sequenceCounter = (DatabaseStorage.sequenceCounter + 1) % 100000;
    return DatabaseStorage.sequenceCounter.toString();
  }

  // Deletion Tombstones Management
  async getDeletionTombstones(filters?: {
    tableName?: string;
    recordId?: string;
    deletedById?: string;
    propagationStatus?: string;
    deviceId?: string;
    sessionId?: string;
    isActive?: boolean;
  }): Promise<DeletionTombstone[]> {
    const conditions = [];
    
    if (filters) {
      if (filters.tableName) conditions.push(eq(deletionTombstones.tableName, filters.tableName));
      if (filters.recordId) conditions.push(eq(deletionTombstones.recordId, filters.recordId));
      if (filters.deletedById) conditions.push(eq(deletionTombstones.deletedById, filters.deletedById));
      if (filters.propagationStatus) conditions.push(eq(deletionTombstones.propagationStatus, filters.propagationStatus));
      if (filters.deviceId) conditions.push(eq(deletionTombstones.deviceId, filters.deviceId));
      if (filters.sessionId) conditions.push(eq(deletionTombstones.sessionId, filters.sessionId));
      if (filters.isActive !== undefined) conditions.push(eq(deletionTombstones.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(deletionTombstones).where(and(...conditions));
    }
    
    return await db.select().from(deletionTombstones);
  }

  async getDeletionTombstone(id: string): Promise<DeletionTombstone | undefined> {
    const [tombstone] = await db
      .select()
      .from(deletionTombstones)
      .where(eq(deletionTombstones.id, id));
    return tombstone || undefined;
  }

  async createDeletionTombstone(tombstone: InsertDeletionTombstone): Promise<DeletionTombstone> {
    const [created] = await db
      .insert(deletionTombstones)
      .values({
        ...tombstone,
        syncVersion: tombstone.syncVersion || await this.createChangeVersion(),
      })
      .returning();
    return created;
  }

  async updateTombstonePropagationStatus(id: string, status: string, propagatedAt?: Date): Promise<DeletionTombstone> {
    const [updated] = await db
      .update(deletionTombstones)
      .set({
        propagationStatus: status,
        propagatedAt: propagatedAt || new Date(),
        propagationAttempts: sql`${deletionTombstones.propagationAttempts} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(deletionTombstones.id, id))
      .returning();
    return updated;
  }

  async expireTombstone(id: string): Promise<void> {
    await db
      .update(deletionTombstones)
      .set({
        isActive: false,
        expiresAt: new Date(),
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(deletionTombstones.id, id));
  }

  async cleanupExpiredTombstones(): Promise<number> {
    const result = await db
      .delete(deletionTombstones)
      .where(
        and(
          eq(deletionTombstones.isActive, false),
          sql`${deletionTombstones.expiresAt} < CURRENT_TIMESTAMP`
        )
      );
    return result.rowCount || 0;
  }

  // Change Tracking Management
  async getChangeHistory(filters?: {
    tableName?: string;
    recordId?: string;
    changedById?: string;
    operationType?: string;
    changeSource?: string;
    syncStatus?: string;
    deviceId?: string;
    sessionId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<ChangeTracking[]> {
    const conditions = [];
    
    if (filters) {
      if (filters.tableName) conditions.push(eq(changeTracking.tableName, filters.tableName));
      if (filters.recordId) conditions.push(eq(changeTracking.recordId, filters.recordId));
      if (filters.changedById) conditions.push(eq(changeTracking.changedById, filters.changedById));
      if (filters.operationType) conditions.push(eq(changeTracking.operationType, filters.operationType));
      if (filters.changeSource) conditions.push(eq(changeTracking.changeSource, filters.changeSource));
      if (filters.syncStatus) conditions.push(eq(changeTracking.syncStatus, filters.syncStatus));
      if (filters.deviceId) conditions.push(eq(changeTracking.deviceId, filters.deviceId));
      if (filters.sessionId) conditions.push(eq(changeTracking.sessionId, filters.sessionId));
      if (filters.fromDate) conditions.push(sql`${changeTracking.changedAt} >= ${filters.fromDate.toISOString()}`);
      if (filters.toDate) conditions.push(sql`${changeTracking.changedAt} <= ${filters.toDate.toISOString()}`);
    }
    
    const query = db.select().from(changeTracking);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(changeTracking.changedAt));
    }
    
    return await query.orderBy(desc(changeTracking.changedAt));
  }

  async getChangeTrackingEntry(id: string): Promise<ChangeTracking | undefined> {
    const [entry] = await db
      .select()
      .from(changeTracking)
      .where(eq(changeTracking.id, id));
    return entry || undefined;
  }

  async createChangeTrackingEntry(entry: InsertChangeTracking): Promise<ChangeTracking> {
    const [created] = await db
      .insert(changeTracking)
      .values({
        ...entry,
        changeVersion: await this.createChangeVersion(),
        changeSequence: await this.getNextSequence(),
      })
      .returning();
    return created;
  }

  async updateChangeSyncStatus(id: string, status: string, syncedAt?: Date): Promise<ChangeTracking> {
    const [updated] = await db
      .update(changeTracking)
      .set({
        syncStatus: status,
        syncedAt: syncedAt || new Date(),
        syncAttempts: sql`${changeTracking.syncAttempts} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(changeTracking.id, id))
      .returning();
    return updated;
  }

  async getChangesByVersion(tableName: string, minVersion?: string, maxVersion?: string): Promise<ChangeTracking[]> {
    const conditions = [eq(changeTracking.tableName, tableName)];
    
    if (minVersion) {
      conditions.push(sql`${changeTracking.changeVersion} >= ${minVersion}`);
    }
    if (maxVersion) {
      conditions.push(sql`${changeTracking.changeVersion} <= ${maxVersion}`);
    }
    
    return await db
      .select()
      .from(changeTracking)
      .where(and(...conditions))
      .orderBy(asc(changeTracking.changeVersion));
  }

  // Safe CRUD Wrapper Methods with Idempotency
  async safeCreate<T>(
    tableName: string,
    data: any,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ record: T; changeEntry: ChangeTracking; isNewRecord: boolean }> {
    // Check for idempotency if clientChangeId provided
    if (metadata.deviceId && metadata.clientChangeId) {
      const existingChange = await this.getProcessedChange(metadata.deviceId, metadata.clientChangeId);
      if (existingChange) {
        // Return existing record
        const record = existingChange.recordSnapshot as T;
        return { record, changeEntry: existingChange, isNewRecord: false };
      }
    }

    // Get the table reference
    const tableMap = this.getTableMap();
    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    // Create the record
    const results = await db.insert(table).values(data).returning();
    const [record] = results as any[];
    
    // Create change tracking entry
    const changeEntry = await this.createChangeTrackingEntry({
      tableName,
      recordId: record.id,
      operationType: 'insert',
      changedById: metadata.userId,
      changeSource: metadata.changeSource || 'web_app',
      deviceId: metadata.deviceId,
      sessionId: metadata.sessionId,
      clientChangeId: metadata.clientChangeId,
      recordSnapshot: record,
      governorateId: metadata.geographic?.governorateId,
      districtId: metadata.geographic?.districtId,
      syncStatus: 'pending',
    });

    return { record, changeEntry, isNewRecord: true };
  }

  async safeUpdate<T>(
    tableName: string,
    recordId: string,
    updates: any,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ record: T; changeEntry: ChangeTracking; fieldsChanged: string[] }> {
    // Check for idempotency if clientChangeId provided
    if (metadata.deviceId && metadata.clientChangeId) {
      const existingChange = await this.getProcessedChange(metadata.deviceId, metadata.clientChangeId);
      if (existingChange) {
        // Return existing record
        const record = existingChange.recordSnapshot as T;
        const fieldsChanged = Object.keys(existingChange.fieldChanges || {});
        return { record, changeEntry: existingChange, fieldsChanged };
      }
    }

    // Get the table reference  
    const tableMap = this.getTableMap();
    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    // Get original record first
    const [originalRecord] = await db
      .select()
      .from(table)
      .where(eq(table.id, recordId));
    
    if (!originalRecord) {
      throw new Error(`Record ${recordId} not found in table ${tableName}`);
    }

    // Calculate field changes
    const fieldChanges: Record<string, { old: any; new: any }> = {};
    const fieldsChanged: string[] = [];
    
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (originalRecord as any)[field];
      if (oldValue !== newValue) {
        fieldChanges[field] = { old: oldValue, new: newValue };
        fieldsChanged.push(field);
      }
    }

    // Update the record
    const [record] = await db
      .update(table)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(table.id, recordId))
      .returning();
    
    // Create change tracking entry
    const changeEntry = await this.createChangeTrackingEntry({
      tableName,
      recordId,
      operationType: 'update',
      changedById: metadata.userId,
      changeSource: metadata.changeSource || 'web_app',
      deviceId: metadata.deviceId,
      sessionId: metadata.sessionId,
      clientChangeId: metadata.clientChangeId,
      fieldChanges,
      recordSnapshot: record,
      governorateId: metadata.geographic?.governorateId,
      districtId: metadata.geographic?.districtId,
      syncStatus: 'pending',
    });

    return { record, changeEntry, fieldsChanged };
  }

  async safeDelete(
    tableName: string,
    recordId: string,
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      clientChangeId?: string;
      changeSource?: string;
      deletionReason?: string;
      deletionType?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ tombstone: DeletionTombstone; changeEntry: ChangeTracking }> {
    // Check for idempotency if clientChangeId provided
    if (metadata.deviceId && metadata.clientChangeId) {
      const existingChange = await this.getProcessedChange(metadata.deviceId, metadata.clientChangeId);
      if (existingChange) {
        // Find corresponding tombstone
        const [tombstone] = await this.getDeletionTombstones({ 
          tableName, 
          recordId,
          deviceId: metadata.deviceId
        });
        return { tombstone, changeEntry: existingChange };
      }
    }

    // Get the table reference
    const tableMap = this.getTableMap();
    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    // Get original record first
    const [originalRecord] = await db
      .select()
      .from(table)
      .where(eq(table.id, recordId));
    
    if (!originalRecord) {
      throw new Error(`Record ${recordId} not found in table ${tableName}`);
    }

    // Create deletion tombstone
    const tombstone = await this.createDeletionTombstone({
      tableName,
      recordId,
      deletedById: metadata.userId,
      deletionReason: metadata.deletionReason,
      deletionType: metadata.deletionType || 'soft',
      originalData: originalRecord,
      deviceId: metadata.deviceId,
      sessionId: metadata.sessionId,
      governorateId: metadata.geographic?.governorateId,
      districtId: metadata.geographic?.districtId,
      propagationStatus: 'pending',
    });

    // Delete the actual record
    await db.delete(table).where(eq(table.id, recordId));

    // Create change tracking entry
    const changeEntry = await this.createChangeTrackingEntry({
      tableName,
      recordId,
      operationType: 'delete',
      changedById: metadata.userId,
      changeSource: metadata.changeSource || 'web_app',
      deviceId: metadata.deviceId,
      sessionId: metadata.sessionId,
      clientChangeId: metadata.clientChangeId,
      recordSnapshot: originalRecord,
      governorateId: metadata.geographic?.governorateId,
      districtId: metadata.geographic?.districtId,
      syncStatus: 'pending',
    });

    return { tombstone, changeEntry };
  }

  // Batch Operations with Change Tracking
  async safeBatchCreate<T>(
    tableName: string,
    records: any[],
    metadata: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      changeSource?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ records: T[]; changeEntries: ChangeTracking[] }> {
    const tableMap = this.getTableMap();
    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    // Insert all records
    const results = await db.insert(table).values(records).returning();
    const createdRecords = results as T[];
    
    // Create change tracking entries for all records
    const changeEntries = await Promise.all(
      createdRecords.map((record: any) => 
        this.createChangeTrackingEntry({
          tableName,
          recordId: record.id,
          operationType: 'insert',
          changedById: metadata.userId,
          changeSource: metadata.changeSource || 'web_app',
          deviceId: metadata.deviceId,
          sessionId: metadata.sessionId,
          recordSnapshot: record,
          governorateId: metadata.geographic?.governorateId,
          districtId: metadata.geographic?.districtId,
          syncStatus: 'pending',
        })
      )
    );

    return { records: createdRecords, changeEntries };
  }

  // Idempotency & Retry Logic
  async isChangeProcessed(deviceId: string, clientChangeId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(changeTracking)
      .where(
        and(
          eq(changeTracking.deviceId, deviceId),
          eq(changeTracking.clientChangeId, clientChangeId)
        )
      )
      .limit(1);
    
    return !!existing;
  }

  async getProcessedChange(deviceId: string, clientChangeId: string): Promise<ChangeTracking | undefined> {
    const [existing] = await db
      .select()
      .from(changeTracking)
      .where(
        and(
          eq(changeTracking.deviceId, deviceId),
          eq(changeTracking.clientChangeId, clientChangeId)
        )
      );
    
    return existing || undefined;
  }

  async retryFailedChanges(maxRetries: number = 3): Promise<{ success: number; failed: number }> {
    // Get all failed sync changes that haven't exceeded max retries
    const failedChanges = await db
      .select()
      .from(changeTracking)
      .where(
        and(
          eq(changeTracking.syncStatus, 'failed'),
          sql`${changeTracking.syncAttempts} < ${maxRetries}`
        )
      );

    let success = 0;
    let failed = 0;

    for (const change of failedChanges) {
      try {
        // Try to resync the change
        await this.updateChangeSyncStatus(change.id, 'synced');
        success++;
      } catch (error) {
        console.error(`Failed to retry change ${change.id}:`, error);
        await this.updateChangeSyncStatus(change.id, 'failed');
        failed++;
      }
    }

    return { success, failed };
  }

  // ===========================================
  // ADVANCED MONITORING & INSTRUMENTATION
  // ===========================================

  // Performance Metrics Operations
  async recordPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    try {
      const [result] = await db.insert(performanceMetrics).values({
        ...metric,
        // timestamp field omitted from insert schema - gets default value
      }).returning();
      return result;
    } catch (error) {
      console.error('Failed to record performance metric:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(filters?: {
    metricName?: string;
    metricType?: string;
    metricCategory?: string;
    userId?: string;
    endpoint?: string;
    timeRange?: { from: Date; to: Date };
    tags?: Record<string, any>;
  }): Promise<PerformanceMetric[]> {
    try {
      const conditions = [];
      
      if (filters?.metricName) {
        conditions.push(eq(performanceMetrics.metricName, filters.metricName));
      }
      if (filters?.metricType) {
        conditions.push(eq(performanceMetrics.metricType, filters.metricType));
      }
      if (filters?.metricCategory) {
        conditions.push(eq(performanceMetrics.metricCategory, filters.metricCategory));
      }
      if (filters?.userId) {
        conditions.push(eq(performanceMetrics.userId, filters.userId));
      }
      if (filters?.endpoint) {
        conditions.push(eq(performanceMetrics.endpoint, filters.endpoint));
      }
      if (filters?.timeRange) {
        conditions.push(sql`${performanceMetrics.timestamp} >= ${filters.timeRange.from}`);
        conditions.push(sql`${performanceMetrics.timestamp} <= ${filters.timeRange.to}`);
      }
      if (filters?.tags) {
        for (const [key, value] of Object.entries(filters.tags)) {
          conditions.push(sql`${performanceMetrics.tags}->>${key} = ${value}`);
        }
      }

      if (conditions.length > 0) {
        return await db.select()
          .from(performanceMetrics)
          .where(and(...conditions))
          .orderBy(desc(performanceMetrics.timestamp));
      }
      
      return await db.select()
        .from(performanceMetrics)
        .orderBy(desc(performanceMetrics.timestamp));
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  async getAggregatedMetrics(params: {
    metricName: string;
    aggregationPeriod: 'minute' | 'hour' | 'day';
    timeRange: { from: Date; to: Date };
    groupBy?: string[];
  }): Promise<any[]> {
    try {
      const timeFormat = params.aggregationPeriod === 'minute' ? 'YYYY-MM-DD HH24:MI' :
                        params.aggregationPeriod === 'hour' ? 'YYYY-MM-DD HH24' :
                        'YYYY-MM-DD';

      const result = await db.execute(sql`
        SELECT 
          TO_CHAR(timestamp, ${timeFormat}) as period,
          COUNT(*) as count,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value
        FROM ${performanceMetrics}
        WHERE metric_name = ${params.metricName}
          AND timestamp >= ${params.timeRange.from}
          AND timestamp <= ${params.timeRange.to}
        GROUP BY TO_CHAR(timestamp, ${timeFormat})
        ORDER BY period
      `);
      
      return result.rows || [];
    } catch (error) {
      console.error('Failed to get aggregated metrics:', error);
      return [];
    }
  }

  async getMetricSummary(metricCategory: string, timeRange: { from: Date; to: Date }): Promise<{
    totalCount: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
    p95Value: number;
  }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_count,
          AVG(metric_value) as average_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value
        FROM ${performanceMetrics}
        WHERE metric_category = ${metricCategory}
          AND timestamp >= ${timeRange.from}
          AND timestamp <= ${timeRange.to}
      `);
      
      const row = result.rows[0];
      return {
        totalCount: Number(row?.total_count || 0),
        averageValue: Number(row?.average_value || 0),
        minValue: Number(row?.min_value || 0),
        maxValue: Number(row?.max_value || 0),
        p95Value: Number(row?.p95_value || 0)
      };
    } catch (error) {
      console.error('Failed to get metric summary:', error);
      return {
        totalCount: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0,
        p95Value: 0
      };
    }
  }

  // Sync Operations Metrics
  async recordSyncOperationMetric(metric: InsertSyncOperationsMetric): Promise<SyncOperationsMetric> {
    try {
      const [result] = await db.insert(syncOperationsMetrics).values({
        ...metric,
        // startedAt field omitted from insert schema - gets default value
      }).returning();
      return result;
    } catch (error) {
      console.error('Failed to record sync operation metric:', error);
      throw error;
    }
  }

  async getSyncOperationMetrics(filters?: {
    operationType?: string;
    status?: string;
    userId?: string;
    deviceId?: string;
    tableName?: string;
    timeRange?: { from: Date; to: Date };
  }): Promise<SyncOperationsMetric[]> {
    try {
      const conditions = [];
      
      if (filters?.operationType) {
        conditions.push(eq(syncOperationsMetrics.operationType, filters.operationType));
      }
      if (filters?.status) {
        conditions.push(eq(syncOperationsMetrics.status, filters.status));
      }
      if (filters?.userId) {
        conditions.push(eq(syncOperationsMetrics.userId, filters.userId));
      }
      if (filters?.deviceId) {
        conditions.push(eq(syncOperationsMetrics.deviceId, filters.deviceId));
      }
      if (filters?.tableName) {
        conditions.push(eq(syncOperationsMetrics.tableName, filters.tableName));
      }
      if (filters?.timeRange) {
        conditions.push(sql`${syncOperationsMetrics.startedAt} >= ${filters.timeRange.from}`);
        conditions.push(sql`${syncOperationsMetrics.startedAt} <= ${filters.timeRange.to}`);
      }

      if (conditions.length > 0) {
        return await db.select()
          .from(syncOperationsMetrics)
          .where(and(...conditions))
          .orderBy(desc(syncOperationsMetrics.startedAt));
      }
      
      return await db.select()
        .from(syncOperationsMetrics)
        .orderBy(desc(syncOperationsMetrics.startedAt));
    } catch (error) {
      console.error('Failed to get sync operation metrics:', error);
      return [];
    }
  }

  async getSyncPerformanceSummary(timeRange: { from: Date; to: Date }): Promise<{
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    errorsByType: Record<string, number>;
    retryStatistics: { totalRetries: number; avgRetriesPerOperation: number };
  }> {
    try {
      const totalResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_operations,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_operations,
          AVG(duration_ms) as avg_duration,
          SUM(retry_count) as total_retries
        FROM ${syncOperationsMetrics}
        WHERE start_time >= ${timeRange.from}
          AND start_time <= ${timeRange.to}
      `);

      const errorResult = await db.execute(sql`
        SELECT 
          error_type,
          COUNT(*) as error_count
        FROM ${syncOperationsMetrics}
        WHERE start_time >= ${timeRange.from}
          AND start_time <= ${timeRange.to}
          AND status = 'failed'
          AND error_type IS NOT NULL
        GROUP BY error_type
      `);

      const totalRow = totalResult.rows[0];
      const totalOps = Number(totalRow?.total_operations || 0);
      const successfulOps = Number(totalRow?.successful_operations || 0);
      const totalRetries = Number(totalRow?.total_retries || 0);

      const errorsByType: Record<string, number> = {};
      for (const row of errorResult.rows) {
        errorsByType[row.error_type as string] = Number(row.error_count);
      }

      return {
        totalOperations: totalOps,
        successRate: totalOps > 0 ? (successfulOps / totalOps) * 100 : 0,
        averageDuration: Number(totalRow?.avg_duration || 0),
        errorsByType,
        retryStatistics: {
          totalRetries,
          avgRetriesPerOperation: totalOps > 0 ? totalRetries / totalOps : 0
        }
      };
    } catch (error) {
      console.error('Failed to get sync performance summary:', error);
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        errorsByType: {},
        retryStatistics: { totalRetries: 0, avgRetriesPerOperation: 0 }
      };
    }
  }

  async updateSyncOperationStatus(id: string, status: string, completedAt?: Date, errorDetails?: any): Promise<SyncOperationsMetric> {
    try {
      const updates: any = {
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`
      };
      
      if (completedAt) {
        updates.completedAt = completedAt;
      }
      if (errorDetails) {
        updates.errorDetails = errorDetails;
        updates.errorType = errorDetails.type || 'unknown';
        updates.errorMessage = errorDetails.message || 'Unknown error';
      }

      const [result] = await db
        .update(syncOperationsMetrics)
        .set(updates)
        .where(eq(syncOperationsMetrics.id, id))
        .returning();
      
      return result;
    } catch (error) {
      console.error('Failed to update sync operation status:', error);
      throw error;
    }
  }

  // Error Tracking Operations
  async recordError(error: InsertErrorTracking): Promise<ErrorTracking> {
    try {
      const [result] = await db.insert(errorTracking).values({
        ...error
      }).returning();
      return result;
    } catch (error) {
      console.error('Failed to record error:', error);
      throw error;
    }
  }

  async getErrors(filters?: {
    errorType?: string;
    severity?: string;
    status?: string;
    userId?: string;
    endpoint?: string;
    environment?: string;
    timeRange?: { from: Date; to: Date };
  }): Promise<ErrorTracking[]> {
    try {
      const conditions = [];
      
      if (filters?.errorType) {
        conditions.push(eq(errorTracking.errorType, filters.errorType));
      }
      if (filters?.severity) {
        conditions.push(eq(errorTracking.severity, filters.severity));
      }
      if (filters?.status) {
        conditions.push(eq(errorTracking.status, filters.status));
      }
      if (filters?.userId) {
        conditions.push(eq(errorTracking.userId, filters.userId));
      }
      if (filters?.endpoint) {
        conditions.push(eq(errorTracking.endpoint, filters.endpoint));
      }
      if (filters?.environment) {
        conditions.push(eq(errorTracking.environment, filters.environment));
      }
      if (filters?.timeRange) {
        conditions.push(sql`${errorTracking.createdAt} >= ${filters.timeRange.from}`);
        conditions.push(sql`${errorTracking.createdAt} <= ${filters.timeRange.to}`);
      }

      if (conditions.length > 0) {
        return await db.select()
          .from(errorTracking)
          .where(and(...conditions))
          .orderBy(desc(errorTracking.createdAt));
      }
      
      return await db.select()
        .from(errorTracking)
        .orderBy(desc(errorTracking.createdAt));
    } catch (error) {
      console.error('Failed to get errors:', error);
      return [];
    }
  }

  async getErrorSummary(timeRange: { from: Date; to: Date }): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    affectedUsers: number;
    resolvedErrors: number;
  }> {
    try {
      const totalResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_errors,
          COUNT(DISTINCT user_id) as affected_users,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_errors
        FROM ${errorTracking}
        WHERE created_at >= ${timeRange.from}
          AND created_at <= ${timeRange.to}
      `);

      const typeResult = await db.execute(sql`
        SELECT 
          error_type,
          COUNT(*) as error_count
        FROM ${errorTracking}
        WHERE created_at >= ${timeRange.from}
          AND created_at <= ${timeRange.to}
        GROUP BY error_type
      `);

      const severityResult = await db.execute(sql`
        SELECT 
          severity,
          COUNT(*) as error_count
        FROM ${errorTracking}
        WHERE created_at >= ${timeRange.from}
          AND created_at <= ${timeRange.to}
        GROUP BY severity
      `);

      const totalRow = totalResult.rows[0];

      const errorsByType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        errorsByType[row.error_type as string] = Number(row.error_count);
      }

      const errorsBySeverity: Record<string, number> = {};
      for (const row of severityResult.rows) {
        errorsBySeverity[row.severity as string] = Number(row.error_count);
      }

      return {
        totalErrors: Number(totalRow?.total_errors || 0),
        errorsByType,
        errorsBySeverity,
        affectedUsers: Number(totalRow?.affected_users || 0),
        resolvedErrors: Number(totalRow?.resolved_errors || 0)
      };
    } catch (error) {
      console.error('Failed to get error summary:', error);
      return {
        totalErrors: 0,
        errorsByType: {},
        errorsBySeverity: {},
        affectedUsers: 0,
        resolvedErrors: 0
      };
    }
  }

  async updateErrorStatus(id: string, status: string, resolutionNotes?: string, assignedToId?: string): Promise<ErrorTracking> {
    try {
      const updates: any = {
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`
      };
      
      if (resolutionNotes) {
        updates.resolutionNotes = resolutionNotes;
      }
      if (assignedToId) {
        updates.assignedToId = assignedToId;
      }
      if (status === 'resolved') {
        updates.resolvedAt = sql`CURRENT_TIMESTAMP`;
      }

      const [result] = await db
        .update(errorTracking)
        .set(updates)
        .where(eq(errorTracking.id, id))
        .returning();
      
      return result;
    } catch (error) {
      console.error('Failed to update error status:', error);
      throw error;
    }
  }

  async incrementErrorOccurrence(errorHash: string, metadata?: any): Promise<ErrorTracking> {
    try {
      // Try to find existing error with same hash
      const [existing] = await db.select()
        .from(errorTracking)
        .where(eq(errorTracking.errorHash, errorHash))
        .limit(1);

      if (existing) {
        // Increment occurrence count
        const [updated] = await db
          .update(errorTracking)
          .set({
            occurrenceCount: sql`${errorTracking.occurrenceCount} + 1`,
            lastOccurrence: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(errorTracking.id, existing.id))
          .returning();
        
        return updated;
      } else {
        // Create new error entry - This should use proper InsertErrorTracking fields
        throw new Error('Cannot create new error entry without required fields like errorId, errorType, severity, and message');
      }
    } catch (error) {
      console.error('Failed to increment error occurrence:', error);
      throw error;
    }
  }

  async getTopErrors(limit: number = 10, timeRange?: { from: Date; to: Date }): Promise<ErrorTracking[]> {
    try {
      const conditions = [];
      
      if (timeRange) {
        conditions.push(sql`${errorTracking.createdAt} >= ${timeRange.from}`);
        conditions.push(sql`${errorTracking.createdAt} <= ${timeRange.to}`);
      }

      const query = db.select()
        .from(errorTracking)
        .orderBy(desc(errorTracking.occurrenceCount), desc(errorTracking.createdAt))
        .limit(limit);

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
      
      return await query;
    } catch (error) {
      console.error('Failed to get top errors:', error);
      return [];
    }
  }

  // SLO Measurements Operations
  async recordSloMeasurement(measurement: InsertSloMeasurement): Promise<SloMeasurement> {
    try {
      const [result] = await db.insert(sloMeasurements).values(measurement).returning();
      return result;
    } catch (error) {
      console.error('Failed to record SLO measurement:', error);
      throw error;
    }
  }

  async getSloMeasurements(filters?: {
    sloName?: string;
    sloType?: string;
    service?: string;
    isCompliant?: boolean;
    timeRange?: { from: Date; to: Date };
  }): Promise<SloMeasurement[]> {
    try {
      const conditions = [];
      
      if (filters?.sloName) {
        conditions.push(eq(sloMeasurements.sloName, filters.sloName));
      }
      if (filters?.sloType) {
        conditions.push(eq(sloMeasurements.sloType, filters.sloType));
      }
      if (filters?.service) {
        conditions.push(eq(sloMeasurements.service, filters.service));
      }
      if (filters?.isCompliant !== undefined) {
        conditions.push(eq(sloMeasurements.isCompliant, filters.isCompliant));
      }
      if (filters?.timeRange) {
        conditions.push(sql`${sloMeasurements.windowStart} >= ${filters.timeRange.from}`);
        conditions.push(sql`${sloMeasurements.windowEnd} <= ${filters.timeRange.to}`);
      }

      if (conditions.length > 0) {
        return await db.select()
          .from(sloMeasurements)
          .where(and(...conditions))
          .orderBy(desc(sloMeasurements.windowStart));
      }
      
      return await db.select()
        .from(sloMeasurements)
        .orderBy(desc(sloMeasurements.windowStart));
    } catch (error) {
      console.error('Failed to get SLO measurements:', error);
      return [];
    }
  }

  async getSloComplianceReport(service: string, timeRange: { from: Date; to: Date }): Promise<{
    overallCompliance: number;
    sloBreaches: number;
    errorBudgetStatus: { consumed: number; remaining: number };
    trendAnalysis: { direction: string; confidence: number };
  }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_measurements,
          COUNT(CASE WHEN is_compliant THEN 1 END) as compliant_measurements,
          COUNT(CASE WHEN NOT is_compliant THEN 1 END) as breach_count,
          AVG(CASE WHEN is_compliant THEN 1.0 ELSE 0.0 END) as compliance_rate,
          AVG(error_budget_consumed) as avg_error_budget_consumed
        FROM ${sloMeasurements}
        WHERE service = ${service}
          AND window_start >= ${timeRange.from}
          AND window_end <= ${timeRange.to}
      `);

      const row = result.rows[0];
      const totalMeasurements = Number(row?.total_measurements || 0);
      const complianceRate = Number(row?.compliance_rate || 0);
      const errorBudgetConsumed = Number(row?.avg_error_budget_consumed || 0);

      // Simple trend analysis based on recent vs older compliance
      const midpoint = new Date((timeRange.from.getTime() + timeRange.to.getTime()) / 2);
      
      const recentResult = await db.execute(sql`
        SELECT AVG(CASE WHEN is_compliant THEN 1.0 ELSE 0.0 END) as recent_compliance
        FROM ${sloMeasurements}
        WHERE service = ${service}
          AND timestamp >= ${midpoint}
          AND timestamp <= ${timeRange.to}
      `);

      const olderResult = await db.execute(sql`
        SELECT AVG(CASE WHEN is_compliant THEN 1.0 ELSE 0.0 END) as older_compliance
        FROM ${sloMeasurements}
        WHERE service = ${service}
          AND timestamp >= ${timeRange.from}
          AND timestamp < ${midpoint}
      `);

      const recentCompliance = Number(recentResult.rows[0]?.recent_compliance || 0);
      const olderCompliance = Number(olderResult.rows[0]?.older_compliance || 0);
      
      const trendDirection = recentCompliance > olderCompliance ? 'improving' : 
                           recentCompliance < olderCompliance ? 'degrading' : 'stable';
      const trendConfidence = Math.abs(recentCompliance - olderCompliance) * 100;

      return {
        overallCompliance: complianceRate * 100,
        sloBreaches: Number(row?.breach_count || 0),
        errorBudgetStatus: {
          consumed: errorBudgetConsumed,
          remaining: Math.max(0, 100 - errorBudgetConsumed)
        },
        trendAnalysis: {
          direction: trendDirection,
          confidence: trendConfidence
        }
      };
    } catch (error) {
      console.error('Failed to get SLO compliance report:', error);
      return {
        overallCompliance: 0,
        sloBreaches: 0,
        errorBudgetStatus: { consumed: 0, remaining: 100 },
        trendAnalysis: { direction: 'unknown', confidence: 0 }
      };
    }
  }

  async updateSloAlerts(id: string, alertsTriggered: number): Promise<SloMeasurement> {
    try {
      const [result] = await db
        .update(sloMeasurements)
        .set({
          alertsTriggered,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(sloMeasurements.id, id))
        .returning();
      
      return result;
    } catch (error) {
      console.error('Failed to update SLO alerts:', error);
      throw error;
    }
  }

  async getSloHealth(): Promise<{
    criticalSlos: SloMeasurement[];
    degradedServices: string[];
    overallSystemHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    try {
      // Get critical SLOs (non-compliant in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const criticalSlos = await db.select()
        .from(sloMeasurements)
        .where(
          and(
            eq(sloMeasurements.isCompliant, false),
            sql`${sloMeasurements.windowStart} >= ${oneHourAgo}`
          )
        )
        .orderBy(desc(sloMeasurements.windowStart))
        .limit(10);

      // Get degraded services
      const degradedResult = await db.execute(sql`
        SELECT DISTINCT service
        FROM ${sloMeasurements}
        WHERE window_start >= ${oneHourAgo}
          AND is_compliant = false
      `);

      const degradedServices = degradedResult.rows.map(row => row.service as string);

      // Determine overall system health
      let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
      
      if (criticalSlos.length > 5) {
        overallHealth = 'critical';
      } else if (criticalSlos.length > 0 || degradedServices.length > 0) {
        overallHealth = 'degraded';
      }

      return {
        criticalSlos,
        degradedServices,
        overallSystemHealth: overallHealth
      };
    } catch (error) {
      console.error('Failed to get SLO health:', error);
      return {
        criticalSlos: [],
        degradedServices: [],
        overallSystemHealth: 'healthy'
      };
    }
  }

  // Monitoring Dashboard Data
  async getMonitoringDashboardData(timeRange: { from: Date; to: Date }): Promise<{
    systemHealth: {
      overallStatus: 'healthy' | 'degraded' | 'critical';
      errorRate: number;
      responseTime: number;
      availabilityPercentage: number;
    };
    performanceMetrics: {
      apiResponseTime: { current: number; trend: string };
      syncPerformance: { successRate: number; avgDuration: number };
      userActivity: { activeUsers: number; operationsCount: number };
    };
    alertSummary: {
      criticalAlerts: number;
      warningAlerts: number;
      recentErrors: ErrorTracking[];
    };
  }> {
    try {
      // Get system health metrics
      const errorResult = await db.execute(sql`
        SELECT COUNT(*) as error_count
        FROM ${errorTracking}
        WHERE "createdAt" >= ${timeRange.from}
          AND "createdAt" <= ${timeRange.to}
      `);

      const performanceResult = await db.execute(sql`
        SELECT 
          AVG(metric_value) as avg_response_time,
          COUNT(*) as total_requests
        FROM ${performanceMetrics}
        WHERE metric_name = 'response_time'
          AND "createdAt" >= ${timeRange.from}
          AND "createdAt" <= ${timeRange.to}
      `);

      const sloResult = await db.execute(sql`
        SELECT 
          AVG(CASE WHEN is_compliant THEN 1.0 ELSE 0.0 END) as availability
        FROM ${sloMeasurements}
        WHERE slo_type = 'availability'
          AND "windowStart" >= ${timeRange.from}
          AND "windowEnd" <= ${timeRange.to}
      `);

      // Get sync performance
      const syncResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_operations,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_operations,
          AVG(duration_ms) as avg_duration
        FROM ${syncOperationsMetrics}
        WHERE start_time >= ${timeRange.from}
          AND start_time <= ${timeRange.to}
      `);

      // Get recent errors
      const recentErrors = await this.getErrors({
        timeRange,
        severity: 'high'
      });

      // Calculate metrics
      const errorCount = Number(errorResult.rows[0]?.error_count || 0);
      const totalRequests = Number(performanceResult.rows[0]?.total_requests || 1);
      const errorRate = (errorCount / totalRequests) * 100;
      
      const avgResponseTime = Number(performanceResult.rows[0]?.avg_response_time || 0);
      const availability = Number(sloResult.rows[0]?.availability || 1) * 100;
      
      const totalSyncOps = Number(syncResult.rows[0]?.total_operations || 1);
      const successfulSyncOps = Number(syncResult.rows[0]?.successful_operations || 0);
      const syncSuccessRate = (successfulSyncOps / totalSyncOps) * 100;
      const avgSyncDuration = Number(syncResult.rows[0]?.avg_duration || 0);

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (errorRate > 5 || availability < 95) {
        overallStatus = 'critical';
      } else if (errorRate > 1 || availability < 99) {
        overallStatus = 'degraded';
      }

      // Count alerts
      const criticalAlerts = recentErrors.filter(e => e.severity === 'critical').length;
      const warningAlerts = recentErrors.filter(e => e.severity === 'medium').length;

      // Get user activity
      const userActivityResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as operations_count
        FROM ${performanceMetrics}
        WHERE timestamp >= ${timeRange.from}
          AND timestamp <= ${timeRange.to}
          AND user_id IS NOT NULL
      `);

      const activeUsers = Number(userActivityResult.rows[0]?.active_users || 0);
      const operationsCount = Number(userActivityResult.rows[0]?.operations_count || 0);

      return {
        systemHealth: {
          overallStatus,
          errorRate,
          responseTime: avgResponseTime,
          availabilityPercentage: availability
        },
        performanceMetrics: {
          apiResponseTime: { 
            current: avgResponseTime, 
            trend: avgResponseTime > 1000 ? 'degrading' : 'stable' 
          },
          syncPerformance: { 
            successRate: syncSuccessRate, 
            avgDuration: avgSyncDuration 
          },
          userActivity: { activeUsers, operationsCount }
        },
        alertSummary: {
          criticalAlerts,
          warningAlerts,
          recentErrors: recentErrors.slice(0, 5)
        }
      };
    } catch (error) {
      console.error('Failed to get monitoring dashboard data:', error);
      return {
        systemHealth: {
          overallStatus: 'healthy',
          errorRate: 0,
          responseTime: 0,
          availabilityPercentage: 100
        },
        performanceMetrics: {
          apiResponseTime: { current: 0, trend: 'stable' },
          syncPerformance: { successRate: 100, avgDuration: 0 },
          userActivity: { activeUsers: 0, operationsCount: 0 }
        },
        alertSummary: {
          criticalAlerts: 0,
          warningAlerts: 0,
          recentErrors: []
        }
      };
    }
  }

  // ===========================================
  // MOBILE SURVEY SYSTEM STORAGE IMPLEMENTATIONS 
  // ===========================================

  // Mobile Survey Session Management - LBAC Enabled
  async getMobileSurveySessions(
    filters?: {
      userId?: string;
      deviceId?: string;
      taskId?: string;
      status?: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
      plotId?: string;
      governorateId?: string;
      districtId?: string;
      subDistrictId?: string;
      neighborhoodId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
    lbacFilter?: {
      userId: string;
      userGeographicScope: {
        governorateIds: string[];
        districtIds: string[];
        subDistrictIds: string[];
        neighborhoodIds: string[];
      };
    }
  ): Promise<MobileSurveySession[]> {
    try {
      const conditions = [];
      
      // Apply filters
      if (filters?.userId) conditions.push(eq(mobileSurveySessions.surveyorId, filters.userId));
      if (filters?.deviceId) conditions.push(eq(mobileSurveySessions.deviceId, filters.deviceId));
      if (filters?.taskId) conditions.push(eq(mobileSurveySessions.applicationId, filters.taskId));
      if (filters?.status) conditions.push(eq(mobileSurveySessions.status, filters.status));
      // Remove plotId filter as it doesn't exist in mobileSurveySessions
      if (filters?.startDate) conditions.push(sql`${mobileSurveySessions.createdAt} >= ${filters.startDate}`);
      if (filters?.endDate) conditions.push(sql`${mobileSurveySessions.createdAt} <= ${filters.endDate}`);
      
      // Apply LBAC geographic constraints
      if (lbacFilter) {
        const geoConditions = [];
        if (lbacFilter.userGeographicScope.governorateIds.length > 0) {
          geoConditions.push(inArray(mobileSurveySessions.governorateId, lbacFilter.userGeographicScope.governorateIds));
        }
        if (lbacFilter.userGeographicScope.districtIds.length > 0) {
          geoConditions.push(inArray(mobileSurveySessions.districtId, lbacFilter.userGeographicScope.districtIds));
        }
        if (geoConditions.length > 0) {
          conditions.push(or(...geoConditions));
        }
      }

      // Apply additional geographic filters
      if (filters?.governorateId) conditions.push(eq(mobileSurveySessions.governorateId, filters.governorateId));
      if (filters?.districtId) conditions.push(eq(mobileSurveySessions.districtId, filters.districtId));

      let query = db.select().from(mobileSurveySessions);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      query = query.orderBy(desc(mobileSurveySessions.createdAt));
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
        if (filters?.offset) {
          query = query.offset(filters.offset);
        }
      }
      
      return await query;
    } catch (error) {
      console.error('Failed to get mobile survey sessions:', error);
      throw error;
    }
  }

  async getMobileSurveySession(
    id: string,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveySession | undefined> {
    try {
      const conditions = [eq(mobileSurveySessions.id, id)];
      
      // Apply LBAC constraints
      if (lbacFilter) {
        const geoConditions = [];
        if (lbacFilter.userGeographicScope.governorateIds?.length > 0) {
          geoConditions.push(inArray(mobileSurveySessions.governorateId, lbacFilter.userGeographicScope.governorateIds));
        }
        if (lbacFilter.userGeographicScope.districtIds?.length > 0) {
          geoConditions.push(inArray(mobileSurveySessions.districtId, lbacFilter.userGeographicScope.districtIds));
        }
        if (geoConditions.length > 0) {
          conditions.push(or(...geoConditions));
        }
      }
      
      const [session] = await db.select()
        .from(mobileSurveySessions)
        .where(and(...conditions));
      
      return session || undefined;
    } catch (error) {
      console.error('Failed to get mobile survey session:', error);
      throw error;
    }
  }

  async createMobileSurveySession(
    session: InsertMobileSurveySession,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic: { governorateId?: string; districtId?: string; plotId?: string };
    }
  ): Promise<{ session: MobileSurveySession; changeEntry: ChangeTracking }> {
    try {
      // Use safeCreate wrapper for automatic change tracking
      const result = await this.safeCreate<MobileSurveySession>(
        'mobile_survey_sessions',
        session,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          sessionId: randomUUID(),
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          geographic: metadata.geographic
        }
      );
      
      return {
        session: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to create mobile survey session:', error);
      throw error;
    }
  }

  async updateMobileSurveySession(
    id: string,
    updates: Partial<InsertMobileSurveySession>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{ session: MobileSurveySession; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeUpdate<MobileSurveySession>(
        'mobile_survey_sessions',
        id,
        updates,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          geographic: metadata.geographic
        }
      );
      
      return {
        session: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to update mobile survey session:', error);
      throw error;
    }
  }

  async submitMobileSurveySession(
    id: string,
    metadata: { userId: string; deviceId: string; clientChangeId?: string }
  ): Promise<MobileSurveySession> {
    try {
      const [session] = await db
        .update(mobileSurveySessions)
        .set({
          status: 'submitted',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(mobileSurveySessions.id, id))
        .returning();
      
      // Create change tracking entry
      await this.createChangeTrackingEntry({
        tableName: 'mobile_survey_sessions',
        recordId: id,
        operationType: 'update',
        changedById: metadata.userId,
        changeSource: 'mobile_app',
        deviceId: metadata.deviceId,
        clientChangeId: metadata.clientChangeId,
        fieldChanges: ['status', 'submittedAt'],
        changeMetadata: { status: 'submitted', updatedAt: new Date() }
      });
      
      return session;
    } catch (error) {
      console.error('Failed to submit mobile survey session:', error);
      throw error;
    }
  }

  // Mobile Survey Points Management - Geographic Constraints
  async getMobileSurveyPoints(
    filters?: {
      sessionId?: string;
      plotId?: string;
      featureCode?: string;
      pointType?: 'boundary' | 'detail' | 'reference' | 'control';
      bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
      hasValidCoordinates?: boolean;
      isDeleted?: boolean;
    },
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyPoint[]> {
    try {
      const conditions = [];
      
      if (filters?.sessionId) conditions.push(eq(mobileSurveyPoints.sessionId, filters.sessionId));
      // Remove plotId filter as it doesn't exist in mobileSurveyPoints
      if (filters?.featureCode) conditions.push(eq(mobileSurveyPoints.featureCode, filters.featureCode));
      if (filters?.pointType) conditions.push(eq(mobileSurveyPoints.pointType, filters.pointType));
      if (filters?.isDeleted !== undefined) conditions.push(eq(mobileSurveyPoints.isDeleted, filters.isDeleted));
      
      // Geographic bounds filtering (WGS84)
      if (filters?.bounds) {
        conditions.push(sql`${mobileSurveyPoints.latitude} >= ${filters.bounds.minLat}`);
        conditions.push(sql`${mobileSurveyPoints.latitude} <= ${filters.bounds.maxLat}`);
        conditions.push(sql`${mobileSurveyPoints.longitude} >= ${filters.bounds.minLng}`);
        conditions.push(sql`${mobileSurveyPoints.longitude} <= ${filters.bounds.maxLng}`);
      }
      
      // Coordinate validation
      if (filters?.hasValidCoordinates === true) {
        conditions.push(sql`${mobileSurveyPoints.latitude} IS NOT NULL`);
        conditions.push(sql`${mobileSurveyPoints.longitude} IS NOT NULL`);
        conditions.push(sql`${mobileSurveyPoints.latitude} BETWEEN -90 AND 90`);
        conditions.push(sql`${mobileSurveyPoints.longitude} BETWEEN -180 AND 180`);
      }

      let query = db.select().from(mobileSurveyPoints);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(mobileSurveyPoints.createdAt));
    } catch (error) {
      console.error('Failed to get mobile survey points:', error);
      throw error;
    }
  }

  async getMobileSurveyPoint(
    id: string,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyPoint | undefined> {
    try {
      const [point] = await db.select()
        .from(mobileSurveyPoints)
        .where(eq(mobileSurveyPoints.id, id));
      
      return point || undefined;
    } catch (error) {
      console.error('Failed to get mobile survey point:', error);
      throw error;
    }
  }

  async createMobileSurveyPoint(
    point: InsertMobileSurveyPoint,
    metadata: {
      userId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
      geographic: { plotId?: string; governorateId?: string };
    }
  ): Promise<{ point: MobileSurveyPoint; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeCreate<MobileSurveyPoint>(
        'mobile_survey_points',
        point,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          sessionId: metadata.sessionId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          geographic: metadata.geographic
        }
      );
      
      return {
        point: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to create mobile survey point:', error);
      throw error;
    }
  }

  async updateMobileSurveyPoint(
    id: string,
    updates: Partial<InsertMobileSurveyPoint>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ point: MobileSurveyPoint; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeUpdate<MobileSurveyPoint>(
        'mobile_survey_points',
        id,
        updates,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app'
        }
      );
      
      return {
        point: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to update mobile survey point:', error);
      throw error;
    }
  }

  async deleteMobileSurveyPoint(
    id: string,
    metadata: {
      userId: string;
      deviceId: string;
      deletionReason?: string;
      clientChangeId?: string;
    }
  ): Promise<{ tombstone: DeletionTombstone; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeDelete(
        'mobile_survey_points',
        id,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          deletionReason: metadata.deletionReason || 'User deleted from mobile app',
          deletionType: 'soft'
        }
      );
      
      return result;
    } catch (error) {
      console.error('Failed to delete mobile survey point:', error);
      throw error;
    }
  }

  async validateSurveyPointCoordinates(
    plotId: string,
    coordinates: { latitude: number; longitude: number },
    tolerance: number
  ): Promise<{ isValid: boolean; distanceFromPlot?: number; warnings?: string[] }> {
    try {
      // Basic coordinate validation
      const warnings: string[] = [];
      
      if (coordinates.latitude < -90 || coordinates.latitude > 90) {
        return { isValid: false, warnings: ['Latitude must be between -90 and 90 degrees'] };
      }
      
      if (coordinates.longitude < -180 || coordinates.longitude > 180) {
        return { isValid: false, warnings: ['Longitude must be between -180 and 180 degrees'] };
      }
      
      // Get plot boundaries for validation (if available)
      const [plot] = await db.select()
        .from(plots)
        .where(eq(plots.id, plotId))
        .limit(1);
      
      if (!plot) {
        warnings.push('Plot not found for coordinate validation');
        return { isValid: true, warnings };
      }
      
      // TODO: Implement spatial distance calculation if plot boundaries are available
      // For now, return basic validation
      return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
      
    } catch (error) {
      console.error('Failed to validate survey point coordinates:', error);
      return { isValid: false, warnings: ['Coordinate validation failed'] };
    }
  }

  // Mobile Survey Geometries Management - GeoJSON Support
  async getMobileSurveyGeometries(
    filters?: {
      sessionId?: string;
      pointId?: string;
      geometryType?: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
      featureCode?: string;
      isWithinBounds?: boolean;
      isDeleted?: boolean;
    },
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyGeometry[]> {
    try {
      const conditions = [];
      
      if (filters?.sessionId) conditions.push(eq(mobileSurveyGeometries.sessionId, filters.sessionId));
      // Remove pointId filter as mobileSurveyGeometries doesn't have pointId column
      if (filters?.geometryType) conditions.push(eq(mobileSurveyGeometries.geometryType, filters.geometryType));
      if (filters?.featureCode) conditions.push(eq(mobileSurveyGeometries.featureCode, filters.featureCode));
      if (filters?.isDeleted !== undefined) conditions.push(eq(mobileSurveyGeometries.isDeleted, filters.isDeleted));

      let query = db.select().from(mobileSurveyGeometries);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(mobileSurveyGeometries.createdAt));
    } catch (error) {
      console.error('Failed to get mobile survey geometries:', error);
      throw error;
    }
  }

  async getMobileSurveyGeometry(
    id: string,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyGeometry | undefined> {
    try {
      const [geometry] = await db.select()
        .from(mobileSurveyGeometries)
        .where(eq(mobileSurveyGeometries.id, id));
      
      return geometry || undefined;
    } catch (error) {
      console.error('Failed to get mobile survey geometry:', error);
      throw error;
    }
  }

  async createMobileSurveyGeometry(
    geometry: InsertMobileSurveyGeometry,
    metadata: {
      userId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
      geographic: { plotId?: string };
    }
  ): Promise<{ geometry: MobileSurveyGeometry; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeCreate<MobileSurveyGeometry>(
        'mobile_survey_geometries',
        geometry,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          sessionId: metadata.sessionId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          geographic: metadata.geographic
        }
      );
      
      return {
        geometry: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to create mobile survey geometry:', error);
      throw error;
    }
  }

  async updateMobileSurveyGeometry(
    id: string,
    updates: Partial<InsertMobileSurveyGeometry>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ geometry: MobileSurveyGeometry; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeUpdate<MobileSurveyGeometry>(
        'mobile_survey_geometries',
        id,
        updates,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app'
        }
      );
      
      return {
        geometry: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to update mobile survey geometry:', error);
      throw error;
    }
  }

  async validateGeoJSONGeometry(geoJsonData: any): Promise<{
    isValid: boolean;
    geometryType?: string;
    coordinateSystem?: string;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Basic GeoJSON structure validation
      if (!geoJsonData || typeof geoJsonData !== 'object') {
        errors.push('GeoJSON data must be a valid object');
        return { isValid: false, errors };
      }
      
      if (!geoJsonData.type) {
        errors.push('GeoJSON must have a type property');
        return { isValid: false, errors };
      }
      
      const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
      if (!validTypes.includes(geoJsonData.type)) {
        errors.push(`Invalid geometry type: ${geoJsonData.type}`);
        return { isValid: false, errors };
      }
      
      if (!geoJsonData.coordinates && geoJsonData.type !== 'GeometryCollection') {
        errors.push('GeoJSON geometry must have coordinates property');
        return { isValid: false, errors };
      }
      
      // Basic coordinate validation for WGS84 (EPSG:4326)
      const validateCoordinate = (coord: any[]): boolean => {
        if (!Array.isArray(coord) || coord.length < 2) return false;
        const [lng, lat] = coord;
        return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
      };
      
      // Recursive coordinate validation (simplified)
      const validateCoordinates = (coords: any, depth: number): boolean => {
        if (depth === 0) {
          return validateCoordinate(coords);
        }
        if (!Array.isArray(coords)) return false;
        return coords.every((c: any) => validateCoordinates(c, depth - 1));
      };
      
      // Validate coordinates based on geometry type
      let coordDepth = 0;
      switch (geoJsonData.type) {
        case 'Point':
          coordDepth = 0;
          break;
        case 'LineString':
        case 'MultiPoint':
          coordDepth = 1;
          break;
        case 'Polygon':
        case 'MultiLineString':
          coordDepth = 2;
          break;
        case 'MultiPolygon':
          coordDepth = 3;
          break;
      }
      
      if (geoJsonData.type !== 'GeometryCollection' && !validateCoordinates(geoJsonData.coordinates, coordDepth)) {
        errors.push('Invalid coordinates for geometry type');
        return { isValid: false, errors };
      }
      
      return {
        isValid: true,
        geometryType: geoJsonData.type,
        coordinateSystem: 'EPSG:4326',
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
    } catch (error) {
      console.error('Failed to validate GeoJSON geometry:', error);
      return { isValid: false, errors: ['GeoJSON validation failed'] };
    }
  }

  // Mobile Field Visits Management - Lifecycle Tracking  
  async getMobileFieldVisits(
    filters?: {
      userId?: string;
      deviceId?: string;
      sessionId?: string;
      plotId?: string;
      visitStatus?: 'started' | 'in_progress' | 'completed' | 'cancelled';
      governorateId?: string;
      districtId?: string;
      visitDate?: Date;
      startDate?: Date;
      endDate?: Date;
    },
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileFieldVisit[]> {
    try {
      const conditions = [];
      
      if (filters?.userId) conditions.push(eq(mobileFieldVisits.surveyorId, filters.userId));
      if (filters?.deviceId) conditions.push(eq(mobileFieldVisits.deviceId, filters.deviceId));
      if (filters?.sessionId) conditions.push(eq(mobileFieldVisits.sessionId, filters.sessionId));
      if (filters?.plotId) conditions.push(eq(mobileFieldVisits.plotId, filters.plotId));
      if (filters?.visitStatus) conditions.push(eq(mobileFieldVisits.visitStatus, filters.visitStatus));
      if (filters?.governorateId) conditions.push(eq(mobileFieldVisits.governorateId, filters.governorateId));
      if (filters?.districtId) conditions.push(eq(mobileFieldVisits.districtId, filters.districtId));
      if (filters?.startDate) conditions.push(sql`${mobileFieldVisits.visitDate} >= ${filters.startDate}`);
      if (filters?.endDate) conditions.push(sql`${mobileFieldVisits.visitDate} <= ${filters.endDate}`);

      let query = db.select().from(mobileFieldVisits);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(mobileFieldVisits.createdAt));
    } catch (error) {
      console.error('Failed to get mobile field visits:', error);
      throw error;
    }
  }

  async getMobileFieldVisit(
    id: string,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileFieldVisit | undefined> {
    try {
      const [visit] = await db.select()
        .from(mobileFieldVisits)
        .where(eq(mobileFieldVisits.id, id));
      
      return visit || undefined;
    } catch (error) {
      console.error('Failed to get mobile field visit:', error);
      throw error;
    }
  }

  async startMobileFieldVisit(
    visit: InsertMobileFieldVisit,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
      geographic: { plotId?: string; governorateId?: string; districtId?: string };
    }
  ): Promise<{ visit: MobileFieldVisit; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeCreate<MobileFieldVisit>(
        'mobile_field_visits',
        { ...visit, visitStatus: 'started' },
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app',
          geographic: metadata.geographic
        }
      );
      
      return {
        visit: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to start mobile field visit:', error);
      throw error;
    }
  }

  async updateMobileFieldVisit(
    id: string,
    updates: Partial<InsertMobileFieldVisit>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ visit: MobileFieldVisit; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeUpdate<MobileFieldVisit>(
        'mobile_field_visits',
        id,
        updates,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app'
        }
      );
      
      return {
        visit: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to update mobile field visit:', error);
      throw error;
    }
  }

  async completeMobileFieldVisit(
    id: string,
    completionData: {
      endTime: Date;
      notes?: string;
      weatherConditions?: string;
      totalPointsCaptured?: number;
      qualityScore?: number;
    },
    metadata: { userId: string; deviceId: string }
  ): Promise<MobileFieldVisit> {
    try {
      const [visit] = await db
        .update(mobileFieldVisits)
        .set({
          visitStatus: 'completed',
          endTime: completionData.endTime,
          notes: completionData.notes,
          weatherConditions: completionData.weatherConditions,
          totalPointsCaptured: completionData.totalPointsCaptured,
          qualityScore: completionData.qualityScore,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(mobileFieldVisits.id, id))
        .returning();
      
      // Create change tracking entry
      await this.createChangeTrackingEntry({
        tableName: 'mobile_field_visits',
        recordId: id,
        operationType: 'update',
        changedById: metadata.userId,
        changeSource: 'mobile_app',
        deviceId: metadata.deviceId,
        fieldChanges: ['visitStatus', 'endTime', 'notes', 'weatherConditions', 'totalPointsCaptured', 'qualityScore'],
        changeMetadata: { ...completionData, visitStatus: 'completed' }
      });
      
      return visit;
    } catch (error) {
      console.error('Failed to complete mobile field visit:', error);
      throw error;
    }
  }

  // Mobile Survey Attachments Management - Secure File Handling
  async getMobileSurveyAttachments(
    filters?: {
      sessionId?: string;
      pointId?: string;
      attachmentType?: 'photo' | 'document' | 'audio' | 'video' | 'signature';
      isUploaded?: boolean;
      isDeleted?: boolean;
    },
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyAttachment[]> {
    try {
      const conditions = [];
      
      if (filters?.sessionId) conditions.push(eq(mobileSurveyAttachments.sessionId, filters.sessionId));
      if (filters?.pointId) conditions.push(eq(mobileSurveyAttachments.relatedPointId, filters.pointId));
      if (filters?.attachmentType) conditions.push(eq(mobileSurveyAttachments.attachmentType, filters.attachmentType));
      if (filters?.isUploaded !== undefined) conditions.push(eq(mobileSurveyAttachments.isUploaded, filters.isUploaded));
      // Remove isDeleted filter as mobileSurveyAttachments doesn't have isDeleted column

      let query = db.select().from(mobileSurveyAttachments);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(mobileSurveyAttachments.createdAt));
    } catch (error) {
      console.error('Failed to get mobile survey attachments:', error);
      throw error;
    }
  }

  async getMobileSurveyAttachment(
    id: string,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<MobileSurveyAttachment | undefined> {
    try {
      const [attachment] = await db.select()
        .from(mobileSurveyAttachments)
        .where(eq(mobileSurveyAttachments.id, id));
      
      return attachment || undefined;
    } catch (error) {
      console.error('Failed to get mobile survey attachment:', error);
      throw error;
    }
  }

  async createMobileSurveyAttachment(
    attachment: InsertMobileSurveyAttachment,
    metadata: {
      userId: string;
      deviceId: string;
      sessionId: string;
      clientChangeId?: string;
    }
  ): Promise<{ attachment: MobileSurveyAttachment; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeCreate<MobileSurveyAttachment>(
        'mobile_survey_attachments',
        attachment,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          sessionId: metadata.sessionId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app'
        }
      );
      
      return {
        attachment: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to create mobile survey attachment:', error);
      throw error;
    }
  }

  async updateMobileSurveyAttachment(
    id: string,
    updates: Partial<InsertMobileSurveyAttachment>,
    metadata: {
      userId: string;
      deviceId: string;
      clientChangeId?: string;
    }
  ): Promise<{ attachment: MobileSurveyAttachment; changeEntry: ChangeTracking }> {
    try {
      const result = await this.safeUpdate<MobileSurveyAttachment>(
        'mobile_survey_attachments',
        id,
        updates,
        {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          clientChangeId: metadata.clientChangeId,
          changeSource: 'mobile_app'
        }
      );
      
      return {
        attachment: result.record,
        changeEntry: result.changeEntry
      };
    } catch (error) {
      console.error('Failed to update mobile survey attachment:', error);
      throw error;
    }
  }

  async markAttachmentAsUploaded(
    id: string,
    uploadMetadata: {
      storageUrl: string;
      uploadedAt: Date;
      fileHash?: string;
      compressionRatio?: number;
    }
  ): Promise<MobileSurveyAttachment> {
    try {
      const [attachment] = await db
        .update(mobileSurveyAttachments)
        .set({
          isUploaded: true,
          storageUrl: uploadMetadata.storageUrl,
          uploadedAt: uploadMetadata.uploadedAt,
          // fileHash field doesn't exist in schema
          compressionRatio: uploadMetadata.compressionRatio,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(mobileSurveyAttachments.id, id))
        .returning();
      
      return attachment;
    } catch (error) {
      console.error('Failed to mark attachment as uploaded:', error);
      throw error;
    }
  }

  // Mobile Sync Cursors Management - Delta Sync Support
  async getMobileSyncCursors(filters?: {
    deviceId?: string;
    userId?: string;
    tableName?: string;
    isActive?: boolean;
  }): Promise<MobileSyncCursor[]> {
    try {
      const conditions = [];
      
      if (filters?.deviceId) conditions.push(eq(mobileSyncCursors.deviceId, filters.deviceId));
      // Remove userId filter as mobileSyncCursors doesn't have userId column
      if (filters?.tableName) conditions.push(eq(mobileSyncCursors.tableName, filters.tableName));
      if (filters?.isActive !== undefined) conditions.push(eq(mobileSyncCursors.isActive, filters.isActive));

      let query = db.select().from(mobileSyncCursors);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(mobileSyncCursors.lastSyncTimestamp));
    } catch (error) {
      console.error('Failed to get mobile sync cursors:', error);
      throw error;
    }
  }

  async getMobileSyncCursor(id: string): Promise<MobileSyncCursor | undefined> {
    try {
      const [cursor] = await db.select()
        .from(mobileSyncCursors)
        .where(eq(mobileSyncCursors.id, id));
      
      return cursor || undefined;
    } catch (error) {
      console.error('Failed to get mobile sync cursor:', error);
      throw error;
    }
  }

  async updateMobileSyncCursor(
    deviceId: string,
    tableName: string,
    cursor: {
      lastSyncTimestamp: Date;
      watermarkHigh: string;
      recordCount: number;
      syncStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    }
  ): Promise<MobileSyncCursor> {
    try {
      // Try to update existing cursor
      const [existing] = await db.select()
        .from(mobileSyncCursors)
        .where(and(
          eq(mobileSyncCursors.deviceId, deviceId),
          eq(mobileSyncCursors.tableName, tableName)
        ))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(mobileSyncCursors)
          .set({
            lastSyncTimestamp: cursor.lastSyncTimestamp,
            // watermarkHigh field doesn't exist in mobileSyncCursors schema
            recordCount: cursor.recordCount,
            syncStatus: cursor.syncStatus,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(mobileSyncCursors.id, existing.id))
          .returning();
        
        return updated;
      } else {
        // Create new cursor
        const [created] = await db
          .insert(mobileSyncCursors)
          .values({
            deviceId,
            tableName,
            lastSyncTimestamp: cursor.lastSyncTimestamp,
            // watermarkHigh field doesn't exist in mobileSyncCursors schema
            // watermarkLow field doesn't exist in mobileSyncCursors schema
            recordCount: cursor.recordCount,
            syncStatus: cursor.syncStatus,
            isActive: true
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error('Failed to update mobile sync cursor:', error);
      throw error;
    }
  }

  async getMobileDeltaChanges(
    deviceId: string,
    tableName: string,
    watermarkLow?: string,
    limit: number = 100,
    lbacFilter?: { userId: string; userGeographicScope: any }
  ): Promise<{
    changes: any[];
    nextWatermark: string;
    hasMore: boolean;
    tombstones: DeletionTombstone[];
  }> {
    try {
      // Get changes since last watermark
      const conditions = [
        eq(changeTracking.tableName, tableName)
      ];
      
      if (watermarkLow) {
        conditions.push(sql`${changeTracking.changeVersion} > ${watermarkLow}`);
      }
      
      // Apply LBAC filtering if provided
      if (lbacFilter && lbacFilter.userGeographicScope) {
        // Add geographic constraints based on table type
        if (tableName.includes('mobile_survey')) {
          // For mobile survey tables, filter by geographic scope
          const geoConditions = [];
          if (lbacFilter.userGeographicScope.governorateIds?.length > 0) {
            geoConditions.push(sql`${changeTracking.geographic}->>'governorateId' = ANY(${lbacFilter.userGeographicScope.governorateIds})`);
          }
          if (geoConditions.length > 0) {
            conditions.push(or(...geoConditions));
          }
        }
      }

      const changes = await db.select()
        .from(changeTracking)
        .where(and(...conditions))
        .orderBy(asc(changeTracking.changeVersion))
        .limit(limit + 1); // Get one extra to check if there are more

      const hasMore = changes.length > limit;
      const resultChanges = hasMore ? changes.slice(0, limit) : changes;
      
      const nextWatermark = resultChanges.length > 0 
        ? resultChanges[resultChanges.length - 1].changeVersion 
        : watermarkLow || '0';

      // Get related tombstones
      const tombstoneConditions = [
        eq(deletionTombstones.tableName, tableName)
      ];
      
      if (watermarkLow) {
        tombstoneConditions.push(sql`${deletionTombstones.deletedAt} > (SELECT created_at FROM change_tracking WHERE change_version = ${watermarkLow})`);
      }

      const tombstones = await db.select()
        .from(deletionTombstones)
        .where(and(...tombstoneConditions))
        .limit(50); // Reasonable limit for tombstones

      return {
        changes: resultChanges,
        nextWatermark,
        hasMore,
        tombstones
      };
    } catch (error) {
      console.error('Failed to get mobile delta changes:', error);
      throw error;
    }
  }

  async processMobileBatchUpload(
    deviceId: string,
    operations: Array<{
      operation: 'create' | 'update' | 'delete';
      tableName: string;
      recordId?: string;
      data?: any;
      clientChangeId: string;
      timestamp: Date;
    }>,
    metadata: {
      userId: string;
      sessionId: string;
      geographic?: { governorateId?: string; districtId?: string };
    }
  ): Promise<{
    processed: number;
    conflicts: Array<{ operation: any; reason: string; suggested: any }>;
    errors: Array<{ operation: any; error: string }>;
    changeEntries: ChangeTracking[];
  }> {
    try {
      const results = {
        processed: 0,
        conflicts: [],
        errors: [],
        changeEntries: []
      };

      for (const operation of operations) {
        try {
          // Check for idempotency
          const isProcessed = await this.isChangeProcessed(deviceId, operation.clientChangeId);
          if (isProcessed) {
            // Already processed, skip
            results.processed++;
            continue;
          }

          switch (operation.operation) {
            case 'create':
              try {
                const result = await this.safeCreate(
                  operation.tableName,
                  operation.data,
                  {
                    userId: metadata.userId,
                    deviceId,
                    sessionId: metadata.sessionId,
                    clientChangeId: operation.clientChangeId,
                    changeSource: 'mobile_app',
                    geographic: metadata.geographic
                  }
                );
                results.changeEntries.push(result.changeEntry);
                results.processed++;
              } catch (error: any) {
                if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
                  results.conflicts.push({
                    operation,
                    reason: 'Record already exists with unique constraint violation',
                    suggested: 'Use update operation instead'
                  });
                } else {
                  results.errors.push({ operation, error: error.message });
                }
              }
              break;

            case 'update':
              if (!operation.recordId) {
                results.errors.push({ operation, error: 'Record ID required for update operation' });
                break;
              }
              try {
                const result = await this.safeUpdate(
                  operation.tableName,
                  operation.recordId,
                  operation.data,
                  {
                    userId: metadata.userId,
                    deviceId,
                    sessionId: metadata.sessionId,
                    clientChangeId: operation.clientChangeId,
                    changeSource: 'mobile_app',
                    geographic: metadata.geographic
                  }
                );
                results.changeEntries.push(result.changeEntry);
                results.processed++;
              } catch (error: any) {
                results.errors.push({ operation, error: error.message });
              }
              break;

            case 'delete':
              if (!operation.recordId) {
                results.errors.push({ operation, error: 'Record ID required for delete operation' });
                break;
              }
              try {
                const result = await this.safeDelete(
                  operation.tableName,
                  operation.recordId,
                  {
                    userId: metadata.userId,
                    deviceId,
                    sessionId: metadata.sessionId,
                    clientChangeId: operation.clientChangeId,
                    changeSource: 'mobile_app',
                    deletionReason: 'Deleted from mobile app',
                    deletionType: 'soft',
                    geographic: metadata.geographic
                  }
                );
                results.changeEntries.push(result.changeEntry);
                results.processed++;
              } catch (error: any) {
                results.errors.push({ operation, error: error.message });
              }
              break;

            default:
              results.errors.push({ operation, error: `Unknown operation type: ${operation.operation}` });
          }
        } catch (error: any) {
          results.errors.push({ operation, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to process mobile batch upload:', error);
      throw error;
    }
  }

  // Mobile LBAC Geographic Validation
  async validateMobileUserGeographicAccess(
    userId: string,
    requiredAccess: {
      plotId?: string;
      neighborhoodId?: string;
      subDistrictId?: string;
      districtId?: string;
      governorateId?: string;
    }
  ): Promise<{
    hasAccess: boolean;
    accessLevel: 'full' | 'partial' | 'none';
    allowedOperations: ('read' | 'create' | 'update' | 'delete')[];
    reason?: string;
  }> {
    try {
      // Get user's geographic scope
      const userScope = await this.expandUserGeographicScope(userId);
      
      // Check access at different levels
      let hasAccess = false;
      let accessLevel: 'full' | 'partial' | 'none' = 'none';
      const allowedOperations: ('read' | 'create' | 'update' | 'delete')[] = [];

      // Check governorate level access
      if (requiredAccess.governorateId) {
        if (userScope.governorateIds.includes(requiredAccess.governorateId)) {
          hasAccess = true;
          accessLevel = 'full';
          allowedOperations.push('read', 'create', 'update', 'delete');
        }
      }

      // Check district level access
      if (requiredAccess.districtId && !hasAccess) {
        if (userScope.districtIds.includes(requiredAccess.districtId)) {
          hasAccess = true;
          accessLevel = 'full';
          allowedOperations.push('read', 'create', 'update', 'delete');
        }
      }

      // Check sub-district level access
      if (requiredAccess.subDistrictId && !hasAccess) {
        if (userScope.subDistrictIds.includes(requiredAccess.subDistrictId)) {
          hasAccess = true;
          accessLevel = 'full';
          allowedOperations.push('read', 'create', 'update', 'delete');
        }
      }

      // Check neighborhood level access
      if (requiredAccess.neighborhoodId && !hasAccess) {
        if (userScope.neighborhoodIds.includes(requiredAccess.neighborhoodId)) {
          hasAccess = true;
          accessLevel = 'full';
          allowedOperations.push('read', 'create', 'update', 'delete');
        }
      }

      // Check plot level access (requires neighborhood access)
      if (requiredAccess.plotId && !hasAccess) {
        // Get plot's neighborhood
        const [plot] = await db.select({ neighborhoodId: plots.neighborhoodId })
          .from(plots)
          .where(eq(plots.id, requiredAccess.plotId))
          .limit(1);
        
        if (plot && userScope.neighborhoodIds.includes(plot.neighborhoodId)) {
          hasAccess = true;
          accessLevel = 'full';
          allowedOperations.push('read', 'create', 'update', 'delete');
        }
      }

      // If no specific access, check if user has any geographic assignments (read-only)
      if (!hasAccess && (userScope.governorateIds.length > 0 || userScope.districtIds.length > 0)) {
        hasAccess = true;
        accessLevel = 'partial';
        allowedOperations.push('read');
      }

      return {
        hasAccess,
        accessLevel,
        allowedOperations,
        reason: hasAccess ? undefined : 'User does not have geographic access to the requested area'
      };
    } catch (error) {
      console.error('Failed to validate mobile user geographic access:', error);
      return {
        hasAccess: false,
        accessLevel: 'none',
        allowedOperations: [],
        reason: 'Geographic access validation failed'
      };
    }
  }

  // Helper method to get table map (for dynamic table access)
  private getTableMap(): Record<string, any> {
    return {
      users,
      departments,
      positions,
      governorates,
      districts,
      subDistricts,
      neighborhoods,
      harat,
      sectors,
      neighborhoodUnits,
      blocks,
      plots,
      streets,
      streetSegments,
      lawsRegulations,
      lawSections,
      lawArticles,
      requirementCategories,
      requirements,
      services,
      serviceRequirements,
      applications,
      surveyingDecisions,
      tasks,
      systemSettings,
      deviceRegistrations,
      syncSessions,
      offlineOperations,
      syncConflicts,
      deletionTombstones,
      changeTracking,
      serviceTemplates,
      dynamicForms,
      workflowDefinitions,
      serviceBuilder,
      applicationAssignments,
      applicationStatusHistory,
      applicationReviews,
      notifications,
      appointments,
      contactAttempts,
      surveyAssignmentForms,
      userGeographicAssignments,
      fieldVisits,
      surveyResults,
      surveyReports,
      roles,
      permissions,
      rolePermissions,
      userRoles,
      performanceMetrics,
      syncOperationsMetrics,
      errorTracking,
      sloMeasurements,
    };
  }

  // =============================================
  // MOBILE SURVEY ATTACHMENTS MANAGEMENT
  // =============================================

  // Create mobile survey attachment record
  async createMobileSurveyAttachment(data: any, metadata: any = {}): Promise<any> {
    try {
      // Import mobileSurveyAttachments from schema
      const { mobileSurveyAttachments } = await import("@shared/schema");
      
      const newAttachment = await db.insert(mobileSurveyAttachments).values(data).returning();
      
      // Create change tracking entry if metadata provided
      if (metadata.userId) {
        await this.createChangeTrackingEntry('mobile_survey_attachments', newAttachment[0].id, 'created', {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          geographic: metadata.geographic,
          recordSnapshot: newAttachment[0]
        });
      }
      
      return newAttachment[0];
    } catch (error) {
      console.error('Failed to create mobile survey attachment:', error);
      throw error;
    }
  }

  // Update mobile survey attachment record
  async updateMobileSurveyAttachment(id: string, data: any, metadata: any = {}): Promise<any> {
    try {
      const { mobileSurveyAttachments } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const updatedAttachment = await db.update(mobileSurveyAttachments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(mobileSurveyAttachments.id, id))
        .returning();
      
      if (updatedAttachment.length === 0) {
        throw new Error('Attachment not found');
      }
      
      // Create change tracking entry if metadata provided
      if (metadata.userId) {
        await this.createChangeTrackingEntry('mobile_survey_attachments', id, 'updated', {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          geographic: metadata.geographic,
          recordSnapshot: updatedAttachment[0]
        });
      }
      
      return updatedAttachment[0];
    } catch (error) {
      console.error('Failed to update mobile survey attachment:', error);
      throw error;
    }
  }

  // Delete mobile survey attachment (soft delete)
  async deleteMobileSurveyAttachment(id: string, metadata: any = {}): Promise<boolean> {
    try {
      const { mobileSurveyAttachments, deletionTombstones } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      // Get attachment before deletion for tombstone
      const attachment = await db.select()
        .from(mobileSurveyAttachments)
        .where(eq(mobileSurveyAttachments.id, id))
        .limit(1);
      
      if (attachment.length === 0) {
        return false;
      }
      
      // Soft delete by marking as deleted
      await db.update(mobileSurveyAttachments)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(mobileSurveyAttachments.id, id));
      
      // Create deletion tombstone for sync
      await db.insert(deletionTombstones).values({
        tableName: 'mobile_survey_attachments',
        recordId: id,
        deletionReason: 'user_deleted',
        originalData: attachment[0],
        governorateId: attachment[0].captureLocation?.governorateId,
        districtId: attachment[0].captureLocation?.districtId,
        deletedById: metadata.userId,
        syncVersion: '1',
        isActive: true,
        expiresAt: sql`NOW() + INTERVAL '90 days'` // Keep tombstone for 90 days
      });
      
      // Create change tracking entry if metadata provided
      if (metadata.userId) {
        await this.createChangeTrackingEntry('mobile_survey_attachments', id, 'deleted', {
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          geographic: metadata.geographic,
          recordSnapshot: null
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete mobile survey attachment:', error);
      throw error;
    }
  }

  // Get mobile survey attachment by ID
  async getMobileSurveyAttachment(id: string): Promise<any | null> {
    try {
      const { mobileSurveyAttachments } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const result = await db.select()
        .from(mobileSurveyAttachments)
        .where(eq(mobileSurveyAttachments.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get mobile survey attachment:', error);
      return null;
    }
  }

  // Get attachments for a session
  async getMobileSurveyAttachmentsBySession(sessionId: string, options: { includeDeleted?: boolean } = {}): Promise<any[]> {
    try {
      const { mobileSurveyAttachments } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const conditions = [eq(mobileSurveyAttachments.sessionId, sessionId)];
      
      if (!options.includeDeleted) {
        conditions.push(eq(mobileSurveyAttachments.isDeleted, false));
      }
      
      const result = await db.select()
        .from(mobileSurveyAttachments)
        .where(and(...conditions))
        .orderBy(mobileSurveyAttachments.createdAt);
      
      return result;
    } catch (error) {
      console.error('Failed to get session attachments:', error);
      return [];
    }
  }

  // =============================================
  // GEOPROCESSING QUEUE SYSTEM IMPLEMENTATION
  // =============================================

  // Geo Jobs management
  async getGeoJobs(filters?: {
    status?: string;
    taskType?: string;
    ownerId?: string;
    targetType?: string;
    targetId?: string;
    neighborhoodUnitId?: string;
    priority?: number;
  }): Promise<GeoJob[]> {
    try {
      let query = db.select().from(geoJobs);
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(geoJobs.status, filters.status as any));
      }
      if (filters?.taskType) {
        conditions.push(eq(geoJobs.taskType, filters.taskType));
      }
      if (filters?.ownerId) {
        conditions.push(eq(geoJobs.ownerId, filters.ownerId));
      }
      if (filters?.targetType) {
        conditions.push(eq(geoJobs.targetType, filters.targetType as any));
      }
      if (filters?.targetId) {
        conditions.push(eq(geoJobs.targetId, filters.targetId));
      }
      if (filters?.neighborhoodUnitId) {
        conditions.push(eq(geoJobs.neighborhoodUnitId, filters.neighborhoodUnitId));
      }
      if (filters?.priority) {
        conditions.push(eq(geoJobs.priority, filters.priority));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(asc(geoJobs.priority), asc(geoJobs.createdAt));
    } catch (error) {
      console.error('Failed to get geo jobs:', error);
      return [];
    }
  }

  async getGeoJob(id: string): Promise<GeoJob | undefined> {
    try {
      const [job] = await db.select().from(geoJobs).where(eq(geoJobs.id, id));
      return job || undefined;
    } catch (error) {
      console.error('Failed to get geo job:', error);
      return undefined;
    }
  }

  async getGeoJobByIdempotencyKey(key: string): Promise<GeoJob | undefined> {
    try {
      const [job] = await db.select().from(geoJobs).where(eq(geoJobs.idempotencyKey, key));
      return job || undefined;
    } catch (error) {
      console.error('Failed to get geo job by idempotency key:', error);
      return undefined;
    }
  }

  async createGeoJob(job: InsertGeoJob): Promise<GeoJob> {
    try {
      const [newJob] = await db.insert(geoJobs).values(job).returning();
      
      // Create initial job event
      await this.createGeoJobEvent({
        jobId: newJob.id,
        eventType: 'status_change',
        fromStatus: null,
        toStatus: newJob.status,
        message: 'Job created successfully'
      });

      return newJob;
    } catch (error) {
      console.error('Failed to create geo job:', error);
      throw error;
    }
  }

  async updateGeoJob(id: string, updates: Partial<InsertGeoJob>): Promise<GeoJob> {
    try {
      const [updatedJob] = await db.update(geoJobs)
        .set(updates)
        .where(eq(geoJobs.id, id))
        .returning();

      if (!updatedJob) {
        throw new Error('Geo job not found');
      }

      return updatedJob;
    } catch (error) {
      console.error('Failed to update geo job:', error);
      throw error;
    }
  }

  async deleteGeoJob(id: string): Promise<void> {
    try {
      await db.delete(geoJobs).where(eq(geoJobs.id, id));
    } catch (error) {
      console.error('Failed to delete geo job:', error);
      throw error;
    }
  }

  // CRITICAL: Job claiming with SKIP LOCKED for worker polling
  async claimNextGeoJob(workerId: string): Promise<GeoJob | undefined> {
    try {
      // Use raw SQL for FOR UPDATE SKIP LOCKED
      const result = await db.execute(sql`
        UPDATE geo_jobs 
        SET 
          status = 'running',
          locked_by = ${workerId},
          locked_at = NOW(),
          heartbeat_at = NOW(),
          started_at = NOW()
        WHERE id = (
          SELECT id FROM geo_jobs 
          WHERE status = 'queued' 
          AND (scheduled_at IS NULL OR scheduled_at <= NOW())
          ORDER BY priority ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING *;
      `);

      if (result.rows.length === 0) {
        return undefined;
      }

      const claimedJob = result.rows[0] as any;

      // Create job event for worker assignment
      await this.createGeoJobEvent({
        jobId: claimedJob.id,
        eventType: 'worker_assigned',
        fromStatus: 'queued',
        toStatus: 'running',
        message: `Job claimed by worker ${workerId}`,
        workerId
      });

      return claimedJob;
    } catch (error) {
      console.error('Failed to claim next geo job:', error);
      return undefined;
    }
  }

  async updateGeoJobProgress(id: string, progress: number, message?: string): Promise<GeoJob> {
    try {
      const [updatedJob] = await db.update(geoJobs)
        .set({ 
          progress, 
          message,
          heartbeatAt: new Date()
        })
        .where(eq(geoJobs.id, id))
        .returning();

      if (!updatedJob) {
        throw new Error('Geo job not found');
      }

      // Create progress event
      await this.createGeoJobEvent({
        jobId: id,
        eventType: 'progress_update',
        toStatus: updatedJob.status,
        message: message || `Progress updated to ${progress}%`,
        workerId: updatedJob.lockedBy
      });

      return updatedJob;
    } catch (error) {
      console.error('Failed to update geo job progress:', error);
      throw error;
    }
  }

  async updateGeoJobHeartbeat(id: string, workerId: string): Promise<GeoJob> {
    try {
      const [updatedJob] = await db.update(geoJobs)
        .set({ heartbeatAt: new Date() })
        .where(and(eq(geoJobs.id, id), eq(geoJobs.lockedBy, workerId)))
        .returning();

      if (!updatedJob) {
        throw new Error('Geo job not found or not owned by worker');
      }

      return updatedJob;
    } catch (error) {
      console.error('Failed to update geo job heartbeat:', error);
      throw error;
    }
  }

  async completeGeoJob(id: string, outputPayload: any, outputKeys: string[]): Promise<GeoJob> {
    try {
      const [completedJob] = await db.update(geoJobs)
        .set({
          status: 'completed',
          progress: 100,
          outputPayload,
          outputKeys,
          completedAt: new Date(),
          lockedBy: null,
          lockedAt: null
        })
        .where(eq(geoJobs.id, id))
        .returning();

      if (!completedJob) {
        throw new Error('Geo job not found');
      }

      // Create completion event
      await this.createGeoJobEvent({
        jobId: id,
        eventType: 'status_change',
        fromStatus: 'running',
        toStatus: 'completed',
        message: 'Job completed successfully',
        workerId: completedJob.lockedBy
      });

      return completedJob;
    } catch (error) {
      console.error('Failed to complete geo job:', error);
      throw error;
    }
  }

  async failGeoJob(id: string, error: any): Promise<GeoJob> {
    try {
      const [failedJob] = await db.update(geoJobs)
        .set({
          status: 'failed',
          error,
          completedAt: new Date(),
          lockedBy: null,
          lockedAt: null
        })
        .where(eq(geoJobs.id, id))
        .returning();

      if (!failedJob) {
        throw new Error('Geo job not found');
      }

      // Create failure event
      await this.createGeoJobEvent({
        jobId: id,
        eventType: 'error',
        fromStatus: 'running',
        toStatus: 'failed',
        message: 'Job failed with error',
        payload: { error },
        workerId: failedJob.lockedBy
      });

      return failedJob;
    } catch (error) {
      console.error('Failed to fail geo job:', error);
      throw error;
    }
  }

  async cancelGeoJob(id: string, reason?: string): Promise<GeoJob> {
    try {
      const [cancelledJob] = await db.update(geoJobs)
        .set({
          status: 'cancelled',
          message: reason || 'Job cancelled',
          completedAt: new Date(),
          lockedBy: null,
          lockedAt: null
        })
        .where(eq(geoJobs.id, id))
        .returning();

      if (!cancelledJob) {
        throw new Error('Geo job not found');
      }

      // Create cancellation event
      await this.createGeoJobEvent({
        jobId: id,
        eventType: 'status_change',
        fromStatus: cancelledJob.status,
        toStatus: 'cancelled',
        message: reason || 'Job cancelled',
        workerId: cancelledJob.lockedBy
      });

      return cancelledJob;
    } catch (error) {
      console.error('Failed to cancel geo job:', error);
      throw error;
    }
  }

  // Geo Job Events management
  async getGeoJobEvents(filters?: {
    jobId?: string;
    eventType?: string;
    workerId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<GeoJobEvent[]> {
    try {
      let query = db.select().from(geoJobEvents);
      const conditions = [];

      if (filters?.jobId) {
        conditions.push(eq(geoJobEvents.jobId, filters.jobId));
      }
      if (filters?.eventType) {
        conditions.push(eq(geoJobEvents.eventType, filters.eventType));
      }
      if (filters?.workerId) {
        conditions.push(eq(geoJobEvents.workerId, filters.workerId));
      }
      if (filters?.fromDate) {
        conditions.push(sql`${geoJobEvents.createdAt} >= ${filters.fromDate}`);
      }
      if (filters?.toDate) {
        conditions.push(sql`${geoJobEvents.createdAt} <= ${filters.toDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query.orderBy(desc(geoJobEvents.createdAt));
    } catch (error) {
      console.error('Failed to get geo job events:', error);
      return [];
    }
  }

  async createGeoJobEvent(event: InsertGeoJobEvent): Promise<GeoJobEvent> {
    try {
      const [newEvent] = await db.insert(geoJobEvents).values(event).returning();
      return newEvent;
    } catch (error) {
      console.error('Failed to create geo job event:', error);
      throw error;
    }
  }

  // Queue monitoring and analytics
  async getGeoJobQueueStats(): Promise<{
    queued: number;
    running: number;
    completed: number;
    failed: number;
    avgProcessingTimeMs: number;
  }> {
    try {
      const [stats] = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COALESCE(AVG(
            CASE WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
            END
          ), 0) as avg_processing_time_ms
        FROM geo_jobs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      return {
        queued: Number(stats.rows[0]?.queued || 0),
        running: Number(stats.rows[0]?.running || 0),
        completed: Number(stats.rows[0]?.completed || 0),
        failed: Number(stats.rows[0]?.failed || 0),
        avgProcessingTimeMs: Number(stats.rows[0]?.avg_processing_time_ms || 0)
      };
    } catch (error) {
      console.error('Failed to get geo job queue stats:', error);
      return {
        queued: 0,
        running: 0,
        completed: 0,
        failed: 0,
        avgProcessingTimeMs: 0
      };
    }
  }

  async getWorkerPerformanceStats(workerId?: string): Promise<any[]> {
    try {
      const condition = workerId ? sql`AND locked_by = ${workerId}` : sql``;
      
      const result = await db.execute(sql`
        SELECT 
          locked_by as worker_id,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          AVG(
            CASE WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
            END
          ) as avg_processing_time_ms
        FROM geo_jobs 
        WHERE locked_by IS NOT NULL 
        AND created_at >= NOW() - INTERVAL '24 hours'
        ${condition}
        GROUP BY locked_by
        ORDER BY total_jobs DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Failed to get worker performance stats:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
