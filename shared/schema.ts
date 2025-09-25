import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal, uuid, index, uniqueIndex, pgEnum, smallint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and Authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  nationalId: text("national_id").unique(),
  phoneNumber: text("phone_number"),
  role: text("role").notNull().default("citizen"), // citizen, employee, manager, admin
  departmentId: uuid("department_id"),
  positionId: uuid("position_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Organizational Structure
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  parentDepartmentId: uuid("parent_department_id"),
  headOfDepartmentId: uuid("head_of_department_id"),
  organizationalLevel: integer("organizational_level").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  description: text("description"),
  departmentId: uuid("department_id"),
  level: integer("level").default(1),
  permissions: jsonb("permissions"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// User Geographic Assignments - LBAC Foundation
export const userGeographicAssignments = pgTable("user_geographic_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  // Geographic scope - can assign at any level
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "cascade" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" }),
  // Assignment metadata
  assignmentType: text("assignment_type").notNull().default("permanent"), // permanent, temporary, emergency
  startDate: timestamp("start_date").default(sql`CURRENT_TIMESTAMP`),
  endDate: timestamp("end_date"), // null for permanent assignments
  assignedById: uuid("assigned_by_id")
    .references(() => users.id),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // CRITICAL LBAC CONSTRAINT: Ensure only one geographic level per assignment
  oneGeographicLevelOnly: sql`CONSTRAINT one_geographic_level_only CHECK (
    (CASE WHEN governorate_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN sub_district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN neighborhood_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )`,
  // Temporal validity constraint: startDate must be before endDate
  temporalValidityCheck: sql`CONSTRAINT temporal_validity_check CHECK (
    end_date IS NULL OR start_date < end_date
  )`,
  // Active assignments must have started
  activeAssignmentCheck: sql`CONSTRAINT active_assignment_check CHECK (
    NOT is_active OR start_date <= CURRENT_TIMESTAMP
  )`
}));

// =============================================
// ENHANCED LBAC HARDENING TABLES - Phase 6
// =============================================

// Geographic Assignment History - Audit Trail for LBAC Changes
export const userGeographicAssignmentHistory = pgTable("user_geographic_assignment_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalAssignmentId: uuid("original_assignment_id")
    .references(() => userGeographicAssignments.id, { onDelete: "set null" }),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  // Geographic scope snapshot
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "set null" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "set null" }),
  // Change tracking metadata
  changeType: text("change_type").notNull(), // created, updated, deleted, suspended, reactivated
  changeReason: text("change_reason"), // administrative, emergency, promotion, transfer
  previousValues: jsonb("previous_values"), // snapshot of previous state
  newValues: jsonb("new_values"), // snapshot of new state
  changedById: uuid("changed_by_id")
    .references(() => users.id)
    .notNull(),
  changeDate: timestamp("change_date").default(sql`CURRENT_TIMESTAMP`),
  effectiveDate: timestamp("effective_date"),
  approvalRequired: boolean("approval_required").default(false),
  approvedById: uuid("approved_by_id")
    .references(() => users.id),
  approvalDate: timestamp("approval_date"),
  notes: text("notes"),
  systemGenerated: boolean("system_generated").default(false),
});

// Permission-Geographic Constraints - Link specific permissions to geographic scopes
export const permissionGeographicConstraints = pgTable("permission_geographic_constraints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  permissionId: uuid("permission_id")
    .references(() => permissions.id, { onDelete: "cascade" })
    .notNull(),
  // Geographic constraint level
  constraintLevel: text("constraint_level").notNull(), // governorate, district, subDistrict, neighborhood, block, plot
  // Specific geographic areas where this permission applies
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "cascade" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" }),
  blockId: uuid("block_id")
    .references(() => blocks.id, { onDelete: "cascade" }),
  plotId: uuid("plot_id")
    .references(() => plots.id, { onDelete: "cascade" }),
  // Constraint metadata
  constraintType: text("constraint_type").notNull().default("inclusive"), // inclusive, exclusive
  priority: integer("priority").default(100), // Lower numbers = higher priority
  conditions: jsonb("conditions"), // Additional conditions for permission activation
  isActive: boolean("is_active").default(true),
  createdById: uuid("created_by_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Ensure only one geographic level per constraint
  oneGeographicConstraintLevel: sql`CONSTRAINT one_geographic_constraint_level CHECK (
    (CASE WHEN governorate_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN sub_district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN neighborhood_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN block_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN plot_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )`,
  // CRITICAL: Ensure constraintLevel matches the actual non-null geographic column
  constraintLevelMatches: sql`CONSTRAINT constraint_level_matches CHECK (
    (constraint_level = 'governorate' AND governorate_id IS NOT NULL) OR
    (constraint_level = 'district' AND district_id IS NOT NULL) OR
    (constraint_level = 'subDistrict' AND sub_district_id IS NOT NULL) OR
    (constraint_level = 'neighborhood' AND neighborhood_id IS NOT NULL) OR
    (constraint_level = 'block' AND block_id IS NOT NULL) OR
    (constraint_level = 'plot' AND plot_id IS NOT NULL)
  )`
}));

// Temporary Permission Delegation - For emergency/temporary access
export const temporaryPermissionDelegations = pgTable("temporary_permission_delegations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  toUserId: uuid("to_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  // Geographic scope of delegation
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "cascade" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" }),
  // Delegation metadata
  delegationType: text("delegation_type").notNull(), // emergency, vacation, temporary_assignment, training
  // Specific permissions moved to junction table: temporaryPermissionDelegationPermissions
  delegateAllPermissions: boolean("delegate_all_permissions").default(false),
  // Time constraints
  startDate: timestamp("start_date").default(sql`CURRENT_TIMESTAMP`),
  endDate: timestamp("end_date").notNull(),
  maxUsageCount: integer("max_usage_count"), // Optional usage limit
  currentUsageCount: integer("current_usage_count").default(0),
  // Authorization
  reason: text("reason").notNull(),
  authorizedById: uuid("authorized_by_id")
    .references(() => users.id),
  approvalRequired: boolean("approval_required").default(true),
  approvedById: uuid("approved_by_id")
    .references(() => users.id),
  approvalDate: timestamp("approval_date"),
  // Status tracking
  status: text("status").default("pending"), // pending, active, expired, revoked, used_up
  isActive: boolean("is_active").default(false),
  revokedById: uuid("revoked_by_id")
    .references(() => users.id),
  revokedDate: timestamp("revoked_date"),
  revokeReason: text("revoke_reason"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Ensure only one geographic level per delegation
  oneGeographicDelegationLevel: sql`CONSTRAINT one_geographic_delegation_level CHECK (
    (CASE WHEN governorate_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN sub_district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN neighborhood_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )`,
  // End date must be after start date
  validDelegationPeriod: sql`CONSTRAINT valid_delegation_period CHECK (
    start_date < end_date
  )`,
  // Can't delegate to yourself
  noDelegationToSelf: sql`CONSTRAINT no_delegation_to_self CHECK (
    from_user_id != to_user_id
  )`,
  // CRITICAL: Status and isActive consistency validation
  statusActiveConsistency: sql`CONSTRAINT status_active_consistency CHECK (
    (status = 'active' AND is_active = true) OR
    (status IN ('pending', 'expired', 'revoked', 'used_up') AND is_active = false)
  )`,
  // Approval logic validation
  approvalLogicConsistency: sql`CONSTRAINT approval_logic_consistency CHECK (
    (approval_required = true AND (approved_by_id IS NOT NULL OR status != 'active')) OR
    (approval_required = false)
  )`,
  // Usage count validation
  usageCountValidation: sql`CONSTRAINT usage_count_validation CHECK (
    current_usage_count >= 0 AND
    (max_usage_count IS NULL OR current_usage_count <= max_usage_count) AND
    (status != 'used_up' OR (max_usage_count IS NOT NULL AND current_usage_count >= max_usage_count))
  )`
}));

// Geographic-Based Role Templates - Location-specific role assignments
export const geographicRoleTemplates = pgTable("geographic_role_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: text("template_name").notNull(),
  templateNameEn: text("template_name_en"),
  description: text("description"),
  // Geographic scope for this template
  geographicLevel: text("geographic_level").notNull(), // governorate, district, subDistrict, neighborhood
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "cascade" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" }),
  // Role and permission configuration moved to junction tables:
  // - geographicRoleTemplateRoles for role assignments
  // - geographicRoleTemplatePermissions for additional/excluded permissions
  // Template metadata
  templateType: text("template_type").notNull(), // standard, emergency, temporary, training
  autoAssign: boolean("auto_assign").default(false), // Auto-assign to users in this geographic area
  requiresApproval: boolean("requires_approval").default(true),
  maxActiveUsers: integer("max_active_users"), // Optional limit on concurrent users
  currentActiveUsers: integer("current_active_users").default(0),
  // Validity constraints
  validFrom: timestamp("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  createdById: uuid("created_by_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Ensure only one geographic level per template
  oneGeographicTemplateLevel: sql`CONSTRAINT one_geographic_template_level CHECK (
    (CASE WHEN governorate_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN sub_district_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN neighborhood_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )`,
  // Valid until must be after valid from if specified
  validTemplateActivityPeriod: sql`CONSTRAINT valid_template_activity_period CHECK (
    valid_until IS NULL OR valid_from < valid_until
  )`
}));

// =============================================
// LBAC JUNCTION TABLES - Proper Foreign Key Relationships
// =============================================

// Junction table for geographic role templates and roles
export const geographicRoleTemplateRoles = pgTable("geographic_role_template_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id")
    .references(() => geographicRoleTemplates.id, { onDelete: "cascade" })
    .notNull(),
  roleId: uuid("role_id")
    .references(() => roles.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Prevent duplicate role assignments
  uniqueTemplateRole: sql`CONSTRAINT unique_template_role UNIQUE (template_id, role_id)`
}));

// Junction table for geographic role templates and additional permissions
export const geographicRoleTemplatePermissions = pgTable("geographic_role_template_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id")
    .references(() => geographicRoleTemplates.id, { onDelete: "cascade" })
    .notNull(),
  permissionId: uuid("permission_id")
    .references(() => permissions.id, { onDelete: "cascade" })
    .notNull(),
  permissionType: text("permission_type").notNull().default("additional"), // additional, excluded
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Prevent duplicate permission assignments
  uniqueTemplatePermission: sql`CONSTRAINT unique_template_permission UNIQUE (template_id, permission_id, permission_type)`,
  // Valid permission types
  validPermissionType: sql`CONSTRAINT valid_permission_type CHECK (
    permission_type IN ('additional', 'excluded')
  )`
}));

// Junction table for temporary permission delegations
export const temporaryPermissionDelegationPermissions = pgTable("temporary_permission_delegation_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  delegationId: uuid("delegation_id")
    .references(() => temporaryPermissionDelegations.id, { onDelete: "cascade" })
    .notNull(),
  permissionId: uuid("permission_id")
    .references(() => permissions.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Prevent duplicate permission delegations
  uniqueDelegationPermission: sql`CONSTRAINT unique_delegation_permission UNIQUE (delegation_id, permission_id)`
}));

// LBAC Access Audit Log - Track all location-based access attempts
export const lbacAccessAuditLog = pgTable("lbac_access_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  // Access attempt details
  accessType: text("access_type").notNull(), // read, write, delete, admin
  resourceType: text("resource_type").notNull(), // application, plot, block, neighborhood, etc.
  resourceId: uuid("resource_id"), // ID of the accessed resource
  // Geographic context
  targetGovernorateId: uuid("target_governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  targetDistrictId: uuid("target_district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  targetSubDistrictId: uuid("target_sub_district_id")
    .references(() => subDistricts.id, { onDelete: "set null" }),
  targetNeighborhoodId: uuid("target_neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "set null" }),
  // Access outcome
  accessGranted: boolean("access_granted").notNull(),
  denialReason: text("denial_reason"), // insufficient_permissions, geographic_constraint, temporal_constraint, etc.
  // Request details
  requestMethod: text("request_method"), // GET, POST, PUT, DELETE
  requestPath: text("request_path"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  // Processing details
  processingTimeMs: integer("processing_time_ms"),
  cacheHit: boolean("cache_hit"),
  // Additional context
  delegationUsed: boolean("delegation_used").default(false),
  delegationId: uuid("delegation_id")
    .references(() => temporaryPermissionDelegations.id),
  additionalContext: jsonb("additional_context"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Legal Framework
export const lawsRegulations = pgTable("laws_regulations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  type: text("type").notNull(), // law, regulation, directive, guide
  issueDate: text("issue_date"),
  effectiveDate: text("effective_date"),
  description: text("description"),
  status: text("status").default("active"), // active, inactive, draft
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const lawSections = pgTable("law_sections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  lawId: uuid("law_id").notNull(),
  parentSectionId: uuid("parent_section_id"),
  title: text("title").notNull(),
  orderIndex: integer("order_index").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const lawArticles = pgTable("law_articles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: uuid("section_id").notNull(),
  articleNumber: text("article_number").notNull(),
  articleText: text("article_text").notNull(),
  keywords: text("keywords"),
  penalties: text("penalties"),
  conditions: jsonb("conditions"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Technical Requirements
export const requirementCategories = pgTable("requirement_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  orderIndex: integer("order_index").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const requirements = pgTable("requirements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  specifications: jsonb("specifications"),
  minimumStandards: jsonb("minimum_standards"),
  relatedLawArticleId: uuid("related_law_article_id"),
  isConditional: boolean("is_conditional").default(false),
  conditions: jsonb("conditions"),
  priority: text("priority").default("medium"), // high, medium, low
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Services and Applications
export const services = pgTable("services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  type: text("type").notNull(), // building_license, surveying_decision, inspection, etc.
  category: text("category"),
  processingTimeEstimate: integer("processing_time_estimate"), // in days
  fees: decimal("fees", { precision: 10, scale: 2 }),
  requiredDocuments: jsonb("required_documents"),
  workflow: jsonb("workflow"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const serviceRequirements = pgTable("service_requirements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id").notNull(),
  requirementId: uuid("requirement_id").notNull(),
  isOptional: boolean("is_optional").default(false),
  conditions: jsonb("conditions"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Applications and Permits
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationNumber: text("application_number").notNull().unique(),
  serviceId: uuid("service_id").notNull(),
  applicantId: uuid("applicant_id").notNull(),
  governorateId: uuid("governorate_id").references(() => governorates.id),
  districtId: uuid("district_id").references(() => districts.id),
  status: text("status").default("draft"), // draft, submitted, under_review, approved, rejected, completed
  currentStage: text("current_stage"),
  applicationData: jsonb("application_data"),
  documents: jsonb("documents"),
  assignedToId: uuid("assigned_to_id"),
  reviewNotes: text("review_notes"),
  approvalDate: timestamp("approval_date"),
  completionDate: timestamp("completion_date"),
  fees: decimal("fees", { precision: 10, scale: 2 }),
  isPaid: boolean("is_paid").default(false),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Surveying Decisions - Enhanced for Phase 1
export const surveyingDecisions = pgTable("surveying_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  decisionNumber: text("decision_number").notNull().unique(),
  
  // ✅ PHASE 1: Enhanced Applicant Information
  applicantName: text("applicant_name").notNull(),
  applicantId: text("applicant_id").notNull(),
  identityType: text("identity_type").notNull().default("national_id"), // national_id, passport, residence_card
  contactPhone: text("contact_phone").notNull(),
  email: text("email"),
  applicantRole: text("applicant_role").notNull().default("self"), // self, agent, delegate
  principalName: text("principal_name"), // For agent/delegate cases
  principalId: text("principal_id"), // For agent/delegate cases
  
  // ✅ PHASE 1: Enhanced Geographic Hierarchy 
  governorate: text("governorate").notNull(),
  governorateCode: text("governorate_code"),
  district: text("district").notNull(),
  subDistrict: text("sub_district"), // العزلة
  sector: text("sector"), // القطاع 
  neighborhoodUnit: text("neighborhood_unit"), // وحدة الجوار
  area: text("area"),
  landNumber: text("land_number").notNull(),
  plotNumber: text("plot_number"),
  coordinates: text("coordinates"),
  plotLocation: jsonb("plot_location"), // coordinates, address details - legacy
  plotArea: decimal("plot_area", { precision: 10, scale: 2 }),
  boundaries: jsonb("boundaries"),
  
  // ✅ PHASE 1: Enhanced Decision Types & Building Classification
  surveyType: text("survey_type").notNull(),
  buildingType: text("building_type"), // residential, commercial, industrial
  residentialType: text("residential_type"), // private, model, etc.
  purpose: text("purpose").notNull(),
  description: text("description"),
  engineerName: text("engineer_name"), // For old licenses
  engineerLicense: text("engineer_license"), // For old licenses
  
  // ✅ PHASE 1: Enhanced Ownership & Document Management
  locationName: text("location_name"), // اسم الموضع
  documentType: text("document_type").notNull(),
  documentArea: decimal("document_area", { precision: 10, scale: 2 }), // المساحة بحسب الوثيقة
  documentStatus: text("document_status").notNull().default("certified"), // certified, tax_paid, court_certified
  ownershipClassification: text("ownership_classification").notNull().default("free"), // free, waqf
  applicationMode: text("application_mode").notNull().default("office"), // office, portal
  attachments: jsonb("attachments"), // Enhanced multiple documents support
  
  // Existing fields (preserved)
  surveyorId: uuid("surveyor_id"),
  surveyDate: timestamp("survey_date"),
  shapeFileData: jsonb("shape_file_data"),
  buildingRegulations: jsonb("building_regulations"), // setbacks, allowed floors, etc.
  restrictions: jsonb("restrictions"),
  status: text("status").default("pending"), // pending, in_progress, completed, approved
  approvedById: uuid("approved_by_id"),
  approvalDate: timestamp("approval_date"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ✅ PHASE 1: Applicant Registry for Smart Search
export const applicantRegistry = pgTable("applicant_registry", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantName: text("applicant_name").notNull(),
  applicantId: text("applicant_id").notNull().unique(), // National ID, Passport, etc.
  identityType: text("identity_type").notNull().default("national_id"),
  contactPhone: text("contact_phone").notNull(),
  email: text("email"),
  lastUsed: timestamp("last_used").default(sql`CURRENT_TIMESTAMP`),
  usageCount: integer("usage_count").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Index for fast lookup
  phoneIndex: index("applicant_registry_phone_idx").on(table.contactPhone),
  lastUsedIndex: index("applicant_registry_last_used_idx").on(table.lastUsed),
}));

// Tasks and Workflow
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  applicationId: uuid("application_id"),
  assignedToId: uuid("assigned_to_id").notNull(),
  assignedById: uuid("assigned_by_id"),
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  result: jsonb("result"), // Task completion results: findings, recommendations, attachments, data
  notes: text("notes"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Service Categories and Enhanced Service Management
export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  icon: text("icon"),
  color: text("color").default("#3b82f6"),
  targetAudience: text("target_audience").array(), // ["individuals", "companies", "organizations"]
  orderIndex: integer("order_index").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const serviceAttachments = pgTable("service_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  fileType: text("file_type"), // pdf, image, document
  isRequired: boolean("is_required").default(true),
  maxFileSize: integer("max_file_size"), // in bytes
  orderIndex: integer("order_index").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const applicationAttachments = pgTable("application_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  serviceAttachmentId: uuid("service_attachment_id"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
  status: text("status").default("uploaded"), // uploaded, verified, rejected
  notes: text("notes"),
});

export const paymentInvoices = pgTable("payment_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, paid, cancelled, expired
  items: jsonb("items").notNull(), // invoice line items
  paymentMethod: text("payment_method"), // cash, bank_transfer, card
  receiptNumber: text("receipt_number"),
  cashierNotes: text("cashier_notes"),
  issuedAt: timestamp("issued_at").default(sql`CURRENT_TIMESTAMP`),
  paidAt: timestamp("paid_at"),
  qrCode: text("qr_code"),
});

// Service Automation System
export const serviceTemplates = pgTable("service_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  category: text("category").notNull(), // government, municipal, educational, health
  subcategory: text("subcategory"),
  templateType: text("template_type").notNull(), // form, workflow, complete_service
  templateData: jsonb("template_data").notNull(),
  icon: text("icon"),
  tags: text("tags").array(),
  version: text("version").default("1.0"),
  isPublic: boolean("is_public").default(true),
  usageCount: integer("usage_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  createdById: uuid("created_by_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const formFields = pgTable("form_fields", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldType: text("field_type").notNull(), // text, number, date, select, file, map, signature
  label: text("label").notNull(),
  labelEn: text("label_en"),
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  validation: jsonb("validation"), // rules, messages
  options: jsonb("options"), // for select fields
  properties: jsonb("properties"), // styling, layout
  isRequired: boolean("is_required").default(false),
  isVisible: boolean("is_visible").default(true),
  orderIndex: integer("order_index").default(1),
});

export const dynamicForms = pgTable("dynamic_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id"),
  name: text("name").notNull(),
  description: text("description"),
  formSchema: jsonb("form_schema").notNull(),
  validationRules: jsonb("validation_rules"),
  uiConfig: jsonb("ui_config"),
  isActive: boolean("is_active").default(true),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id"),
  name: text("name").notNull(),
  description: text("description"),
  workflowData: jsonb("workflow_data").notNull(), // BPMN 2.0 compatible
  stages: jsonb("stages").notNull(),
  transitions: jsonb("transitions").notNull(),
  businessRules: jsonb("business_rules"),
  isActive: boolean("is_active").default(true),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const workflowInstances = pgTable("workflow_instances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowDefinitionId: uuid("workflow_definition_id").notNull(),
  applicationId: uuid("application_id").notNull(),
  currentStage: text("current_stage").notNull(),
  status: text("status").default("active"), // active, completed, cancelled, suspended
  stageHistory: jsonb("stage_history").default(sql`'[]'`),
  variables: jsonb("variables"),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const organizationStructures = pgTable("organization_structures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  structureType: text("structure_type").notNull(), // ministry, municipality, university, hospital
  hierarchyLevels: jsonb("hierarchy_levels").notNull(),
  roleDefinitions: jsonb("role_definitions").notNull(),
  permissionMatrix: jsonb("permission_matrix").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const serviceBuilder = pgTable("service_builder", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id"),
  builderData: jsonb("builder_data").notNull(),
  formConfig: jsonb("form_config"),
  workflowConfig: jsonb("workflow_config"),
  organizationConfig: jsonb("organization_config"),
  publicationStatus: text("publication_status").default("draft"), // draft, published, archived
  builderId: uuid("builder_id"),
  lastModifiedById: uuid("last_modified_by_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(), // dashboard, analytics, compliance, performance
  dataSource: jsonb("data_source").notNull(),
  chartConfig: jsonb("chart_config"),
  filterConfig: jsonb("filter_config"),
  scheduleConfig: jsonb("schedule_config"),
  recipients: jsonb("recipients"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, approve, reject
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  userId: uuid("user_id"),
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`),
});

// System Configuration
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  category: text("category"),
  isPublic: boolean("is_public").default(false),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Geographic Data
export const governorates = pgTable("governorates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // YE11, YE12, etc.
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry data
  properties: jsonb("properties"), // Additional properties from GeoJSON
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Districts table - linked to governorates
export const districts = pgTable("districts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" })
    .notNull(),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Sub-districts table (النواحي) - child of districts  
export const subDistricts = pgTable("sub_districts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "cascade" })
    .notNull(),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Neighborhoods table (الأحياء) - child of sub_districts
export const neighborhoods = pgTable("neighborhoods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(), 
  nameEn: text("name_en"),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" })
    .notNull(),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Harat table (الحارات) - child of neighborhoods
export const harat = pgTable("harat", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" })
    .notNull(),
  geometry: jsonb("geometry"), 
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Sectors table (القطاعات التخطيطية) - child of sub-districts
export const sectors = pgTable("sectors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "cascade" })
    .notNull(),
  sectorType: text("sector_type").default("planning"), // planning, administrative, economic
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true), 
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Neighborhood Units table (الوحدات السكنية) - child of neighborhoods or sectors
export const neighborhoodUnits = pgTable("neighborhood_units", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"), 
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "cascade" }),
  sectorId: uuid("sector_id")
    .references(() => sectors.id, { onDelete: "cascade" }),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Blocks table (القطع) - child of neighborhood_units
export const blocks = pgTable("blocks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").unique(), // فريد للنظام الجديد
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  neighborhoodUnitId: uuid("neighborhood_unit_id")
    .references(() => neighborhoodUnits.id, { onDelete: "cascade" })
    .notNull(),
  blockType: text("block_type").default("residential"), // residential, commercial, mixed, industrial
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Staging table للبلوكات - لتحسين الأداء المكاني
export const blocksStage = pgTable("blocks_stage", (columns) => ({
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: text("source_id").notNull(), // من ملف GeoJSON
  unitHint: text("unit_hint"), // unique_unit_id من الملف إن وجد  
  blockType: text("block_type"),
  properties: jsonb("properties"),
  geometry: jsonb("geometry"), // هندسة GeoJSON الأصلية
  neighborhoodUnitId: uuid("neighborhood_unit_id"), // سيملأ بالربط المكاني
  finalCode: text("final_code"), // الكود النهائي المولد
  spatialStrategy: text("spatial_strategy"), // intersection/centroid/nearest
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}));

// جدول مرحلي لتسريع الاستعلامات على وحدات الجوار
export const neighborhoodUnitsGeom = pgTable("neighborhood_units_geom", (columns) => ({
  id: uuid("id").primaryKey(),
  code: text("code"),
  nameAr: text("name_ar"),
  geometry: jsonb("geometry"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}));

// Plots table (قطع الأراضي) - child of blocks - CRITICAL FOR CONSTRUCTION!
export const plots = pgTable("plots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  blockId: uuid("block_id")
    .references(() => blocks.id, { onDelete: "cascade" })
    .notNull(),
  plotNumber: text("plot_number").notNull(), // رقم القطعة الرسمي
  area: decimal("area", { precision: 12, scale: 2 }), // المساحة بالمتر المربع
  plotType: text("plot_type").default("residential"), // residential, commercial, industrial, public
  ownershipType: text("ownership_type").default("private"), // private, public, mixed
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Streets table (الشوارع) - can be linked to multiple administrative levels
export const streets = pgTable("streets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  streetType: text("street_type").default("local"), // main, secondary, local, alley
  width: decimal("width", { precision: 8, scale: 2 }), // عرض الشارع بالمتر
  length: decimal("length", { precision: 12, scale: 2 }), // طول الشارع بالمتر
  surfaceType: text("surface_type").default("asphalt"), // asphalt, concrete, gravel, dirt
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Street Segments table (أجزاء الشوارع) - child of streets
export const streetSegments = pgTable("street_segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  streetId: uuid("street_id")
    .references(() => streets.id, { onDelete: "cascade" })
    .notNull(),
  segmentNumber: integer("segment_number").notNull(),
  startPoint: jsonb("start_point"), // نقطة البداية
  endPoint: jsonb("end_point"), // نقطة النهاية
  length: decimal("length", { precision: 10, scale: 2 }), // طول الجزء
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [users.positionId],
    references: [positions.id],
  }),
  applications: many(applications),
  assignedTasks: many(tasks),
  notifications: many(notifications),
  assignments: many(applicationAssignments),
  reviews: many(applicationReviews),
  geographicAssignments: many(userGeographicAssignments),
}));

export const userGeographicAssignmentsRelations = relations(userGeographicAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userGeographicAssignments.userId],
    references: [users.id],
  }),
  governorate: one(governorates, {
    fields: [userGeographicAssignments.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [userGeographicAssignments.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [userGeographicAssignments.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [userGeographicAssignments.neighborhoodId],
    references: [neighborhoods.id],
  }),
  assignedBy: one(users, {
    fields: [userGeographicAssignments.assignedById],
    references: [users.id],
  }),
}));

// ========================================
// ENHANCED LBAC HARDENING RELATIONS - Phase 6
// ========================================

export const userGeographicAssignmentHistoryRelations = relations(userGeographicAssignmentHistory, ({ one }) => ({
  originalAssignment: one(userGeographicAssignments, {
    fields: [userGeographicAssignmentHistory.originalAssignmentId],
    references: [userGeographicAssignments.id],
  }),
  user: one(users, {
    fields: [userGeographicAssignmentHistory.userId],
    references: [users.id],
  }),
  governorate: one(governorates, {
    fields: [userGeographicAssignmentHistory.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [userGeographicAssignmentHistory.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [userGeographicAssignmentHistory.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [userGeographicAssignmentHistory.neighborhoodId],
    references: [neighborhoods.id],
  }),
  changedBy: one(users, {
    fields: [userGeographicAssignmentHistory.changedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [userGeographicAssignmentHistory.approvedById],
    references: [users.id],
  }),
}));

export const permissionGeographicConstraintsRelations = relations(permissionGeographicConstraints, ({ one }) => ({
  permission: one(permissions, {
    fields: [permissionGeographicConstraints.permissionId],
    references: [permissions.id],
  }),
  governorate: one(governorates, {
    fields: [permissionGeographicConstraints.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [permissionGeographicConstraints.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [permissionGeographicConstraints.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [permissionGeographicConstraints.neighborhoodId],
    references: [neighborhoods.id],
  }),
  block: one(blocks, {
    fields: [permissionGeographicConstraints.blockId],
    references: [blocks.id],
  }),
  plot: one(plots, {
    fields: [permissionGeographicConstraints.plotId],
    references: [plots.id],
  }),
  createdBy: one(users, {
    fields: [permissionGeographicConstraints.createdById],
    references: [users.id],
  }),
}));

export const temporaryPermissionDelegationsRelations = relations(temporaryPermissionDelegations, ({ one }) => ({
  fromUser: one(users, {
    fields: [temporaryPermissionDelegations.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [temporaryPermissionDelegations.toUserId],
    references: [users.id],
  }),
  governorate: one(governorates, {
    fields: [temporaryPermissionDelegations.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [temporaryPermissionDelegations.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [temporaryPermissionDelegations.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [temporaryPermissionDelegations.neighborhoodId],
    references: [neighborhoods.id],
  }),
  authorizedBy: one(users, {
    fields: [temporaryPermissionDelegations.authorizedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [temporaryPermissionDelegations.approvedById],
    references: [users.id],
  }),
  revokedBy: one(users, {
    fields: [temporaryPermissionDelegations.revokedById],
    references: [users.id],
  }),
}));

export const geographicRoleTemplatesRelations = relations(geographicRoleTemplates, ({ one }) => ({
  governorate: one(governorates, {
    fields: [geographicRoleTemplates.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [geographicRoleTemplates.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [geographicRoleTemplates.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [geographicRoleTemplates.neighborhoodId],
    references: [neighborhoods.id],
  }),
  createdBy: one(users, {
    fields: [geographicRoleTemplates.createdById],
    references: [users.id],
  }),
}));

export const lbacAccessAuditLogRelations = relations(lbacAccessAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [lbacAccessAuditLog.userId],
    references: [users.id],
  }),
  targetGovernorate: one(governorates, {
    fields: [lbacAccessAuditLog.targetGovernorateId],
    references: [governorates.id],
  }),
  targetDistrict: one(districts, {
    fields: [lbacAccessAuditLog.targetDistrictId],
    references: [districts.id],
  }),
  targetSubDistrict: one(subDistricts, {
    fields: [lbacAccessAuditLog.targetSubDistrictId],
    references: [subDistricts.id],
  }),
  targetNeighborhood: one(neighborhoods, {
    fields: [lbacAccessAuditLog.targetNeighborhoodId],
    references: [neighborhoods.id],
  }),
  delegation: one(temporaryPermissionDelegations, {
    fields: [lbacAccessAuditLog.delegationId],
    references: [temporaryPermissionDelegations.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parentDepartment: one(departments, {
    fields: [departments.parentDepartmentId],
    references: [departments.id],
  }),
  childDepartments: many(departments),
  headOfDepartment: one(users, {
    fields: [departments.headOfDepartmentId],
    references: [users.id],
  }),
  employees: many(users),
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  department: one(departments, {
    fields: [positions.departmentId],
    references: [departments.id],
  }),
  employees: many(users),
}));

export const lawsRegulationsRelations = relations(lawsRegulations, ({ many }) => ({
  sections: many(lawSections),
}));

export const lawSectionsRelations = relations(lawSections, ({ one, many }) => ({
  law: one(lawsRegulations, {
    fields: [lawSections.lawId],
    references: [lawsRegulations.id],
  }),
  parentSection: one(lawSections, {
    fields: [lawSections.parentSectionId],
    references: [lawSections.id],
  }),
  childSections: many(lawSections),
  articles: many(lawArticles),
}));

export const lawArticlesRelations = relations(lawArticles, ({ one }) => ({
  section: one(lawSections, {
    fields: [lawArticles.sectionId],
    references: [lawSections.id],
  }),
}));

export const requirementCategoriesRelations = relations(requirementCategories, ({ many }) => ({
  requirements: many(requirements),
}));

export const requirementsRelations = relations(requirements, ({ one, many }) => ({
  category: one(requirementCategories, {
    fields: [requirements.categoryId],
    references: [requirementCategories.id],
  }),
  relatedLawArticle: one(lawArticles, {
    fields: [requirements.relatedLawArticleId],
    references: [lawArticles.id],
  }),
  serviceRequirements: many(serviceRequirements),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  applications: many(applications),
  serviceRequirements: many(serviceRequirements),
  category: one(serviceCategories, {
    fields: [services.category],
    references: [serviceCategories.id],
  }),
  attachments: many(serviceAttachments),
  dynamicForm: one(dynamicForms),
  workflowDefinition: one(workflowDefinitions),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const serviceAttachmentsRelations = relations(serviceAttachments, ({ one, many }) => ({
  service: one(services, {
    fields: [serviceAttachments.serviceId],
    references: [services.id],
  }),
  applicationAttachments: many(applicationAttachments),
}));

export const applicationAttachmentsRelations = relations(applicationAttachments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationAttachments.applicationId],
    references: [applications.id],
  }),
  serviceAttachment: one(serviceAttachments, {
    fields: [applicationAttachments.serviceAttachmentId],
    references: [serviceAttachments.id],
  }),
}));

export const paymentInvoicesRelations = relations(paymentInvoices, ({ one }) => ({
  application: one(applications, {
    fields: [paymentInvoices.applicationId],
    references: [applications.id],
  }),
}));

export const serviceRequirementsRelations = relations(serviceRequirements, ({ one }) => ({
  service: one(services, {
    fields: [serviceRequirements.serviceId],
    references: [services.id],
  }),
  requirement: one(requirements, {
    fields: [serviceRequirements.requirementId],
    references: [requirements.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  service: one(services, {
    fields: [applications.serviceId],
    references: [services.id],
  }),
  applicant: one(users, {
    fields: [applications.applicantId],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [applications.assignedToId],
    references: [users.id],
  }),
  surveyingDecision: one(surveyingDecisions),
  tasks: many(tasks),
  statusHistory: many(applicationStatusHistory),
  assignments: many(applicationAssignments),
  reviews: many(applicationReviews),
  attachments: many(applicationAttachments),
  paymentInvoices: many(paymentInvoices),
}));

export const surveyingDecisionsRelations = relations(surveyingDecisions, ({ one }) => ({
  application: one(applications, {
    fields: [surveyingDecisions.applicationId],
    references: [applications.id],
  }),
  surveyor: one(users, {
    fields: [surveyingDecisions.surveyorId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [surveyingDecisions.approvedById],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  application: one(applications, {
    fields: [tasks.applicationId],
    references: [applications.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [tasks.assignedById],
    references: [users.id],
  }),
}));

// Service Automation Relations
export const serviceTemplatesRelations = relations(serviceTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [serviceTemplates.createdById],
    references: [users.id],
  }),
  services: many(services),
}));

export const dynamicFormsRelations = relations(dynamicForms, ({ one }) => ({
  service: one(services, {
    fields: [dynamicForms.serviceId],
    references: [services.id],
  }),
}));

export const workflowDefinitionsRelations = relations(workflowDefinitions, ({ one, many }) => ({
  service: one(services, {
    fields: [workflowDefinitions.serviceId],
    references: [services.id],
  }),
  instances: many(workflowInstances),
}));

export const workflowInstancesRelations = relations(workflowInstances, ({ one }) => ({
  workflowDefinition: one(workflowDefinitions, {
    fields: [workflowInstances.workflowDefinitionId],
    references: [workflowDefinitions.id],
  }),
  application: one(applications, {
    fields: [workflowInstances.applicationId],
    references: [applications.id],
  }),
}));

export const serviceBuilderRelations = relations(serviceBuilder, ({ one }) => ({
  service: one(services, {
    fields: [serviceBuilder.serviceId],
    references: [services.id],
  }),
  builder: one(users, {
    fields: [serviceBuilder.builderId],
    references: [users.id],
  }),
  lastModifiedBy: one(users, {
    fields: [serviceBuilder.lastModifiedById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
});

export const insertUserGeographicAssignmentSchema = createInsertSchema(userGeographicAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UserGeographicAssignment = typeof userGeographicAssignments.$inferSelect;
export type InsertUserGeographicAssignment = z.infer<typeof insertUserGeographicAssignmentSchema>;

export const insertLawRegulationSchema = createInsertSchema(lawsRegulations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLawSectionSchema = createInsertSchema(lawSections).omit({
  id: true,
  createdAt: true,
});

export const insertLawArticleSchema = createInsertSchema(lawArticles).omit({
  id: true,
  createdAt: true,
});

export const insertRequirementCategorySchema = createInsertSchema(requirementCategories).omit({
  id: true,
  createdAt: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  applicationNumber: true,
  createdAt: true,
  updatedAt: true,
});


export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// New Service Management Insert Schemas
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
  createdAt: true,
});

export const insertServiceAttachmentSchema = createInsertSchema(serviceAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationAttachmentSchema = createInsertSchema(applicationAttachments).omit({
  id: true,
  uploadedAt: true,
});

export const insertPaymentInvoiceSchema = createInsertSchema(paymentInvoices).omit({
  id: true,
  invoiceNumber: true,
  issuedAt: true,
});

// Service Automation Insert Schemas
export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  usageCount: true,
  rating: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
});

export const insertDynamicFormSchema = createInsertSchema(dynamicForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
});

export const insertOrganizationStructureSchema = createInsertSchema(organizationStructures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceBuilderSchema = createInsertSchema(serviceBuilder).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type LawRegulation = typeof lawsRegulations.$inferSelect;
export type InsertLawRegulation = z.infer<typeof insertLawRegulationSchema>;

export type LawSection = typeof lawSections.$inferSelect;
export type InsertLawSection = z.infer<typeof insertLawSectionSchema>;

export type LawArticle = typeof lawArticles.$inferSelect;
export type InsertLawArticle = z.infer<typeof insertLawArticleSchema>;

export type RequirementCategory = typeof requirementCategories.$inferSelect;
export type InsertRequirementCategory = z.infer<typeof insertRequirementCategorySchema>;

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ServiceRequirement = typeof serviceRequirements.$inferSelect;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type SurveyingDecision = typeof surveyingDecisions.$inferSelect;
export type InsertSurveyingDecision = typeof surveyingDecisions.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Service Automation Types
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;

export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;

export type DynamicForm = typeof dynamicForms.$inferSelect;
export type InsertDynamicForm = z.infer<typeof insertDynamicFormSchema>;

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;

export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;

export type OrganizationStructure = typeof organizationStructures.$inferSelect;
export type InsertOrganizationStructure = z.infer<typeof insertOrganizationStructureSchema>;

export type ServiceBuilder = typeof serviceBuilder.$inferSelect;
export type InsertServiceBuilder = z.infer<typeof insertServiceBuilderSchema>;

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// New Service Management Types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;

export type ServiceAttachment = typeof serviceAttachments.$inferSelect;
export type InsertServiceAttachment = z.infer<typeof insertServiceAttachmentSchema>;

export type ApplicationAttachment = typeof applicationAttachments.$inferSelect;
export type InsertApplicationAttachment = z.infer<typeof insertApplicationAttachmentSchema>;

export type PaymentInvoice = typeof paymentInvoices.$inferSelect;
export type InsertPaymentInvoice = z.infer<typeof insertPaymentInvoiceSchema>;

// Extended Service Types for Service Builder
export interface ServiceBuilderConfig {
  basicInfo: {
    name: string;
    nameEn?: string;
    description: string;
    category: string;
    subcategory?: string;
    icon?: string;
    estimatedTime: number;
    fees?: number;
  };
  formConfig: {
    fields: FormFieldConfig[];
    layout: FormLayoutConfig;
    validation: FormValidationConfig;
  };
  workflowConfig: {
    stages: WorkflowStageConfig[];
    transitions: WorkflowTransitionConfig[];
    rules: BusinessRuleConfig[];
  };
  organizationConfig: {
    departments: string[];
    roles: string[];
    permissions: PermissionConfig[];
  };
}

export interface FormFieldConfig {
  id: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'datetime' | 
        'select' | 'radio' | 'checkbox' | 'file' | 'image' | 'signature' | 
        'map' | 'barcode' | 'qr' | 'textarea' | 'url' | 'password';
  label: string;
  labelEn?: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  visible: boolean;
  readonly?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customRule?: string;
    errorMessage?: string;
  };
  options?: Array<{
    value: string;
    label: string;
    labelEn?: string;
  }>;
  layout?: {
    width: number;
    order: number;
    section?: string;
  };
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

export interface FormLayoutConfig {
  columns: number;
  sections: Array<{
    id: string;
    title: string;
    titleEn?: string;
    description?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
  }>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    spacing: 'compact' | 'normal' | 'spacious';
  };
}

export interface FormValidationConfig {
  validateOnSubmit: boolean;
  validateOnBlur: boolean;
  showErrorSummary: boolean;
  customValidators: Array<{
    name: string;
    script: string;
    errorMessage: string;
  }>;
}

export interface WorkflowStageConfig {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  type: 'start' | 'user_task' | 'service_task' | 'decision' | 'parallel' | 'end';
  assignee?: {
    type: 'role' | 'department' | 'specific_user' | 'dynamic';
    value: string;
    rule?: string;
  };
  formFields?: string[];
  timeLimits?: {
    expected: number;
    maximum: number;
    unit: 'hours' | 'days' | 'weeks';
  };
  notifications?: {
    onEntry: boolean;
    onOverdue: boolean;
    recipients: string[];
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface WorkflowTransitionConfig {
  id: string;
  from: string;
  to: string;
  condition?: {
    field?: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'always';
    value?: any;
  };
  actions?: Array<{
    type: 'send_notification' | 'update_field' | 'call_service' | 'generate_document';
    config: any;
  }>;
}

export interface BusinessRuleConfig {
  id: string;
  name: string;
  description?: string;
  trigger: 'on_submit' | 'on_field_change' | 'on_stage_enter' | 'on_stage_exit';
  condition: string;
  actions: Array<{
    type: 'set_field_value' | 'show_hide_field' | 'validate_field' | 'calculate_fee' | 'route_to_stage';
    target: string;
    value: any;
  }>;
}

export interface PermissionConfig {
  action: string;
  roles: string[];
  departments?: string[];
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

// Workflow Status Tracking
export const applicationStatusHistory = pgTable("application_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  previousStage: text("previous_stage"),
  newStage: text("new_stage"),
  changedById: uuid("changed_by_id"),
  notes: text("notes"),
  reasonCode: text("reason_code"), // approval_code, rejection_reason, etc.
  attachments: jsonb("attachments"),
  changedAt: timestamp("changed_at").default(sql`CURRENT_TIMESTAMP`),
});

// Notifications System
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // info, warning, success, error, reminder
  category: text("category").notNull(), // application_status, task_assignment, deadline, payment
  relatedEntityType: text("related_entity_type"), // application, task, payment
  relatedEntityId: uuid("related_entity_id"),
  actionUrl: text("action_url"),
  priority: text("priority").default("medium"), // high, medium, low
  isRead: boolean("is_read").default(false),
  isActionRequired: boolean("is_action_required").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  readAt: timestamp("read_at"),
});

// Application Assignment and Distribution
export const applicationAssignments = pgTable("application_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  assignedToId: uuid("assigned_to_id").notNull(),
  assignedById: uuid("assigned_by_id").notNull(),
  assignmentType: text("assignment_type").notNull(), // primary_reviewer, secondary_reviewer, specialist, approver
  departmentId: uuid("department_id"),
  stage: text("stage").notNull(), // initial_review, technical_review, legal_review, final_approval
  priority: text("priority").default("medium"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending"), // pending, in_progress, completed, reassigned
  notes: text("notes"),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
});

// Application Reviews and Comments
export const applicationReviews = pgTable("application_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  reviewerId: uuid("reviewer_id").notNull(),
  stage: text("stage").notNull(),
  reviewType: text("review_type").notNull(), // initial, technical, legal, final
  decision: text("decision").notNull(), // approve, reject, request_changes, need_info
  comments: text("comments"),
  reviewData: jsonb("review_data"), // stage-specific review details
  attachments: jsonb("attachments"),
  isRequired: boolean("is_required").default(true),
  reviewedAt: timestamp("reviewed_at").default(sql`CURRENT_TIMESTAMP`),
});

// Appointments System
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  assignedToId: uuid("assigned_to_id").notNull(), // المهندس المكلف
  scheduledById: uuid("scheduled_by_id").notNull(), // مساعد رئيس القسم
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(), // "09:00 AM"
  contactPhone: text("contact_phone"),
  contactNotes: text("contact_notes"),
  location: text("location"),
  status: text("status").default("scheduled"), // scheduled, confirmed, cancelled, completed, rescheduled
  confirmationStatus: text("confirmation_status").default("pending"), // pending, confirmed, failed
  reminderSent: boolean("reminder_sent").default(false),
  citizenConfirmed: boolean("citizen_confirmed").default(false),
  engineerConfirmed: boolean("engineer_confirmed").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Contact Attempts System
export const contactAttempts = pgTable("contact_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  appointmentId: uuid("appointment_id"),
  attemptedById: uuid("attempted_by_id").notNull(), // من قام بمحاولة التواصل
  contactMethod: text("contact_method").notNull(), // phone, sms, email
  contactDetails: text("contact_details"), // رقم الهاتف أو البريد
  attemptResult: text("attempt_result").notNull(), // success, no_answer, busy, invalid_number, citizen_unavailable
  notes: text("notes"),
  nextAttemptDate: timestamp("next_attempt_date"),
  attemptCount: integer("attempt_count").default(1),
  isSuccessful: boolean("is_successful").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Survey Assignment Forms (for printable assignment documents)
export const surveyAssignmentForms = pgTable("survey_assignment_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  appointmentId: uuid("appointment_id"),
  assignedToId: uuid("assigned_to_id").notNull(),
  formData: jsonb("form_data").notNull(), // البيانات الكاملة للنموذج
  geoReferenceData: jsonb("geo_reference_data"), // بيانات المرجع الجغرافي
  mapData: jsonb("map_data"), // بيانات الخريطة والموقع
  qrCode: text("qr_code"),
  printedAt: timestamp("printed_at"),
  signedAt: timestamp("signed_at"),
  supervisorSignature: text("supervisor_signature"),
  status: text("status").default("draft"), // draft, printed, signed, completed
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations for new tables
export const applicationStatusHistoryRelations = relations(applicationStatusHistory, ({ one }) => ({
  application: one(applications, {
    fields: [applicationStatusHistory.applicationId],
    references: [applications.id],
  }),
  changedBy: one(users, {
    fields: [applicationStatusHistory.changedById],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  application: one(applications, {
    fields: [appointments.applicationId],
    references: [applications.id],
  }),
  assignedTo: one(users, {
    fields: [appointments.assignedToId],
    references: [users.id],
  }),
  scheduledBy: one(users, {
    fields: [appointments.scheduledById],
    references: [users.id],
  }),
}));

export const contactAttemptsRelations = relations(contactAttempts, ({ one }) => ({
  application: one(applications, {
    fields: [contactAttempts.applicationId],
    references: [applications.id],
  }),
  appointment: one(appointments, {
    fields: [contactAttempts.appointmentId],
    references: [appointments.id],
  }),
  attemptedBy: one(users, {
    fields: [contactAttempts.attemptedById],
    references: [users.id],
  }),
}));

export const surveyAssignmentFormsRelations = relations(surveyAssignmentForms, ({ one }) => ({
  application: one(applications, {
    fields: [surveyAssignmentForms.applicationId],
    references: [applications.id],
  }),
  appointment: one(appointments, {
    fields: [surveyAssignmentForms.appointmentId],
    references: [appointments.id],
  }),
  assignedTo: one(users, {
    fields: [surveyAssignmentForms.assignedToId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const applicationAssignmentsRelations = relations(applicationAssignments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationAssignments.applicationId],
    references: [applications.id],
  }),
  assignedTo: one(users, {
    fields: [applicationAssignments.assignedToId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [applicationAssignments.assignedById],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [applicationAssignments.departmentId],
    references: [departments.id],
  }),
}));

export const applicationReviewsRelations = relations(applicationReviews, ({ one }) => ({
  application: one(applications, {
    fields: [applicationReviews.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [applicationReviews.reviewerId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true, 
  readAt: true 
});

export const insertApplicationStatusHistorySchema = createInsertSchema(applicationStatusHistory).omit({ 
  id: true, 
  changedAt: true 
});

export const insertApplicationAssignmentSchema = createInsertSchema(applicationAssignments).omit({ 
  id: true, 
  assignedAt: true, 
  completedAt: true 
});

export const insertApplicationReviewSchema = createInsertSchema(applicationReviews).omit({ 
  id: true, 
  reviewedAt: true 
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertContactAttemptSchema = createInsertSchema(contactAttempts).omit({
  id: true,
  createdAt: true
});

export const insertSurveyAssignmentFormSchema = createInsertSchema(surveyAssignmentForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ApplicationStatusHistory = typeof applicationStatusHistory.$inferSelect;
export type InsertApplicationStatusHistory = z.infer<typeof insertApplicationStatusHistorySchema>;

export type ApplicationAssignment = typeof applicationAssignments.$inferSelect;
export type InsertApplicationAssignment = z.infer<typeof insertApplicationAssignmentSchema>;

export type ApplicationReview = typeof applicationReviews.$inferSelect;
export type InsertApplicationReview = z.infer<typeof insertApplicationReviewSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type ContactAttempt = typeof contactAttempts.$inferSelect;
export type InsertContactAttempt = z.infer<typeof insertContactAttemptSchema>;

export type SurveyAssignmentForm = typeof surveyAssignmentForms.$inferSelect;
export type InsertSurveyAssignmentForm = z.infer<typeof insertSurveyAssignmentFormSchema>;

// Field Visits (tracking engineer field work)
export const fieldVisits = pgTable("field_visits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").notNull(),
  applicationId: uuid("application_id").notNull(),
  engineerId: uuid("engineer_id").notNull(),
  visitDate: timestamp("visit_date").notNull(),
  visitTime: text("visit_time"),
  status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled, rescheduled
  arrivalTime: timestamp("arrival_time"),
  departureTime: timestamp("departure_time"),
  gpsLocation: jsonb("gps_location"), // latitude, longitude
  weatherConditions: text("weather_conditions"),
  accessIssues: text("access_issues"),
  equipmentUsed: jsonb("equipment_used"), // قائمة المعدات المستخدمة
  visitNotes: text("visit_notes"),
  requiresFollowUp: boolean("requires_follow_up").default(false),
  followUpReason: text("follow_up_reason"),
  citizenPresent: boolean("citizen_present").default(false),
  citizenSignature: text("citizen_signature"),
  witnessInfo: jsonb("witness_info"), // معلومات الشهود إن وجدوا
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Survey Results (actual survey measurements and findings)
export const surveyResults = pgTable("survey_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldVisitId: uuid("field_visit_id").notNull(),
  applicationId: uuid("application_id").notNull(),
  engineerId: uuid("engineer_id").notNull(),
  landArea: decimal("land_area", { precision: 10, scale: 2 }), // المساحة بالمتر المربع
  boundaries: jsonb("boundaries"), // إحداثيات الحدود
  measurements: jsonb("measurements"), // القياسات التفصيلية
  landmarks: jsonb("landmarks"), // المعالم المرجعية
  neighboringProperties: jsonb("neighboring_properties"), // العقارات المجاورة
  accessRoads: jsonb("access_roads"), // الطرق المؤدية للأرض
  utilities: jsonb("utilities"), // المرافق (كهرباء، ماء، صرف)
  elevationData: jsonb("elevation_data"), // بيانات الارتفاع
  soilType: text("soil_type"),
  topography: text("topography"), // طبوغرافية الأرض
  existingStructures: jsonb("existing_structures"), // المباني الموجودة
  violations: jsonb("violations"), // المخالفات إن وجدت
  recommendations: text("recommendations"),
  surveyMethod: text("survey_method"), // طريقة المساحة المستخدمة
  accuracyLevel: text("accuracy_level"), // مستوى دقة المساحة
  referencePoints: jsonb("reference_points"), // النقاط المرجعية
  mapSheet: text("map_sheet"), // رقم اللوحة المساحية
  coordinateSystem: text("coordinate_system"), // نظام الإحداثيات المستخدم
  completionStatus: text("completion_status").default("in_progress"), // in_progress, completed, needs_revision
  qualityCheckStatus: text("quality_check_status").default("pending"), // pending, approved, rejected
  reviewNotes: text("review_notes"),
  approvedAt: timestamp("approved_at"),
  approvedById: uuid("approved_by_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Survey Reports (reports, documents, and media files)
export const surveyReports = pgTable("survey_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyResultId: uuid("survey_result_id").notNull(),
  fieldVisitId: uuid("field_visit_id").notNull(),
  applicationId: uuid("application_id").notNull(),
  engineerId: uuid("engineer_id").notNull(),
  reportType: text("report_type").notNull(), // technical_report, photo_documentation, sketch_map, measurements_sheet
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path"), // مسار الملف المرفوع
  fileType: text("file_type"), // pdf, jpg, png, dwg, etc.
  fileSize: integer("file_size"), // حجم الملف بالبايت
  thumbnailPath: text("thumbnail_path"), // مسار الصورة المصغرة
  coordinates: jsonb("coordinates"), // إحداثيات التقاط الصورة/المستند
  captureTimestamp: timestamp("capture_timestamp"),
  deviceInfo: jsonb("device_info"), // معلومات الجهاز المستخدم
  tags: jsonb("tags"), // علامات للتصنيف والبحث
  isPublic: boolean("is_public").default(false), // هل يمكن للمواطن رؤيته
  requiresApproval: boolean("requires_approval").default(true),
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  approvedById: uuid("approved_by_id"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  version: integer("version").default(1), // إصدار المستند
  parentReportId: uuid("parent_report_id"), // للمراجعات والتحديثات
  metadata: jsonb("metadata"), // بيانات إضافية
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations for new tables
export const fieldVisitsRelations = relations(fieldVisits, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [fieldVisits.appointmentId],
    references: [appointments.id],
  }),
  application: one(applications, {
    fields: [fieldVisits.applicationId],
    references: [applications.id],
  }),
  engineer: one(users, {
    fields: [fieldVisits.engineerId],
    references: [users.id],
  }),
  surveyResults: many(surveyResults),
  surveyReports: many(surveyReports),
}));

export const surveyResultsRelations = relations(surveyResults, ({ one, many }) => ({
  fieldVisit: one(fieldVisits, {
    fields: [surveyResults.fieldVisitId],
    references: [fieldVisits.id],
  }),
  application: one(applications, {
    fields: [surveyResults.applicationId],
    references: [applications.id],
  }),
  engineer: one(users, {
    fields: [surveyResults.engineerId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [surveyResults.approvedById],
    references: [users.id],
  }),
  surveyReports: many(surveyReports),
}));

export const surveyReportsRelations = relations(surveyReports, ({ one }) => ({
  surveyResult: one(surveyResults, {
    fields: [surveyReports.surveyResultId],
    references: [surveyResults.id],
  }),
  fieldVisit: one(fieldVisits, {
    fields: [surveyReports.fieldVisitId],
    references: [fieldVisits.id],
  }),
  application: one(applications, {
    fields: [surveyReports.applicationId],
    references: [applications.id],
  }),
  engineer: one(users, {
    fields: [surveyReports.engineerId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [surveyReports.approvedById],
    references: [users.id],
  }),
  parentReport: one(surveyReports, {
    fields: [surveyReports.parentReportId],
    references: [surveyReports.id],
  }),
}));

// Geographic Relations
export const governoratesRelations = relations(governorates, ({ many }) => ({
  districts: many(districts),
  sectors: many(sectors),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  governorate: one(governorates, {
    fields: [districts.governorateId],
    references: [governorates.id],
  }),
  subDistricts: many(subDistricts),
}));

export const subDistrictsRelations = relations(subDistricts, ({ one, many }) => ({
  district: one(districts, {
    fields: [subDistricts.districtId],
    references: [districts.id],
  }),
  neighborhoods: many(neighborhoods),
  sectors: many(sectors),
}));

export const neighborhoodsRelations = relations(neighborhoods, ({ one, many }) => ({
  subDistrict: one(subDistricts, {
    fields: [neighborhoods.subDistrictId],
    references: [subDistricts.id],
  }),
  harat: many(harat),
  neighborhoodUnits: many(neighborhoodUnits),
}));

export const haratRelations = relations(harat, ({ one }) => ({
  neighborhood: one(neighborhoods, {
    fields: [harat.neighborhoodId],
    references: [neighborhoods.id],
  }),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  subDistrict: one(subDistricts, {
    fields: [sectors.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhoodUnits: many(neighborhoodUnits),
}));

export const neighborhoodUnitsRelations = relations(neighborhoodUnits, ({ one, many }) => ({
  neighborhood: one(neighborhoods, {
    fields: [neighborhoodUnits.neighborhoodId],
    references: [neighborhoods.id],
  }),
  sector: one(sectors, {
    fields: [neighborhoodUnits.sectorId],
    references: [sectors.id],
  }),
  blocks: many(blocks),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  neighborhoodUnit: one(neighborhoodUnits, {
    fields: [blocks.neighborhoodUnitId],
    references: [neighborhoodUnits.id],
  }),
  plots: many(plots),
}));

export const plotsRelations = relations(plots, ({ one }) => ({
  block: one(blocks, {
    fields: [plots.blockId],
    references: [blocks.id],
  }),
}));

export const streetsRelations = relations(streets, ({ many }) => ({
  streetSegments: many(streetSegments),
}));

export const streetSegmentsRelations = relations(streetSegments, ({ one }) => ({
  street: one(streets, {
    fields: [streetSegments.streetId],
    references: [streets.id],
  }),
}));

// Insert Schemas for new tables
export const insertFieldVisitSchema = createInsertSchema(fieldVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSurveyResultSchema = createInsertSchema(surveyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true
});

export const insertSurveyReportSchema = createInsertSchema(surveyReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true
});

export const insertGovernorateSchema = createInsertSchema(governorates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type Governorate = typeof governorates.$inferSelect;
export type InsertGovernorate = z.infer<typeof insertGovernorateSchema>;

export type FieldVisit = typeof fieldVisits.$inferSelect;
export type InsertFieldVisit = z.infer<typeof insertFieldVisitSchema>;

export type SurveyResult = typeof surveyResults.$inferSelect;
export type InsertSurveyResult = z.infer<typeof insertSurveyResultSchema>;

export type SurveyReport = typeof surveyReports.$inferSelect;
export type InsertSurveyReport = z.infer<typeof insertSurveyReportSchema>;

// Districts schemas
export const insertDistrictSchema = createInsertSchema(districts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type District = typeof districts.$inferSelect;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;

// Sub-districts schemas
export const insertSubDistrictSchema = createInsertSchema(subDistricts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SubDistrict = typeof subDistricts.$inferSelect;
export type InsertSubDistrict = z.infer<typeof insertSubDistrictSchema>;

// Neighborhoods schemas
export const insertNeighborhoodSchema = createInsertSchema(neighborhoods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = z.infer<typeof insertNeighborhoodSchema>;

// Harat schemas
export const insertHaratSchema = createInsertSchema(harat).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Harat = typeof harat.$inferSelect;
export type InsertHarat = z.infer<typeof insertHaratSchema>;

// Sectors schemas
export const insertSectorSchema = createInsertSchema(sectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = z.infer<typeof insertSectorSchema>;

// Neighborhood Units schemas
export const insertNeighborhoodUnitSchema = createInsertSchema(neighborhoodUnits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    const hasNeighborhood = !!data.neighborhoodId;
    const hasSector = !!data.sectorId;
    return hasNeighborhood !== hasSector; // Exactly one must be true (XOR)
  },
  {
    message: "يجب تحديد حي أو قطاع واحد فقط، وليس كلاهما معاً",
    path: ["neighborhoodId", "sectorId"],
  }
);

export type NeighborhoodUnit = typeof neighborhoodUnits.$inferSelect;
export type InsertNeighborhoodUnit = z.infer<typeof insertNeighborhoodUnitSchema>;

// Blocks schemas
export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

// Staging table schemas
export const insertBlockStageSchema = createInsertSchema(blocksStage).omit({
  id: true,
  createdAt: true,
});

export type BlockStage = typeof blocksStage.$inferSelect;
export type InsertBlockStage = z.infer<typeof insertBlockStageSchema>;

export const insertNeighborhoodUnitGeomSchema = createInsertSchema(neighborhoodUnitsGeom).omit({
  createdAt: true,
});

export type NeighborhoodUnitGeom = typeof neighborhoodUnitsGeom.$inferSelect;
export type InsertNeighborhoodUnitGeom = z.infer<typeof insertNeighborhoodUnitGeomSchema>;

// Plots schemas - CRITICAL FOR CONSTRUCTION INDUSTRY!
export const insertPlotSchema = createInsertSchema(plots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Plot = typeof plots.$inferSelect;
export type InsertPlot = z.infer<typeof insertPlotSchema>;

// Streets schemas
export const insertStreetSchema = createInsertSchema(streets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Street = typeof streets.$inferSelect;
export type InsertStreet = z.infer<typeof insertStreetSchema>;

// Street Segments schemas
export const insertStreetSegmentSchema = createInsertSchema(streetSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StreetSegment = typeof streetSegments.$inferSelect;
export type InsertStreetSegment = z.infer<typeof insertStreetSegmentSchema>;

// ===========================================
// MOBILE SYNC & OFFLINE OPERATIONS TABLES
// ===========================================

// Device Registrations table (تسجيل الأجهزة المحمولة) - للمساحين والمهندسين في الميدان
export const deviceRegistrations = pgTable("device_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(), // unique device identifier
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceName: text("device_name").notNull(), // user-friendly device name
  deviceType: text("device_type").default("mobile"), // mobile, tablet, desktop
  platform: text("platform").notNull(), // android, ios, web
  appVersion: text("app_version").notNull(),
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  properties: jsonb("properties"), // device-specific metadata
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Sync Sessions table (جلسات المزامنة) - لتتبع عمليات المزامنة بين الأجهزة والمنصة
export const syncSessions = pgTable("sync_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: uuid("device_id")
    .references(() => deviceRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionType: text("session_type").notNull(), // pull, push, full_sync
  status: text("status").default("in_progress"), // in_progress, completed, failed, cancelled
  startTime: timestamp("start_time").default(sql`CURRENT_TIMESTAMP`).notNull(),
  endTime: timestamp("end_time"),
  totalOperations: integer("total_operations").default(0),
  successfulOperations: integer("successful_operations").default(0),
  failedOperations: integer("failed_operations").default(0),
  conflictOperations: integer("conflict_operations").default(0),
  lastSyncTimestamp: timestamp("last_sync_timestamp"), // للـ differential sync
  errorLog: jsonb("error_log"), // تفاصيل الأخطاء
  metadata: jsonb("metadata"), // معلومات إضافية عن الجلسة
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Offline Operations table (العمليات دون اتصال) - لحفظ التغييرات المحلية قبل المزامنة
export const offlineOperations = pgTable("offline_operations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: uuid("device_id")
    .references(() => deviceRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  operationType: text("operation_type").notNull(), // create, update, delete
  tableName: text("table_name").notNull(), // الجدول المتأثر
  recordId: text("record_id").notNull(), // ID الخاص بالسجل
  operationData: jsonb("operation_data").notNull(), // بيانات العملية
  timestamp: timestamp("timestamp").notNull(), // وقت العملية
  syncStatus: text("sync_status").default("pending"), // pending, synced, conflict, failed
  conflictResolution: text("conflict_resolution"), // معالجة التعارض
  errorMessage: text("error_message"), // رسالة الخطأ
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Sync Conflicts table (تعارضات المزامنة) - لإدارة التعارضات بين البيانات المحلية والخادم
export const syncConflicts = pgTable("sync_conflicts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  syncSessionId: uuid("sync_session_id")
    .references(() => syncSessions.id, { onDelete: "cascade" })
    .notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  fieldName: text("field_name"), // الحقل المتعارض
  serverValue: jsonb("server_value"), // القيمة من الخادم
  clientValue: jsonb("client_value"), // القيمة من العميل
  conflictType: text("conflict_type").notNull(), // concurrent_update, deleted_on_server, validation_error
  resolutionStrategy: text("resolution_strategy"), // server_wins, client_wins, merge, manual
  resolvedValue: jsonb("resolved_value"), // القيمة بعد حل التعارض
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ===========================================
// MOBILE SYNC SCHEMAS & TYPES
// ===========================================

// Device Registrations schemas
export const insertDeviceRegistrationSchema = createInsertSchema(deviceRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeviceRegistration = typeof deviceRegistrations.$inferSelect;
export type InsertDeviceRegistration = z.infer<typeof insertDeviceRegistrationSchema>;

// Sync Sessions schemas
export const insertSyncSessionSchema = createInsertSchema(syncSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SyncSession = typeof syncSessions.$inferSelect;
export type InsertSyncSession = z.infer<typeof insertSyncSessionSchema>;

// Offline Operations schemas
export const insertOfflineOperationSchema = createInsertSchema(offlineOperations).omit({
  id: true,
  createdAt: true,
});

export type OfflineOperation = typeof offlineOperations.$inferSelect;
export type InsertOfflineOperation = z.infer<typeof insertOfflineOperationSchema>;

// Sync Conflicts schemas
export const insertSyncConflictSchema = createInsertSchema(syncConflicts).omit({
  id: true,
  createdAt: true,
});

export type SyncConflict = typeof syncConflicts.$inferSelect;
export type InsertSyncConflict = z.infer<typeof insertSyncConflictSchema>;

// ===========================================
// FLEXIBLE RBAC SYSTEM - ADVANCED PERMISSION MANAGEMENT
// ===========================================

// Roles table - قاعدة الأدوار النظامية
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // admin, manager, engineer, employee, citizen
  nameAr: text("name_ar").notNull(), // اسم الدور بالعربية
  nameEn: text("name_en").notNull(), // اسم الدور بالإنجليزية
  description: text("description"), // وصف الدور ومسؤولياته
  level: integer("level").notNull().default(1), // مستوى الدور في الهرمية (1=highest)
  isSystemRole: boolean("is_system_role").default(false), // أدوار النظام الأساسية
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Permissions table - قاعدة الصلاحيات التفصيلية
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // users.create, applications.approve, etc.
  nameAr: text("name_ar").notNull(), // اسم الصلاحية بالعربية
  nameEn: text("name_en").notNull(), // اسم الصلاحية بالإنجليزية
  description: text("description"), // وصف الصلاحية
  category: text("category").notNull(), // users, applications, geographic, system
  resource: text("resource").notNull(), // users, applications, districts, etc.
  action: text("action").notNull(), // create, read, update, delete, approve, assign
  scope: text("scope").default("own"), // own, department, region, all
  isSystemPermission: boolean("is_system_permission").default(false), // صلاحيات النظام الأساسية
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // CONSTRAINTS for data integrity and consistency
  validAction: sql`CONSTRAINT valid_action CHECK (
    action IN ('create', 'read', 'update', 'delete', 'approve', 'assign', 'export', 'review')
  )`,
  validScope: sql`CONSTRAINT valid_scope CHECK (
    scope IN ('own', 'department', 'region', 'all')
  )`,
  validCategory: sql`CONSTRAINT valid_category CHECK (
    category IN ('users', 'applications', 'geographic', 'system', 'reports', 'tasks')
  )`,
}));

// Role-Permission mapping - ربط الأدوار بالصلاحيات
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: uuid("role_id")
    .references(() => roles.id, { onDelete: "cascade" })
    .notNull(),
  permissionId: uuid("permission_id")
    .references(() => permissions.id, { onDelete: "cascade" })
    .notNull(),
  grantedAt: timestamp("granted_at").default(sql`CURRENT_TIMESTAMP`),
  grantedBy: uuid("granted_by")
    .references(() => users.id),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  // منع التكرار في ربط الدور بنفس الصلاحية
  uniqueRolePermission: sql`CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)`,
}));

// User-Role mapping - ربط المستخدمين بالأدوار (many-to-many)
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  roleId: uuid("role_id")
    .references(() => roles.id, { onDelete: "cascade" })
    .notNull(),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
  assignedBy: uuid("assigned_by")
    .references(() => users.id),
  validFrom: timestamp("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validUntil: timestamp("valid_until"), // null = دائم
  isActive: boolean("is_active").default(true),
}, (table) => ({
  // منع تكرار نفس الدور للمستخدم الواحد (مؤقتاً)
  uniqueUserRole: sql`CONSTRAINT unique_user_role UNIQUE (user_id, role_id)`,
  // التأكد من صحة الفترة الزمنية
  validPeriodCheck: sql`CONSTRAINT valid_period_check CHECK (
    valid_until IS NULL OR valid_from < valid_until
  )`,
}));

// ===========================================
// SCHEMAS & TYPES FOR NEW RBAC SYSTEM
// ===========================================

// Roles schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// Permissions schemas
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// Role-Permission schemas
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  grantedAt: true,
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// User-Role schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

// ===========================================
// DELETE PROPAGATION & TOMBSTONE SYSTEM
// ===========================================

// Deletion Tombstones - تتبع الحذف للمزامنة التفاضلية
export const deletionTombstones = pgTable("deletion_tombstones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Deleted record identification
  tableName: text("table_name").notNull(), // اسم الجدول الذي حُذف منه السجل
  recordId: uuid("record_id").notNull(), // معرف السجل المحذوف
  // Deletion metadata
  deletedAt: timestamp("deleted_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedById: uuid("deleted_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  deletionReason: text("deletion_reason"), // سبب الحذف
  deletionType: text("deletion_type").notNull().default("soft"), // soft, hard, cascade
  // Original record data (for potential restoration)
  originalData: jsonb("original_data"), // البيانات الأصلية قبل الحذف
  recordHash: text("record_hash"), // hash للتحقق من سلامة البيانات
  // Sync metadata
  syncVersion: text("sync_version").notNull().default("1"), // إصدار للتزامن
  deviceId: text("device_id"), // الجهاز الذي قام بالحذف
  sessionId: uuid("session_id")
    .references(() => syncSessions.id, { onDelete: "set null" }),
  // Geographic context for LBAC
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  // Propagation status
  propagationStatus: text("propagation_status").notNull().default("pending"), // pending, propagated, failed
  propagatedAt: timestamp("propagated_at"),
  propagationAttempts: integer("propagation_attempts").default(0),
  maxPropagationAttempts: integer("max_propagation_attempts").default(3),
  // TTL for cleanup
  expiresAt: timestamp("expires_at"), // تاريخ انتهاء الصلاحية لحذف tombstone
  // Metadata
  deletionMetadata: jsonb("deletion_metadata"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Performance indexes for delete propagation
  tombstoneTableRecordIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_table_record ON deletion_tombstones (table_name, record_id)`,
  tombstoneDeletedAtIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_deleted_at ON deletion_tombstones (deleted_at, propagation_status)`,
  tombstoneSyncStatusIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_sync_status ON deletion_tombstones (sync_version, propagation_status)`,
  tombstoneDeviceIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_device ON deletion_tombstones (device_id, session_id)`,
  // PERFORMANCE: Additional indexes for delta sync tombstone queries
  tombstoneEntityTimestampIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_entity_time ON deletion_tombstones (table_name, deleted_at) WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP`,
  tombstoneGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_tombstone_geo ON deletion_tombstones (governorate_id, district_id, deleted_at)`,
  // Unique constraint to prevent duplicate tombstones
  uniqueTombstoneEntry: sql`CONSTRAINT unique_tombstone_entry UNIQUE (table_name, record_id, sync_version)`,
}));

// Change Tracking - تتبع الإصدارات للمزامنة المرتبة 
export const changeTracking = pgTable("change_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Record identification
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id").notNull(),
  // Monotonic versioning for strict ordering
  changeVersion: text("change_version").notNull(), // Monotonic version (e.g., "2025-001234567890")
  changeSequence: text("change_sequence").notNull(), // Global sequence number
  operationType: text("operation_type").notNull(), // insert, update, delete
  // Change metadata
  changedAt: timestamp("changed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  changedById: uuid("changed_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  changeSource: text("change_source").default("web_app"), // web_app, mobile_app, api, system
  // Data changes
  fieldChanges: jsonb("field_changes"), // { field: { old: value, new: value } }
  recordSnapshot: jsonb("record_snapshot"), // full record snapshot after change
  recordHash: text("record_hash"), // hash للتحقق من سلامة البيانات
  // Session tracking for idempotency  
  deviceId: text("device_id"),
  sessionId: uuid("session_id")
    .references(() => syncSessions.id, { onDelete: "set null" }),
  clientChangeId: text("client_change_id"), // Client-provided idempotency key
  // Geographic context for LBAC
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  // Sync status
  syncStatus: text("sync_status").notNull().default("pending"), // pending, synced, ignored
  syncedAt: timestamp("synced_at"),
  syncAttempts: integer("sync_attempts").default(0),
  // Metadata
  changeMetadata: jsonb("change_metadata"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Critical indexes for change tracking and sync
  changeTrackingVersionIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_version ON change_tracking (table_name, change_version, change_sequence)`,
  changeTrackingTimestampIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_timestamp ON change_tracking (table_name, changed_at, sync_status)`,
  changeTrackingSessionIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_session ON change_tracking (session_id, device_id, client_change_id)`,
  changeTrackingRecordIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_record ON change_tracking (table_name, record_id, changed_at)`,
  // PERFORMANCE: Additional composite indexes for delta sync queries
  changeTrackingEntityTimestampIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_entity_time ON change_tracking (table_name, changed_at) WHERE sync_status = 'pending'`,
  changeTrackingGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_change_tracking_geo ON change_tracking (governorate_id, district_id, changed_at)`,
  // Idempotency constraint
  uniqueClientChange: sql`CONSTRAINT unique_client_change UNIQUE (device_id, client_change_id)`,
}));

// ===========================================
// DELETION & CHANGE TRACKING SCHEMAS & TYPES  
// ===========================================

// Deletion Tombstones schemas
export const insertDeletionTombstoneSchema = createInsertSchema(deletionTombstones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeletionTombstone = typeof deletionTombstones.$inferSelect;
export type InsertDeletionTombstone = z.infer<typeof insertDeletionTombstoneSchema>;

// Change Tracking schemas
export const insertChangeTrackingSchema = createInsertSchema(changeTracking).omit({
  id: true,
  changeVersion: true, // Auto-generated by createChangeTrackingEntry
  changeSequence: true, // Auto-generated by createChangeTrackingEntry
  createdAt: true,
  updatedAt: true,
});

export type ChangeTracking = typeof changeTracking.$inferSelect;
export type InsertChangeTracking = z.infer<typeof insertChangeTrackingSchema>;

// ===========================================
// ADVANCED MONITORING & INSTRUMENTATION
// ===========================================

// Performance Metrics - قياس الأداء الشامل
export const performanceMetrics = pgTable("performance_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Metric identification
  metricName: text("metric_name").notNull(), // 'api_response_time', 'db_query_duration', 'sync_operation_time'
  metricType: text("metric_type").notNull(), // 'timer', 'counter', 'gauge', 'histogram'
  metricCategory: text("metric_category").notNull(), // 'frontend', 'backend', 'database', 'sync', 'user_action'
  
  // Measurement data
  value: decimal("value", { precision: 15, scale: 6 }).notNull(), // القيمة المقيسة (milliseconds, count, etc.)
  unit: text("unit").notNull(), // 'ms', 'seconds', 'count', 'bytes', 'percentage'
  tags: jsonb("tags"), // إضافة tags للتصنيف والفلترة
  
  // Context information
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"), // جلسة المستخدم
  deviceId: text("device_id"), // الجهاز المستخدم
  userAgent: text("user_agent"), // معلومات المتصفح
  
  // Request context
  requestId: text("request_id"), // معرف الطلب
  endpoint: text("endpoint"), // API endpoint إذا كان applicable
  method: text("method"), // HTTP method
  statusCode: integer("status_code"), // HTTP status code
  
  // Geographic context (for LBAC analytics)
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  
  // Timing information
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`).notNull(),
  processingStarted: timestamp("processing_started"), // بداية المعالجة
  processingCompleted: timestamp("processing_completed"), // انتهاء المعالجة
  
  // Additional metadata
  metadata: jsonb("metadata"), // بيانات إضافية خاصة بالقياس
  errorDetails: jsonb("error_details"), // تفاصيل الأخطاء إن وجدت
  
  // Aggregation helpers
  aggregationPeriod: text("aggregation_period"), // 'minute', 'hour', 'day' for pre-aggregated metrics
  aggregationTimestamp: timestamp("aggregation_timestamp"), // الوقت الفعلي للتجميع
  
  // Data retention
  expiresAt: timestamp("expires_at"), // تاريخ انتهاء البيانات للتنظيف التلقائي
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Performance indexes for fast queries
  perfMetricNameTimeIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_name_time ON performance_metrics (metric_name, timestamp DESC)`,
  perfMetricCategoryTimeIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_category_time ON performance_metrics (metric_category, timestamp DESC)`,
  perfMetricUserIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_user ON performance_metrics (user_id, timestamp DESC)`,
  perfMetricSessionIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_session ON performance_metrics (session_id, device_id)`,
  perfMetricEndpointIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_endpoint ON performance_metrics (endpoint, method, timestamp DESC)`,
  perfMetricGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_geo ON performance_metrics (governorate_id, district_id, timestamp DESC)`,
  perfMetricAggregationIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_aggregation ON performance_metrics (aggregation_period, aggregation_timestamp DESC)`,
  perfMetricExpiryIndex: sql`CREATE INDEX IF NOT EXISTS idx_perf_metric_expiry ON performance_metrics (expires_at)`,
}));

// Sync Operations Monitoring - مراقبة عمليات المزامنة
export const syncOperationsMetrics = pgTable("sync_operations_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Operation identification
  operationType: text("operation_type").notNull(), // 'push', 'pull', 'conflict_resolution', 'retry', 'dlq_recovery'
  operationId: text("operation_id").notNull(), // معرف العملية الفريد
  batchId: text("batch_id"), // معرف المجموعة للعمليات المتعددة
  
  // Operation details
  tableName: text("table_name"), // الجدول المتعلق بالعملية
  recordCount: integer("record_count").default(0), // عدد السجلات المتعاملة
  dataSize: integer("data_size"), // حجم البيانات بالبايت
  
  // Performance metrics
  duration: integer("duration"), // مدة العملية بالميلي ثانية
  retryCount: integer("retry_count").default(0), // عدد المحاولات
  priority: text("priority"), // 'critical', 'high', 'normal', 'low'
  
  // Status tracking
  status: text("status").notNull(), // 'started', 'completed', 'failed', 'retrying', 'dlq'
  errorCode: text("error_code"), // رمز الخطأ إن وجد
  errorMessage: text("error_message"), // رسالة الخطأ
  
  // Context information
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  deviceId: text("device_id").notNull(),
  sessionId: uuid("session_id")
    .references(() => syncSessions.id, { onDelete: "set null" }),
  
  // Network conditions
  connectionType: text("connection_type"), // 'wifi', 'cellular', 'offline'
  networkLatency: integer("network_latency"), // زمن الاستجابة للشبكة
  bandwidth: decimal("bandwidth", { precision: 10, scale: 2 }), // سرعة الاتصال
  
  // Sync strategy details
  syncStrategy: text("sync_strategy"), // 'full', 'incremental', 'differential'
  conflictResolutionStrategy: text("conflict_resolution_strategy"), // 'server_wins', 'client_wins', 'manual'
  conflictsDetected: integer("conflicts_detected").default(0),
  conflictsResolved: integer("conflicts_resolved").default(0),
  
  // Geographic context
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  
  // Timing information
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
  queuedAt: timestamp("queued_at"), // وقت الإضافة للطابور
  processingStartedAt: timestamp("processing_started_at"), // بداية المعالجة الفعلية
  
  // Performance benchmarks
  expectedDuration: integer("expected_duration"), // المدة المتوقعة
  performanceRating: text("performance_rating"), // 'excellent', 'good', 'acceptable', 'poor'
  
  // Additional context
  operationMetadata: jsonb("operation_metadata"), // بيانات إضافية
  clientVersion: text("client_version"), // إصدار التطبيق
  serverVersion: text("server_version"), // إصدار الخادم
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Sync monitoring indexes
  syncOpTypeStatusIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_type_status ON sync_operations_metrics (operation_type, status, started_at DESC)`,
  syncOpTableTimeIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_table_time ON sync_operations_metrics (table_name, started_at DESC)`,
  syncOpUserDeviceIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_user_device ON sync_operations_metrics (user_id, device_id, started_at DESC)`,
  syncOpSessionIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_session ON sync_operations_metrics (session_id, operation_id)`,
  syncOpPerformanceIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_performance ON sync_operations_metrics (performance_rating, duration, started_at DESC)`,
  syncOpRetryIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_retry ON sync_operations_metrics (retry_count, status, started_at DESC)`,
  syncOpGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_sync_op_geo ON sync_operations_metrics (governorate_id, district_id, started_at DESC)`,
}));

// Error Tracking & Analysis - تتبع وتحليل الأخطاء المتقدم
export const errorTracking = pgTable("error_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Error identification
  errorId: text("error_id").notNull(), // معرف فريد للخطأ
  errorHash: text("error_hash").notNull(), // hash للأخطاء المتشابهة
  errorType: text("error_type").notNull(), // 'frontend', 'backend', 'database', 'network', 'sync', 'validation'
  severity: text("severity").notNull(), // 'critical', 'high', 'medium', 'low', 'info'
  
  // Error details
  message: text("message").notNull(), // رسالة الخطأ
  stackTrace: text("stack_trace"), // تفاصيل الخطأ التقنية
  errorCode: text("error_code"), // رمز الخطأ المحدد
  component: text("component"), // المكون الذي حدث فيه الخطأ
  
  // Context information
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"), // جلسة المستخدم
  deviceId: text("device_id"), // الجهاز
  userAgent: text("user_agent"), // معلومات المتصفح
  
  // Request context
  requestId: text("request_id"), // معرف الطلب
  endpoint: text("endpoint"), // API endpoint المتعلق
  method: text("method"), // HTTP method
  requestPayload: jsonb("request_payload"), // بيانات الطلب (مُعَمَّاة للحساسة)
  responseStatus: integer("response_status"), // HTTP status code
  
  // Environment context
  environment: text("environment").notNull().default("production"), // 'development', 'staging', 'production'
  version: text("version"), // إصدار التطبيق
  buildNumber: text("build_number"), // رقم البناء
  
  // System context
  browserName: text("browser_name"), // اسم المتصفح
  browserVersion: text("browser_version"), // إصدار المتصفح
  osName: text("os_name"), // نظام التشغيل
  osVersion: text("os_version"), // إصدار نظام التشغيل
  deviceType: text("device_type"), // 'mobile', 'tablet', 'desktop'
  
  // Performance context
  memoryUsage: decimal("memory_usage", { precision: 10, scale: 2 }), // استهلاك الذاكرة
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }), // استهلاك المعالج
  networkLatency: integer("network_latency"), // زمن الاستجابة
  loadTime: integer("load_time"), // وقت التحميل
  
  // Geographic context
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  ipLocation: jsonb("ip_location"), // الموقع الجغرافي التقديري
  
  // Resolution tracking
  status: text("status").notNull().default("open"), // 'open', 'investigating', 'resolved', 'ignored'
  assignedToId: uuid("assigned_to_id")
    .references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"), // ملاحظات الحل
  resolvedAt: timestamp("resolved_at"), // تاريخ الحل
  
  // Frequency tracking
  occurrenceCount: integer("occurrence_count").default(1), // عدد التكرار
  firstOccurrence: timestamp("first_occurrence").default(sql`CURRENT_TIMESTAMP`), // أول ظهور
  lastOccurrence: timestamp("last_occurrence").default(sql`CURRENT_TIMESTAMP`), // آخر ظهور
  
  // Impact analysis
  affectedUsers: integer("affected_users").default(1), // عدد المستخدمين المتأثرين
  businessImpact: text("business_impact"), // 'critical', 'high', 'medium', 'low', 'none'
  
  // Additional metadata
  tags: text("tags").array(), // tags للتصنيف
  customAttributes: jsonb("custom_attributes"), // خصائص مخصصة
  relatedErrorIds: text("related_error_ids").array(), // أخطاء مرتبطة
  
  // Data retention
  expiresAt: timestamp("expires_at"), // تاريخ انتهاء الصلاحية
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Error tracking indexes
  errorHashIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_hash ON error_tracking (error_hash, last_occurrence DESC)`,
  errorTypeTimeIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_type_time ON error_tracking (error_type, severity, created_at DESC)`,
  errorUserIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_user ON error_tracking (user_id, created_at DESC)`,
  errorSessionIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_session ON error_tracking (session_id, device_id)`,
  errorEndpointIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_endpoint ON error_tracking (endpoint, method, created_at DESC)`,
  errorStatusIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_status ON error_tracking (status, severity, last_occurrence DESC)`,
  errorFrequencyIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_frequency ON error_tracking (occurrence_count DESC, last_occurrence DESC)`,
  errorGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_geo ON error_tracking (governorate_id, district_id, created_at DESC)`,
  errorExpiryIndex: sql`CREATE INDEX IF NOT EXISTS idx_error_expiry ON error_tracking (expires_at)`,
}));

// SLO (Service Level Objectives) Tracking - تتبع مستويات الخدمة
export const sloMeasurements = pgTable("slo_measurements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // SLO identification
  sloName: text("slo_name").notNull(), // 'api_availability', 'sync_success_rate', 'response_time_p95'
  sloType: text("slo_type").notNull(), // 'availability', 'latency', 'throughput', 'error_rate', 'custom'
  service: text("service").notNull(), // 'api', 'sync', 'frontend', 'database', 'authentication'
  
  // Measurement window
  measurementPeriod: text("measurement_period").notNull(), // 'minute', 'hour', 'day', 'week', 'month'
  windowStart: timestamp("window_start").notNull(), // بداية النافزة الزمنية
  windowEnd: timestamp("window_end").notNull(), // نهاية النافزة الزمنية
  
  // SLO targets and actual values
  targetValue: decimal("target_value", { precision: 10, scale: 4 }).notNull(), // القيمة المستهدفة
  actualValue: decimal("actual_value", { precision: 10, scale: 4 }).notNull(), // القيمة الفعلية
  targetUnit: text("target_unit").notNull(), // 'percentage', 'milliseconds', 'count', 'ratio'
  
  // Compliance tracking
  isCompliant: boolean("is_compliant").notNull(), // هل تم تحقيق SLO
  compliancePercentage: decimal("compliance_percentage", { precision: 5, scale: 2 }), // نسبة الامتثال
  violationCount: integer("violation_count").default(0), // عدد الانتهاكات
  violationDuration: integer("violation_duration"), // مدة الانتهاك بالدقائق
  
  // Error budget tracking
  errorBudget: decimal("error_budget", { precision: 10, scale: 4 }), // الميزانية المسموحة للأخطاء
  errorBudgetConsumed: decimal("error_budget_consumed", { precision: 10, scale: 4 }), // الميزانية المستهلكة
  errorBudgetRemaining: decimal("error_budget_remaining", { precision: 10, scale: 4 }), // الميزانية المتبقية
  
  // Performance categories
  performanceTier: text("performance_tier"), // 'excellent', 'good', 'acceptable', 'poor', 'critical'
  trendDirection: text("trend_direction"), // 'improving', 'stable', 'degrading'
  
  // Sample data
  totalRequests: integer("total_requests"), // إجمالي الطلبات
  successfulRequests: integer("successful_requests"), // الطلبات الناجحة
  failedRequests: integer("failed_requests"), // الطلبات الفاشلة
  
  // Timing measurements
  averageResponseTime: decimal("average_response_time", { precision: 10, scale: 3 }), // متوسط وقت الاستجابة
  p50ResponseTime: decimal("p50_response_time", { precision: 10, scale: 3 }), // النسبة المئوية الـ50
  p95ResponseTime: decimal("p95_response_time", { precision: 10, scale: 3 }), // النسبة المئوية الـ95
  p99ResponseTime: decimal("p99_response_time", { precision: 10, scale: 3 }), // النسبة المئوية الـ99
  
  // Geographic context (for regional SLOs)
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "set null" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "set null" }),
  
  // Alert configurations
  alertThreshold: decimal("alert_threshold", { precision: 10, scale: 4 }), // عتبة التنبيه
  criticalThreshold: decimal("critical_threshold", { precision: 10, scale: 4 }), // العتبة الحرجة
  alertsTriggered: integer("alerts_triggered").default(0), // عدد التنبيهات المرسلة
  
  // Reporting period
  reportingPeriod: text("reporting_period"), // 'daily', 'weekly', 'monthly', 'quarterly'
  nextMeasurement: timestamp("next_measurement"), // الموعد القادم للقياس
  
  // Context metadata
  tags: text("tags").array(), // tags للتجميع والفلترة
  metadata: jsonb("metadata"), // بيانات إضافية
  
  // Data lifecycle
  archivedAt: timestamp("archived_at"), // تاريخ الأرشفة
  expiresAt: timestamp("expires_at"), // تاريخ انتهاء الصلاحية
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // SLO tracking indexes
  sloNameTimeIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_name_time ON slo_measurements (slo_name, window_start DESC)`,
  sloServiceTypeIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_service_type ON slo_measurements (service, slo_type, window_start DESC)`,
  sloComplianceIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_compliance ON slo_measurements (is_compliant, performance_tier, window_start DESC)`,
  sloPeriodIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_period ON slo_measurements (measurement_period, reporting_period, window_start DESC)`,
  sloViolationIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_violation ON slo_measurements (violation_count, violation_duration, window_start DESC)`,
  sloGeoIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_geo ON slo_measurements (governorate_id, district_id, window_start DESC)`,
  sloAlertIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_alert ON slo_measurements (alerts_triggered, actual_value, window_start DESC)`,
  sloExpiryIndex: sql`CREATE INDEX IF NOT EXISTS idx_slo_expiry ON slo_measurements (expires_at)`,
}));

// ===========================================
// MONITORING SYSTEM SCHEMAS & TYPES
// ===========================================

// Performance Metrics schemas
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

// Sync Operations Metrics schemas
export const insertSyncOperationsMetricSchema = createInsertSchema(syncOperationsMetrics).omit({
  id: true,
  startedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type SyncOperationsMetric = typeof syncOperationsMetrics.$inferSelect;
export type InsertSyncOperationsMetric = z.infer<typeof insertSyncOperationsMetricSchema>;

// Error Tracking schemas
export const insertErrorTrackingSchema = createInsertSchema(errorTracking).omit({
  id: true,
  firstOccurrence: true,
  lastOccurrence: true,
  createdAt: true,
  updatedAt: true,
});

export type ErrorTracking = typeof errorTracking.$inferSelect;
export type InsertErrorTracking = z.infer<typeof insertErrorTrackingSchema>;

// SLO Measurements schemas
export const insertSloMeasurementSchema = createInsertSchema(sloMeasurements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SloMeasurement = typeof sloMeasurements.$inferSelect;
export type InsertSloMeasurement = z.infer<typeof insertSloMeasurementSchema>;

// ===========================================
// ENHANCED LBAC HARDENING SCHEMAS - Phase 6
// ===========================================

// User Geographic Assignment History schemas
export const insertUserGeographicAssignmentHistorySchema = createInsertSchema(userGeographicAssignmentHistory).omit({
  id: true,
  changeDate: true,
});

export type UserGeographicAssignmentHistory = typeof userGeographicAssignmentHistory.$inferSelect;
export type InsertUserGeographicAssignmentHistory = z.infer<typeof insertUserGeographicAssignmentHistorySchema>;

// Permission Geographic Constraints schemas
export const insertPermissionGeographicConstraintsSchema = createInsertSchema(permissionGeographicConstraints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PermissionGeographicConstraints = typeof permissionGeographicConstraints.$inferSelect;
export type InsertPermissionGeographicConstraints = z.infer<typeof insertPermissionGeographicConstraintsSchema>;

// Temporary Permission Delegations schemas
export const insertTemporaryPermissionDelegationsSchema = createInsertSchema(temporaryPermissionDelegations).omit({
  id: true,
  startDate: true,
  createdAt: true,
  updatedAt: true,
});

export type TemporaryPermissionDelegations = typeof temporaryPermissionDelegations.$inferSelect;
export type InsertTemporaryPermissionDelegations = z.infer<typeof insertTemporaryPermissionDelegationsSchema>;

// Geographic Role Templates schemas
export const insertGeographicRoleTemplatesSchema = createInsertSchema(geographicRoleTemplates).omit({
  id: true,
  validFrom: true,
  createdAt: true,
  updatedAt: true,
});

export type GeographicRoleTemplates = typeof geographicRoleTemplates.$inferSelect;
export type InsertGeographicRoleTemplates = z.infer<typeof insertGeographicRoleTemplatesSchema>;

// LBAC Access Audit Log schemas
export const insertLbacAccessAuditLogSchema = createInsertSchema(lbacAccessAuditLog).omit({
  id: true,
  createdAt: true,
});

export type LbacAccessAuditLog = typeof lbacAccessAuditLog.$inferSelect;
export type InsertLbacAccessAuditLog = z.infer<typeof insertLbacAccessAuditLogSchema>;

// =============================================
// MOBILE SURVEY SYSTEM - Phase 7
// =============================================

// Mobile Device Registration - For LBAC-aware device management
export const mobileDeviceRegistrations = pgTable("mobile_device_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(), // Unique device identifier
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceName: text("device_name").notNull(), // Human-readable device name
  deviceModel: text("device_model"), // Device model info
  osVersion: text("os_version"), // Operating system version
  appVersion: text("app_version"), // Mobile app version
  deviceType: text("device_type").notNull().default("mobile"), // mobile, tablet
  status: text("status").notNull().default("active"), // active, suspended, revoked
  
  // SECURITY: No plaintext tokens stored - tokens managed by JWT service
  refreshTokenHash: text("refresh_token_hash"), // Hashed refresh token for validation
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  tokenVersion: integer("token_version").default(1), // For token invalidation
  
  registrationDate: timestamp("registration_date").default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: timestamp("last_seen_at"),
  lastSyncAt: timestamp("last_sync_at"),
  
  // For delta sync and conflict resolution
  isDeleted: boolean("is_deleted").default(false), // Soft delete for tombstones
  deletedAt: timestamp("deleted_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Device type validation
  deviceTypeCheck: sql`CONSTRAINT device_type_check CHECK (
    device_type IN ('mobile', 'tablet')
  )`,
  // Status validation
  statusCheck: sql`CONSTRAINT status_check CHECK (
    status IN ('active', 'suspended', 'revoked')
  )`,
  // Soft delete consistency
  deletedAtConsistency: sql`CONSTRAINT deleted_at_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR 
    (is_deleted = true AND deleted_at IS NOT NULL)
  )`,
  // Refresh token expiry check
  refreshTokenValidityCheck: sql`CONSTRAINT refresh_token_validity_check CHECK (
    refresh_token_hash IS NULL OR refresh_token_expires_at IS NOT NULL
  )`,
  // Index for sync queries - using proper Drizzle syntax
  updatedAtIndex: index("idx_mobile_devices_updated_at").on(table.updatedAt),
  // Index for active device lookup
  activeDevicesIndex: index("idx_mobile_devices_active")
    .on(table.userId, table.status, table.isActive)
    .where(sql`NOT ${table.isDeleted}`),
  // Partial unique index for one active device per user
  uniqueActiveDeviceIndex: uniqueIndex("idx_unique_active_device_per_user")
    .on(table.userId)
    .where(sql`${table.isActive} = true AND ${table.status} = 'active' AND ${table.isDeleted} = false`)
}));

// Mobile Survey Sessions - Core survey session tracking
export const mobileSurveySessions = pgTable("mobile_survey_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  fieldVisitId: uuid("field_visit_id")
    .references(() => fieldVisits.id, { onDelete: "cascade" }),
  surveyorId: uuid("surveyor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceId: uuid("device_id")
    .references(() => mobileDeviceRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  sessionNumber: text("session_number").notNull().unique(), // Human-readable session ID
  
  // Idempotency for sync
  idempotencyKey: text("idempotency_key").notNull().unique(), // Prevents duplicate creation
  
  status: text("status").notNull().default("draft"), // draft, active, paused, completed, submitted, synced
  surveyType: text("survey_type").notNull(), // building_permit, surveying_decision, cadastral_survey
  startTime: timestamp("start_time").default(sql`CURRENT_TIMESTAMP`),
  endTime: timestamp("end_time"),
  pausedDuration: integer("paused_duration").default(0), // Total paused time in seconds
  
  // Location and context
  startLocation: jsonb("start_location"), // {lat, lng, accuracy, timestamp}
  endLocation: jsonb("end_location"), // {lat, lng, accuracy, timestamp}
  weatherConditions: text("weather_conditions"),
  
  // LBAC enforcement - Must match surveyor's geographic assignment
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "restrict" }),
  districtId: uuid("district_id")
    .references(() => districts.id, { onDelete: "restrict" }),
  subDistrictId: uuid("sub_district_id")
    .references(() => subDistricts.id, { onDelete: "restrict" }),
  neighborhoodId: uuid("neighborhood_id")
    .references(() => neighborhoods.id, { onDelete: "restrict" }),
  
  // Quality and sync metadata
  pointsCount: integer("points_count").default(0),
  geometriesCount: integer("geometries_count").default(0),
  attachmentsCount: integer("attachments_count").default(0),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // Calculated quality score
  lastSyncedAt: timestamp("last_synced_at"),
  syncVersion: integer("sync_version").default(1), // For conflict resolution
  
  // Soft delete for tombstones
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  // Session notes and metadata
  notes: text("notes"),
  clientMetadata: jsonb("client_metadata"), // Device info, app version, etc.
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Session duration constraint
  sessionDurationCheck: sql`CONSTRAINT session_duration_check CHECK (
    end_time IS NULL OR start_time <= end_time
  )`,
  
  // Status validation
  statusValidation: sql`CONSTRAINT status_validation CHECK (
    status IN ('draft', 'active', 'paused', 'completed', 'submitted', 'synced')
  )`,
  
  // Survey type validation
  surveyTypeValidation: sql`CONSTRAINT survey_type_validation CHECK (
    survey_type IN ('building_permit', 'surveying_decision', 'cadastral_survey')
  )`,
  
  // LBAC constraint: Must have at least one geographic level
  sessionGeographicConstraint: sql`CONSTRAINT session_geographic_constraint CHECK (
    governorate_id IS NOT NULL OR district_id IS NOT NULL OR 
    sub_district_id IS NOT NULL OR neighborhood_id IS NOT NULL
  )`,
  
  // Completed sessions must have end time
  completedSessionCheck: sql`CONSTRAINT completed_session_check CHECK (
    status NOT IN ('completed', 'submitted', 'synced') OR end_time IS NOT NULL
  )`,
  
  // Soft delete consistency
  deletedAtConsistency: sql`CONSTRAINT deleted_at_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR 
    (is_deleted = true AND deleted_at IS NOT NULL)
  )`,
  
  // Indexes for efficient queries - using proper Drizzle syntax
  applicationSessionsIndex: index("idx_sessions_application")
    .on(table.applicationId)
    .where(sql`NOT ${table.isDeleted}`),
  surveyorSessionsIndex: index("idx_sessions_surveyor")
    .on(table.surveyorId, table.status)
    .where(sql`NOT ${table.isDeleted}`),
  updatedAtIndex: index("idx_sessions_updated_at").on(table.updatedAt),
  syncStatusIndex: index("idx_sessions_sync_status")
    .on(table.lastSyncedAt, table.updatedAt)
    .where(sql`NOT ${table.isDeleted}`),
  geographicScopeIndex: index("idx_sessions_geographic")
    .on(table.governorateId, table.districtId, table.subDistrictId, table.neighborhoodId)
    .where(sql`NOT ${table.isDeleted}`)
}));

// Mobile Survey Points - Individual survey points with high-precision GPS
export const mobileSurveyPoints = pgTable("mobile_survey_points", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .references(() => mobileSurveySessions.id, { onDelete: "cascade" })
    .notNull(),
  pointNumber: integer("point_number").notNull(), // Sequential number within session
  
  // Idempotency for sync
  idempotencyKey: text("idempotency_key").notNull().unique(), // Prevents duplicate creation
  
  // Geographic coordinates (WGS84 - EPSG:4326)
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  elevation: decimal("elevation", { precision: 8, scale: 3 }), // Meters above sea level
  
  // GPS accuracy and metadata
  horizontalAccuracy: decimal("horizontal_accuracy", { precision: 6, scale: 2 }), // Meters
  verticalAccuracy: decimal("vertical_accuracy", { precision: 6, scale: 2 }), // Meters
  gpsSource: text("gps_source").default("device"), // device, external_receiver, manual
  
  // Survey classification
  pointType: text("point_type").notNull(), // corner, boundary, reference, building, utility
  featureCode: text("feature_code"), // Standardized feature codes
  description: text("description"),
  
  // Temporal data
  capturedAt: timestamp("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  
  // Quality flags
  isVerified: boolean("is_verified").default(false),
  needsReview: boolean("needs_review").default(false),
  qualityFlags: jsonb("quality_flags"), // Array of quality issues
  
  // Sync and conflict resolution
  isSynced: boolean("is_synced").default(false),
  syncedAt: timestamp("synced_at"),
  syncVersion: integer("sync_version").default(1),
  isDeleted: boolean("is_deleted").default(false), // Soft delete for tombstones
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Unique point number within session
  uniquePointPerSession: sql`CONSTRAINT unique_point_per_session UNIQUE (session_id, point_number)`,
  
  // WGS84 coordinate validation (Yemen bounds + buffer for border areas)
  yemenCoordinateValidation: sql`CONSTRAINT yemen_coordinate_validation CHECK (
    latitude BETWEEN 11.5 AND 19.5 AND longitude BETWEEN 41.5 AND 55.5
  )`,
  
  // EPSG:4326 precision validation (WGS84 standard)
  wgs84PrecisionValidation: sql`CONSTRAINT wgs84_precision_validation CHECK (
    latitude BETWEEN -90.0 AND 90.0 AND longitude BETWEEN -180.0 AND 180.0
  )`,
  
  // Accuracy validation
  accuracyValidation: sql`CONSTRAINT accuracy_validation CHECK (
    horizontal_accuracy IS NULL OR horizontal_accuracy >= 0
  )`,
  
  // GPS source validation
  gpsSourceValidation: sql`CONSTRAINT gps_source_validation CHECK (
    gps_source IN ('device', 'external_receiver', 'manual')
  )`,
  
  // Point type validation
  pointTypeValidation: sql`CONSTRAINT point_type_validation CHECK (
    point_type IN ('corner', 'boundary', 'reference', 'building', 'utility')
  )`,
  
  // Soft delete consistency
  deletedAtConsistency: sql`CONSTRAINT deleted_at_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR 
    (is_deleted = true AND deleted_at IS NOT NULL)
  )`,
  
  // Indexes for efficient queries - using proper Drizzle syntax
  sessionPointsIndex: index("idx_points_session")
    .on(table.sessionId, table.pointNumber)
    .where(sql`NOT ${table.isDeleted}`),
  updatedAtIndex: index("idx_points_updated_at").on(table.updatedAt),
  syncStatusIndex: index("idx_points_sync_status")
    .on(table.isSynced, table.updatedAt)
    .where(sql`NOT ${table.isDeleted}`),
  geospatialIndex: index("idx_points_geospatial")
    .on(table.latitude, table.longitude)
    .where(sql`NOT ${table.isDeleted}`)
}));

// Mobile Survey Geometries - Complex geometries in GeoJSON format
export const mobileSurveyGeometries = pgTable("mobile_survey_geometries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .references(() => mobileSurveySessions.id, { onDelete: "cascade" })
    .notNull(),
  geometryNumber: integer("geometry_number").notNull(), // Sequential number within session
  
  // Idempotency for sync
  idempotencyKey: text("idempotency_key").notNull().unique(), // Prevents duplicate creation
  
  // Geometry data in GeoJSON format (EPSG:4326)
  geometryType: text("geometry_type").notNull(), // Point, LineString, Polygon, MultiPolygon
  coordinates: jsonb("coordinates").notNull(), // GeoJSON coordinates array
  properties: jsonb("properties"), // Additional GeoJSON properties
  crs: text("crs").default("EPSG:4326"), // Coordinate Reference System
  
  // Survey classification
  featureType: text("feature_type").notNull(), // building, boundary, road, utility, structure
  featureCode: text("feature_code"), // Standardized feature codes
  description: text("description"),
  
  // Geometric properties (calculated from coordinates)
  area: decimal("area", { precision: 12, scale: 3 }), // Square meters (for polygons)
  perimeter: decimal("perimeter", { precision: 10, scale: 3 }), // Meters (for polygons)
  length: decimal("length", { precision: 10, scale: 3 }), // Meters (for lines)
  centroid: jsonb("centroid"), // {lat, lng} center point for indexing
  
  // Quality and validation
  isComplete: boolean("is_complete").default(false), // For partial/work-in-progress geometries
  isClosed: boolean("is_closed").default(false), // For polygons
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  validationFlags: jsonb("validation_flags"), // Array of validation issues
  
  // Temporal data
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  
  // Sync and conflict resolution
  isSynced: boolean("is_synced").default(false),
  syncedAt: timestamp("synced_at"),
  syncVersion: integer("sync_version").default(1),
  isDeleted: boolean("is_deleted").default(false), // Soft delete for tombstones
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Unique geometry number within session
  uniqueGeometryPerSession: sql`CONSTRAINT unique_geometry_per_session UNIQUE (session_id, geometry_number)`,
  
  // GeoJSON geometry type validation
  geometryTypeValidation: sql`CONSTRAINT geometry_type_validation CHECK (
    geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPolygon')
  )`,
  
  // Feature type validation
  featureTypeValidation: sql`CONSTRAINT feature_type_validation CHECK (
    feature_type IN ('building', 'boundary', 'road', 'utility', 'structure')
  )`,
  
  // CRS validation (only WGS84 supported)
  crsValidation: sql`CONSTRAINT crs_validation CHECK (
    crs = 'EPSG:4326'
  )`,
  
  // Completed geometries must have completion time
  completedGeometryCheck: sql`CONSTRAINT completed_geometry_check CHECK (
    NOT is_complete OR completed_at IS NOT NULL
  )`,
  
  // Polygon closure check
  polygonClosureCheck: sql`CONSTRAINT polygon_closure_check CHECK (
    geometry_type != 'Polygon' OR is_closed = true
  )`,
  
  // Area must be positive for polygons
  areaValidation: sql`CONSTRAINT area_validation CHECK (
    area IS NULL OR area >= 0
  )`,
  
  // Length/perimeter must be positive
  lengthValidation: sql`CONSTRAINT length_validation CHECK (
    length IS NULL OR length >= 0
  )`,
  
  // Perimeter must be positive
  perimeterValidation: sql`CONSTRAINT perimeter_validation CHECK (
    perimeter IS NULL OR perimeter >= 0
  )`,
  
  // Soft delete consistency
  deletedAtConsistency: sql`CONSTRAINT deleted_at_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR 
    (is_deleted = true AND deleted_at IS NOT NULL)
  )`,
  
  // Indexes for efficient queries - using proper Drizzle syntax
  sessionGeometriesIndex: index("idx_geometries_session")
    .on(table.sessionId, table.geometryNumber)
    .where(sql`NOT ${table.isDeleted}`),
  updatedAtIndex: index("idx_geometries_updated_at").on(table.updatedAt),
  syncStatusIndex: index("idx_geometries_sync_status")
    .on(table.isSynced, table.updatedAt)
    .where(sql`NOT ${table.isDeleted}`),
  featureTypeIndex: index("idx_geometries_feature_type")
    .on(table.featureType)
    .where(sql`NOT ${table.isDeleted}`)
}));

// Mobile Field Visits - Track surveyor movement and field coverage
export const mobileFieldVisits = pgTable("mobile_field_visits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .references(() => mobileSurveySessions.id, { onDelete: "cascade" })
    .notNull(),
  surveyorId: uuid("surveyor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceId: uuid("device_id")
    .references(() => mobileDeviceRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  
  // Idempotency for sync
  idempotencyKey: text("idempotency_key").notNull().unique(),
  
  // Visit tracking
  startTime: timestamp("start_time").notNull().default(sql`CURRENT_TIMESTAMP`),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Total duration in seconds
  
  // Movement path as GeoJSON LineString
  movementPath: jsonb("movement_path"), // GeoJSON LineString with timestamps
  startLocation: jsonb("start_location"), // {lat, lng, accuracy, timestamp}
  endLocation: jsonb("end_location"), // {lat, lng, accuracy, timestamp}
  
  // Coverage and quality metrics
  totalDistance: decimal("total_distance", { precision: 10, scale: 3 }), // Meters traveled
  coverageArea: decimal("coverage_area", { precision: 12, scale: 3 }), // Square meters covered
  visitPurpose: text("visit_purpose").notNull(), // survey, inspection, verification, maintenance
  visitStatus: text("visit_status").notNull().default("active"), // active, completed, interrupted
  
  // Quality and notes
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  notes: text("notes"),
  weatherConditions: text("weather_conditions"),
  
  // Sync and conflict resolution
  isSynced: boolean("is_synced").default(false),
  syncedAt: timestamp("synced_at"),
  syncVersion: integer("sync_version").default(1),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Visit duration constraint
  visitDurationCheck: sql`CONSTRAINT visit_duration_check CHECK (
    end_time IS NULL OR start_time <= end_time
  )`,
  
  // Visit purpose validation
  visitPurposeValidation: sql`CONSTRAINT visit_purpose_validation CHECK (
    visit_purpose IN ('survey', 'inspection', 'verification', 'maintenance')
  )`,
  
  // Visit status validation
  visitStatusValidation: sql`CONSTRAINT visit_status_validation CHECK (
    visit_status IN ('active', 'completed', 'interrupted')
  )`,
  
  // Completed visits must have end time
  completedVisitCheck: sql`CONSTRAINT completed_visit_check CHECK (
    visit_status != 'completed' OR end_time IS NOT NULL
  )`,
  
  // Distance must be positive
  distanceValidation: sql`CONSTRAINT distance_validation CHECK (
    total_distance IS NULL OR total_distance >= 0
  )`,
  
  // Coverage area must be positive
  coverageValidation: sql`CONSTRAINT coverage_validation CHECK (
    coverage_area IS NULL OR coverage_area >= 0
  )`,
  
  // Soft delete consistency
  deletedAtConsistency: sql`CONSTRAINT deleted_at_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL) OR 
    (is_deleted = true AND deleted_at IS NOT NULL)
  )`,
  
  // Indexes for efficient queries
  sessionVisitsIndex: index("idx_field_visits_session")
    .on(table.sessionId)
    .where(sql`NOT ${table.isDeleted}`),
  surveyorVisitsIndex: index("idx_field_visits_surveyor")
    .on(table.surveyorId, table.visitStatus)
    .where(sql`NOT ${table.isDeleted}`),
  updatedAtIndex: index("idx_field_visits_updated_at").on(table.updatedAt),
  syncStatusIndex: index("idx_field_visits_sync_status")
    .on(table.isSynced, table.updatedAt)
    .where(sql`NOT ${table.isDeleted}`)
}));

// Mobile Survey Attachments - Photos and files with geographic context
export const mobileSurveyAttachments = pgTable("mobile_survey_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .references(() => mobileSurveySessions.id, { onDelete: "cascade" })
    .notNull(),
  relatedPointId: uuid("related_point_id")
    .references(() => mobileSurveyPoints.id, { onDelete: "set null" }),
  relatedGeometryId: uuid("related_geometry_id")
    .references(() => mobileSurveyGeometries.id, { onDelete: "set null" }),
  
  // File metadata
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileType: text("file_type").notNull(), // image, video, audio, document
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // Bytes
  filePath: text("file_path"), // Local device path
  storageUrl: text("storage_url"), // Cloud storage URL after upload
  
  // Geographic context
  captureLocation: jsonb("capture_location"), // {lat, lng, accuracy} at time of capture
  captureDirection: decimal("capture_direction", { precision: 6, scale: 2 }), // Compass bearing
  
  // Image-specific metadata
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  exifData: jsonb("exif_data"), // Camera EXIF metadata
  
  // Content classification
  attachmentType: text("attachment_type").notNull(), // photo, sketch, document, audio_note
  description: text("description"),
  tags: jsonb("tags"), // Array of tags for categorization
  
  // Temporal data
  capturedAt: timestamp("captured_at").notNull(),
  
  // Upload and sync status
  isUploaded: boolean("is_uploaded").default(false),
  uploadedAt: timestamp("uploaded_at"),
  isSynced: boolean("is_synced").default(false),
  syncedAt: timestamp("synced_at"),
  uploadRetryCount: integer("upload_retry_count").default(0),
  
  // Validation and security
  isValidated: boolean("is_validated").default(false),
  validationResults: jsonb("validation_results"), // AV scan, content validation results
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // File size validation (max 50MB)
  fileSizeValidation: sql`CONSTRAINT file_size_validation CHECK (
    file_size > 0 AND file_size <= 52428800
  )`,
  // Upload retry limit
  uploadRetryLimit: sql`CONSTRAINT upload_retry_limit CHECK (
    upload_retry_count >= 0 AND upload_retry_count <= 5
  )`,
  // Either point or geometry reference (not both)
  exclusiveReference: sql`CONSTRAINT exclusive_reference CHECK (
    (related_point_id IS NULL) != (related_geometry_id IS NULL)
  )`
}));

// Mobile Sync Cursors - For delta sync and conflict resolution
export const mobileSyncCursors = pgTable("mobile_sync_cursors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: uuid("device_id")
    .references(() => mobileDeviceRegistrations.id, { onDelete: "cascade" })
    .notNull(),
  entityType: text("entity_type").notNull(), // sessions, points, geometries, attachments
  lastSyncTimestamp: timestamp("last_sync_timestamp").notNull(),
  lastSyncCursor: text("last_sync_cursor").notNull(), // Watermark for pagination
  
  // Sync metadata
  syncDirection: text("sync_direction").notNull(), // up, down, bidirectional
  recordsCount: integer("records_count").default(0),
  conflictsCount: integer("conflicts_count").default(0),
  errorsCount: integer("errors_count").default(0),
  
  // Status tracking
  isActive: boolean("is_active").default(true),
  lastSuccessfulSync: timestamp("last_successful_sync"),
  nextScheduledSync: timestamp("next_scheduled_sync"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Unique cursor per device per entity type
  uniqueCursorPerDevice: sql`CONSTRAINT unique_cursor_per_device UNIQUE (device_id, entity_type)`,
  // Valid entity types
  validEntityType: sql`CONSTRAINT valid_entity_type CHECK (
    entity_type IN ('sessions', 'points', 'geometries', 'attachments', 'all')
  )`,
  // Valid sync direction
  validSyncDirection: sql`CONSTRAINT valid_sync_direction CHECK (
    sync_direction IN ('up', 'down', 'bidirectional')
  )`
}));

// =============================================
// TECHNICAL REVIEW SYSTEM
// =============================================

// Technical Review Cases - Link applications to reviewers and track status
export const technicalReviewCases = pgTable("technical_review_cases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  reviewerId: uuid("reviewer_id")
    .references(() => users.id, { onDelete: "set null" }),
  assignedById: uuid("assigned_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  
  // Review status and workflow
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, approved, rejected, needs_modification
  priority: text("priority").default("medium"), // high, medium, low
  reviewType: text("review_type").notNull().default("technical"), // technical, legal, administrative
  
  // Review metadata
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  
  // Decision and notes
  decision: text("decision"), // approve, reject, modify, return
  reviewNotes: text("review_notes"),
  internalNotes: text("internal_notes"),
  recommendedActions: jsonb("recommended_actions"), // Array of action items
  
  // Version control for review iterations
  reviewVersion: integer("review_version").default(1),
  previousReviewId: uuid("previous_review_id"),
  
  // Workflow integration
  workflowStage: text("workflow_stage").default("technical_review_pending"),
  nextStage: text("next_stage"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Status validation
  statusValidation: sql`CONSTRAINT status_validation CHECK (
    status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'needs_modification')
  )`,
  
  // Priority validation
  priorityValidation: sql`CONSTRAINT priority_validation CHECK (
    priority IN ('high', 'medium', 'low')
  )`,
  
  // Review type validation
  reviewTypeValidation: sql`CONSTRAINT review_type_validation CHECK (
    review_type IN ('technical', 'legal', 'administrative')
  )`,
  
  // Decision validation
  decisionValidation: sql`CONSTRAINT decision_validation CHECK (
    decision IS NULL OR decision IN ('approve', 'reject', 'modify', 'return')
  )`,
  
  // Completed reviews must have decision
  completedReviewCheck: sql`CONSTRAINT completed_review_check CHECK (
    status != 'completed' OR decision IS NOT NULL
  )`,
  
  // Started reviews must have start time
  startedReviewCheck: sql`CONSTRAINT started_review_check CHECK (
    status = 'pending' OR started_at IS NOT NULL
  )`,
  
  // Due date must be in future when created
  dueDateValidation: sql`CONSTRAINT due_date_validation CHECK (
    due_date IS NULL OR due_date > created_at
  )`,
  
  // Indexes
  applicationReviewIndex: index("idx_tech_review_application").on(table.applicationId),
  reviewerStatusIndex: index("idx_tech_review_reviewer_status").on(table.reviewerId, table.status),
  statusIndex: index("idx_tech_review_status").on(table.status),
  workflowStageIndex: index("idx_tech_review_workflow_stage").on(table.workflowStage)
}));

// Review Artifacts - Geometric and data artifacts from different ingestion sources
export const reviewArtifacts = pgTable("review_artifacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewCaseId: uuid("review_case_id")
    .references(() => technicalReviewCases.id, { onDelete: "cascade" })
    .notNull(),
  ingestionJobId: uuid("ingestion_job_id")
    .references(() => ingestionJobs.id, { onDelete: "set null" }),
  
  // Artifact metadata
  artifactName: text("artifact_name").notNull(),
  artifactType: text("artifact_type").notNull(), // geometry, raster, document, calculation
  sourceType: text("source_type").notNull(), // mobile_sync, csv_upload, shapefile_upload, manual_entry
  
  // Geometric data (GeoJSON format)
  geometryType: text("geometry_type"), // Point, LineString, Polygon, MultiPolygon
  coordinates: jsonb("coordinates"), // GeoJSON coordinates
  properties: jsonb("properties"), // GeoJSON properties
  crs: text("crs").default("EPSG:4326"), // Coordinate Reference System
  
  // Layer management
  layerName: text("layer_name"),
  layerOrder: integer("layer_order").default(1),
  isVisible: boolean("is_visible").default(true),
  strokeColor: text("stroke_color").default("#3388ff"),
  fillColor: text("fill_color").default("#3388ff33"),
  strokeWidth: integer("stroke_width").default(3),
  
  // Quality and validation
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  validationStatus: text("validation_status").default("pending"), // pending, valid, invalid, warning
  validationErrors: jsonb("validation_errors"), // Array of validation issues
  
  // Geometric calculations
  area: decimal("area", { precision: 12, scale: 3 }), // Square meters
  perimeter: decimal("perimeter", { precision: 10, scale: 3 }), // Meters
  length: decimal("length", { precision: 10, scale: 3 }), // Meters
  centroid: jsonb("centroid"), // {lat, lng}
  
  // Version control and comparison
  artifactVersion: integer("artifact_version").default(1),
  parentArtifactId: uuid("parent_artifact_id"),
  isDerived: boolean("is_derived").default(false), // Calculated from other artifacts
  
  // Status tracking
  status: text("status").default("active"), // active, archived, deleted, superseded
  notes: text("notes"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Artifact type validation
  artifactTypeValidation: sql`CONSTRAINT artifact_type_validation CHECK (
    artifact_type IN ('geometry', 'raster', 'document', 'calculation', 'annotation')
  )`,
  
  // Source type validation
  sourceTypeValidation: sql`CONSTRAINT source_type_validation CHECK (
    source_type IN ('mobile_sync', 'csv_upload', 'shapefile_upload', 'manual_entry', 'georaster_upload')
  )`,
  
  // Geometry type validation
  geometryTypeValidation: sql`CONSTRAINT geometry_type_validation CHECK (
    geometry_type IS NULL OR geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPolygon')
  )`,
  
  // CRS validation
  crsValidation: sql`CONSTRAINT crs_validation CHECK (
    crs IN ('EPSG:4326', 'EPSG:3857', 'EPSG:32638')
  )`,
  
  // Validation status check
  validationStatusCheck: sql`CONSTRAINT validation_status_check CHECK (
    validation_status IN ('pending', 'valid', 'invalid', 'warning')
  )`,
  
  // Status validation
  statusValidation: sql`CONSTRAINT status_validation CHECK (
    status IN ('active', 'archived', 'deleted', 'superseded')
  )`,
  
  // Geometric artifacts must have coordinates
  geometryArtifactCheck: sql`CONSTRAINT geometry_artifact_check CHECK (
    artifact_type != 'geometry' OR coordinates IS NOT NULL
  )`,
  
  // Area/perimeter/length must be positive
  positiveMetricsCheck: sql`CONSTRAINT positive_metrics_check CHECK (
    area IS NULL OR area >= 0 AND
    perimeter IS NULL OR perimeter >= 0 AND
    length IS NULL OR length >= 0
  )`,
  
  // Indexes
  reviewCaseArtifactsIndex: index("idx_artifacts_review_case").on(table.reviewCaseId),
  sourceTypeIndex: index("idx_artifacts_source_type").on(table.sourceType),
  artifactTypeIndex: index("idx_artifacts_artifact_type").on(table.artifactType),
  statusIndex: index("idx_artifacts_status").on(table.status),
  layerIndex: index("idx_artifacts_layer").on(table.layerName, table.layerOrder)
}));

// Ingestion Jobs - Track processing of uploaded files and data sources
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewCaseId: uuid("review_case_id")
    .references(() => technicalReviewCases.id, { onDelete: "cascade" })
    .notNull(),
  
  // Job metadata
  jobType: text("job_type").notNull(), // mobile_sync, csv_processing, shapefile_processing, georaster_processing
  jobName: text("job_name").notNull(),
  description: text("description"),
  
  // Source data
  sourcePath: text("source_path"), // Original file path or source identifier
  sourceFormat: text("source_format"), // csv, shp, tif, zip, geojson
  sourceSize: integer("source_size"), // File size in bytes
  payloadHash: text("payload_hash"), // MD5/SHA256 hash for deduplication
  
  // Processing configuration
  processingConfig: jsonb("processing_config"), // Job-specific configuration
  outputFormat: text("output_format").default("geojson"), // Target output format
  
  // Processing status
  status: text("status").default("pending"), // pending, running, completed, failed, cancelled
  processingStage: text("processing_stage"), // validation, parsing, transformation, storage
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"), // Percentage 0-100
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration"), // Seconds
  actualDuration: integer("actual_duration"), // Seconds
  
  // Results and errors
  outputPath: text("output_path"), // Path to processed output
  recordsProcessed: integer("records_processed").default(0),
  recordsValid: integer("records_valid").default(0),
  recordsInvalid: integer("records_invalid").default(0),
  artifactsCreated: integer("artifacts_created").default(0),
  
  // Error handling
  errorLog: jsonb("error_log"), // Array of error messages and details
  warningLog: jsonb("warning_log"), // Array of warnings
  lastError: text("last_error"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  // Worker information
  workerId: text("worker_id"), // Processing worker identifier
  workerHost: text("worker_host"), // Worker machine/container
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Job type validation
  jobTypeValidation: sql`CONSTRAINT job_type_validation CHECK (
    job_type IN ('mobile_sync', 'csv_processing', 'shapefile_processing', 'georaster_processing')
  )`,
  
  // Source format validation
  sourceFormatValidation: sql`CONSTRAINT source_format_validation CHECK (
    source_format IS NULL OR source_format IN ('csv', 'shp', 'tif', 'tiff', 'zip', 'geojson', 'kml')
  )`,
  
  // Output format validation
  outputFormatValidation: sql`CONSTRAINT output_format_validation CHECK (
    output_format IN ('geojson', 'postgis', 'shapefile', 'png')
  )`,
  
  // Status validation
  statusValidation: sql`CONSTRAINT status_validation CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )`,
  
  // Progress validation
  progressValidation: sql`CONSTRAINT progress_validation CHECK (
    progress >= 0 AND progress <= 100
  )`,
  
  // Completed jobs must have completion time
  completedJobCheck: sql`CONSTRAINT completed_job_check CHECK (
    status != 'completed' OR completed_at IS NOT NULL
  )`,
  
  // Started jobs must have start time
  startedJobCheck: sql`CONSTRAINT started_job_check CHECK (
    status = 'pending' OR started_at IS NOT NULL
  )`,
  
  // Record counts validation
  recordCountsValidation: sql`CONSTRAINT record_counts_validation CHECK (
    records_processed >= 0 AND
    records_valid >= 0 AND
    records_invalid >= 0 AND
    records_valid + records_invalid <= records_processed
  )`,
  
  // Retry count validation
  retryCountValidation: sql`CONSTRAINT retry_count_validation CHECK (
    retry_count >= 0 AND retry_count <= max_retries
  )`,
  
  // Indexes
  reviewCaseJobsIndex: index("idx_ingestion_jobs_review_case").on(table.reviewCaseId),
  statusIndex: index("idx_ingestion_jobs_status").on(table.status),
  jobTypeIndex: index("idx_ingestion_jobs_job_type").on(table.jobType),
  payloadHashIndex: index("idx_ingestion_jobs_payload_hash").on(table.payloadHash),
  createdAtIndex: index("idx_ingestion_jobs_created_at").on(table.createdAt)
}));

// Raster Products - Georeferenced imagery products and their metadata
export const rasterProducts = pgTable("raster_products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewCaseId: uuid("review_case_id")
    .references(() => technicalReviewCases.id, { onDelete: "cascade" })
    .notNull(),
  ingestionJobId: uuid("ingestion_job_id")
    .references(() => ingestionJobs.id, { onDelete: "set null" }),
  
  // Product metadata
  productName: text("product_name").notNull(),
  productType: text("product_type").notNull(), // basemap, overlay, orthophoto, dem, classification
  description: text("description"),
  
  // File references
  imageUrl: text("image_url").notNull(), // PNG/JPEG image URL
  worldFileUrl: text("world_file_url"), // .pgw/.jgw world file URL
  projectionFileUrl: text("projection_file_url"), // .prj projection file URL
  originalFileUrl: text("original_file_url"), // Original TIFF/source file URL
  
  // Spatial reference and bounds
  crs: text("crs").default("EPSG:4326"), // Coordinate Reference System
  bounds: jsonb("bounds").notNull(), // [[minLng, minLat], [maxLng, maxLat]]
  centroid: jsonb("centroid"), // {lat, lng}
  
  // Raster properties
  width: integer("width").notNull(), // Image width in pixels
  height: integer("height").notNull(), // Image height in pixels
  pixelSizeX: decimal("pixel_size_x", { precision: 15, scale: 10 }), // Pixel size in X direction
  pixelSizeY: decimal("pixel_size_y", { precision: 15, scale: 10 }), // Pixel size in Y direction
  resolution: decimal("resolution", { precision: 10, scale: 3 }), // Ground resolution in meters
  
  // Data characteristics
  bandCount: integer("band_count").default(3), // Number of bands (RGB = 3, RGBA = 4)
  dataType: text("data_type").default("uint8"), // uint8, uint16, float32
  compressionType: text("compression_type"), // jpeg, png, lzw, none
  
  // Quality and processing
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  processingLevel: text("processing_level").default("raw"), // raw, processed, orthorectified
  acquisitionDate: timestamp("acquisition_date"),
  processingDate: timestamp("processing_date").default(sql`CURRENT_TIMESTAMP`),
  
  // Display properties
  minZoomLevel: integer("min_zoom_level").default(0),
  maxZoomLevel: integer("max_zoom_level").default(18),
  opacity: decimal("opacity", { precision: 3, scale: 2 }).default("1.0"), // 0.0 to 1.0
  isVisible: boolean("is_visible").default(true),
  displayOrder: integer("display_order").default(1),
  
  // Status and validation
  status: text("status").default("processing"), // processing, ready, error, archived
  validationStatus: text("validation_status").default("pending"), // pending, valid, invalid
  validationErrors: jsonb("validation_errors"),
  
  // Usage tracking
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Product type validation
  productTypeValidation: sql`CONSTRAINT product_type_validation CHECK (
    product_type IN ('basemap', 'overlay', 'orthophoto', 'dem', 'classification', 'satellite')
  )`,
  
  // CRS validation
  crsValidation: sql`CONSTRAINT crs_validation CHECK (
    crs IN ('EPSG:4326', 'EPSG:3857', 'EPSG:32638')
  )`,
  
  // Data type validation
  dataTypeValidation: sql`CONSTRAINT data_type_validation CHECK (
    data_type IN ('uint8', 'uint16', 'uint32', 'float32', 'float64')
  )`,
  
  // Processing level validation
  processingLevelValidation: sql`CONSTRAINT processing_level_validation CHECK (
    processing_level IN ('raw', 'processed', 'orthorectified', 'mosaic')
  )`,
  
  // Status validation
  statusValidation: sql`CONSTRAINT status_validation CHECK (
    status IN ('processing', 'ready', 'error', 'archived')
  )`,
  
  // Validation status check
  validationStatusCheck: sql`CONSTRAINT validation_status_check CHECK (
    validation_status IN ('pending', 'valid', 'invalid')
  )`,
  
  // Dimension validation
  dimensionValidation: sql`CONSTRAINT dimension_validation CHECK (
    width > 0 AND height > 0
  )`,
  
  // Band count validation
  bandCountValidation: sql`CONSTRAINT band_count_validation CHECK (
    band_count > 0 AND band_count <= 10
  )`,
  
  // Zoom level validation
  zoomLevelValidation: sql`CONSTRAINT zoom_level_validation CHECK (
    min_zoom_level >= 0 AND max_zoom_level <= 22 AND min_zoom_level <= max_zoom_level
  )`,
  
  // Opacity validation
  opacityValidation: sql`CONSTRAINT opacity_validation CHECK (
    opacity >= 0.0 AND opacity <= 1.0
  )`,
  
  // Resolution must be positive
  resolutionValidation: sql`CONSTRAINT resolution_validation CHECK (
    resolution IS NULL OR resolution > 0
  )`,
  
  // Indexes
  reviewCaseRastersIndex: index("idx_raster_products_review_case").on(table.reviewCaseId),
  productTypeIndex: index("idx_raster_products_product_type").on(table.productType),
  statusIndex: index("idx_raster_products_status").on(table.status),
  displayOrderIndex: index("idx_raster_products_display_order").on(table.displayOrder),
  acquisitionDateIndex: index("idx_raster_products_acquisition_date").on(table.acquisitionDate)
}));

// =============================================
// MOBILE SURVEY SYSTEM - RELATIONS
// =============================================

// Mobile Device Registration Relations
export const mobileDeviceRegistrationsRelations = relations(mobileDeviceRegistrations, ({ one, many }) => ({
  user: one(users, {
    fields: [mobileDeviceRegistrations.userId],
    references: [users.id],
  }),
  surveySessions: many(mobileSurveySessions),
  syncCursors: many(mobileSyncCursors),
}));

// Mobile Survey Sessions Relations
export const mobileSurveySessionsRelations = relations(mobileSurveySessions, ({ one, many }) => ({
  application: one(applications, {
    fields: [mobileSurveySessions.applicationId],
    references: [applications.id],
  }),
  fieldVisit: one(fieldVisits, {
    fields: [mobileSurveySessions.fieldVisitId],
    references: [fieldVisits.id],
  }),
  surveyor: one(users, {
    fields: [mobileSurveySessions.surveyorId],
    references: [users.id],
  }),
  device: one(mobileDeviceRegistrations, {
    fields: [mobileSurveySessions.deviceId],
    references: [mobileDeviceRegistrations.id],
  }),
  governorate: one(governorates, {
    fields: [mobileSurveySessions.governorateId],
    references: [governorates.id],
  }),
  district: one(districts, {
    fields: [mobileSurveySessions.districtId],
    references: [districts.id],
  }),
  subDistrict: one(subDistricts, {
    fields: [mobileSurveySessions.subDistrictId],
    references: [subDistricts.id],
  }),
  neighborhood: one(neighborhoods, {
    fields: [mobileSurveySessions.neighborhoodId],
    references: [neighborhoods.id],
  }),
  surveyPoints: many(mobileSurveyPoints),
  surveyGeometries: many(mobileSurveyGeometries),
  fieldVisits: many(mobileFieldVisits),
  attachments: many(mobileSurveyAttachments),
}));

// Mobile Survey Points Relations
export const mobileSurveyPointsRelations = relations(mobileSurveyPoints, ({ one, many }) => ({
  session: one(mobileSurveySessions, {
    fields: [mobileSurveyPoints.sessionId],
    references: [mobileSurveySessions.id],
  }),
  attachments: many(mobileSurveyAttachments),
}));

// Mobile Survey Geometries Relations
export const mobileSurveyGeometriesRelations = relations(mobileSurveyGeometries, ({ one, many }) => ({
  session: one(mobileSurveySessions, {
    fields: [mobileSurveyGeometries.sessionId],
    references: [mobileSurveySessions.id],
  }),
  attachments: many(mobileSurveyAttachments),
}));

// Mobile Field Visits Relations
export const mobileFieldVisitsRelations = relations(mobileFieldVisits, ({ one }) => ({
  session: one(mobileSurveySessions, {
    fields: [mobileFieldVisits.sessionId],
    references: [mobileSurveySessions.id],
  }),
  surveyor: one(users, {
    fields: [mobileFieldVisits.surveyorId],
    references: [users.id],
  }),
  device: one(mobileDeviceRegistrations, {
    fields: [mobileFieldVisits.deviceId],
    references: [mobileDeviceRegistrations.id],
  }),
}));

// Mobile Survey Attachments Relations
export const mobileSurveyAttachmentsRelations = relations(mobileSurveyAttachments, ({ one }) => ({
  session: one(mobileSurveySessions, {
    fields: [mobileSurveyAttachments.sessionId],
    references: [mobileSurveySessions.id],
  }),
  relatedPoint: one(mobileSurveyPoints, {
    fields: [mobileSurveyAttachments.relatedPointId],
    references: [mobileSurveyPoints.id],
  }),
  relatedGeometry: one(mobileSurveyGeometries, {
    fields: [mobileSurveyAttachments.relatedGeometryId],
    references: [mobileSurveyGeometries.id],
  }),
}));

// Mobile Sync Cursors Relations
export const mobileSyncCursorsRelations = relations(mobileSyncCursors, ({ one }) => ({
  device: one(mobileDeviceRegistrations, {
    fields: [mobileSyncCursors.deviceId],
    references: [mobileDeviceRegistrations.id],
  }),
}));

// =============================================
// TECHNICAL REVIEW SYSTEM - RELATIONS
// =============================================

// Technical Review Cases Relations
export const technicalReviewCasesRelations = relations(technicalReviewCases, ({ one, many }) => ({
  application: one(applications, {
    fields: [technicalReviewCases.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [technicalReviewCases.reviewerId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [technicalReviewCases.assignedById],
    references: [users.id],
  }),
  reviewArtifacts: many(reviewArtifacts),
  ingestionJobs: many(ingestionJobs),
  rasterProducts: many(rasterProducts),
}));

// Review Artifacts Relations
export const reviewArtifactsRelations = relations(reviewArtifacts, ({ one }) => ({
  reviewCase: one(technicalReviewCases, {
    fields: [reviewArtifacts.reviewCaseId],
    references: [technicalReviewCases.id],
  }),
  ingestionJob: one(ingestionJobs, {
    fields: [reviewArtifacts.ingestionJobId],
    references: [ingestionJobs.id],
  }),
}));

// Ingestion Jobs Relations
export const ingestionJobsRelations = relations(ingestionJobs, ({ one, many }) => ({
  reviewCase: one(technicalReviewCases, {
    fields: [ingestionJobs.reviewCaseId],
    references: [technicalReviewCases.id],
  }),
  reviewArtifacts: many(reviewArtifacts),
  rasterProducts: many(rasterProducts),
}));

// Raster Products Relations
export const rasterProductsRelations = relations(rasterProducts, ({ one }) => ({
  reviewCase: one(technicalReviewCases, {
    fields: [rasterProducts.reviewCaseId],
    references: [technicalReviewCases.id],
  }),
  ingestionJob: one(ingestionJobs, {
    fields: [rasterProducts.ingestionJobId],
    references: [ingestionJobs.id],
  }),
}));

// =============================================
// MOBILE SURVEY SYSTEM - ZOD SCHEMAS
// =============================================

// Mobile Device Registration Schemas
export const insertMobileDeviceRegistrationSchema = createInsertSchema(mobileDeviceRegistrations).omit({
  id: true,
  registrationDate: true,
  lastSeenAt: true,
  lastSyncAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  deviceId: z.string().min(1, "Device ID is required"),
  deviceName: z.string().min(1, "Device name is required"),
  deviceType: z.enum(["mobile", "tablet"]),
  status: z.enum(["active", "suspended", "revoked"]).default("active"),
});

export type MobileDeviceRegistration = typeof mobileDeviceRegistrations.$inferSelect;
export type InsertMobileDeviceRegistration = z.infer<typeof insertMobileDeviceRegistrationSchema>;

// Mobile Field Visit Schemas
export const insertMobileFieldVisitSchema = createInsertSchema(mobileFieldVisits).omit({
  id: true,
  duration: true,
  totalDistance: true,
  coverageArea: true,
  qualityScore: true,
  isSynced: true,
  syncedAt: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  visitPurpose: z.enum(["survey", "inspection", "verification", "maintenance"]),
  visitStatus: z.enum(["active", "completed", "interrupted"]).default("active"),
  startLocation: z.object({
    lat: z.number().min(12).max(19),
    lng: z.number().min(42).max(55),
    accuracy: z.number().min(0),
    timestamp: z.string(),
  }).optional(),
  endLocation: z.object({
    lat: z.number().min(12).max(19),
    lng: z.number().min(42).max(55),
    accuracy: z.number().min(0),
    timestamp: z.string(),
  }).optional(),
  movementPath: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.array(z.number())),
    properties: z.record(z.any()).optional(),
  }).optional(),
});

export type MobileFieldVisit = typeof mobileFieldVisits.$inferSelect;
export type InsertMobileFieldVisit = z.infer<typeof insertMobileFieldVisitSchema>;

// Mobile Survey Session Schemas
export const insertMobileSurveySessionSchema = createInsertSchema(mobileSurveySessions).omit({
  id: true,
  sessionNumber: true,
  startTime: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["draft", "active", "paused", "completed", "submitted", "synced"]).default("draft"),
  surveyType: z.enum(["building_permit", "surveying_decision", "cadastral_survey"]),
  startLocation: z.object({
    lat: z.number().min(12).max(19),
    lng: z.number().min(42).max(55),
    accuracy: z.number().min(0),
    timestamp: z.string(),
  }).optional(),
  endLocation: z.object({
    lat: z.number().min(12).max(19),
    lng: z.number().min(42).max(55),
    accuracy: z.number().min(0),
    timestamp: z.string(),
  }).optional(),
  clientMetadata: z.object({
    appVersion: z.string(),
    deviceModel: z.string(),
    osVersion: z.string(),
  }).optional(),
});

export type MobileSurveySession = typeof mobileSurveySessions.$inferSelect;
export type InsertMobileSurveySession = z.infer<typeof insertMobileSurveySessionSchema>;

// Mobile Survey Point Schemas
export const insertMobileSurveyPointSchema = createInsertSchema(mobileSurveyPoints).omit({
  id: true,
  capturedAt: true,
  syncedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.number().min(12).max(19),
  longitude: z.number().min(42).max(55),
  elevation: z.number().optional(),
  horizontalAccuracy: z.number().min(0).optional(),
  verticalAccuracy: z.number().min(0).optional(),
  gpsSource: z.enum(["device", "external_receiver", "manual"]).default("device"),
  pointType: z.enum(["corner", "boundary", "reference", "building", "utility"]),
  qualityFlags: z.array(z.string()).optional(),
});

export type MobileSurveyPoint = typeof mobileSurveyPoints.$inferSelect;
export type InsertMobileSurveyPoint = z.infer<typeof insertMobileSurveyPointSchema>;

// Mobile Survey Geometry Schemas
export const insertMobileSurveyGeometrySchema = createInsertSchema(mobileSurveyGeometries).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  syncedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  geometryType: z.enum(["Point", "LineString", "Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()), // GeoJSON coordinates (flexible validation)
  properties: z.record(z.any()).optional(),
  featureType: z.enum(["building", "boundary", "road", "utility", "structure"]),
  area: z.number().min(0).optional(),
  perimeter: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  validationFlags: z.array(z.string()).optional(),
});

export type MobileSurveyGeometry = typeof mobileSurveyGeometries.$inferSelect;
export type InsertMobileSurveyGeometry = z.infer<typeof insertMobileSurveyGeometrySchema>;

// Mobile Survey Attachment Schemas
export const insertMobileSurveyAttachmentSchema = createInsertSchema(mobileSurveyAttachments).omit({
  id: true,
  fileName: true,
  uploadedAt: true,
  syncedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  originalFileName: z.string().min(1, "Original file name is required"),
  fileType: z.enum(["image", "video", "audio", "document"]),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().min(1).max(52428800), // 50MB max
  attachmentType: z.enum(["photo", "sketch", "document", "audio_note"]),
  captureLocation: z.object({
    lat: z.number().min(12).max(19),
    lng: z.number().min(42).max(55),
    accuracy: z.number().min(0),
  }).optional(),
  captureDirection: z.number().min(0).max(360).optional(),
  tags: z.array(z.string()).optional(),
  exifData: z.record(z.any()).optional(),
});

export type MobileSurveyAttachment = typeof mobileSurveyAttachments.$inferSelect;
export type InsertMobileSurveyAttachment = z.infer<typeof insertMobileSurveyAttachmentSchema>;

// Mobile Sync Cursor Schemas
export const insertMobileSyncCursorSchema = createInsertSchema(mobileSyncCursors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  entityType: z.enum(["sessions", "points", "geometries", "attachments", "all"]),
  syncDirection: z.enum(["up", "down", "bidirectional"]),
  lastSyncCursor: z.string().min(1, "Sync cursor is required"),
});

export type MobileSyncCursor = typeof mobileSyncCursors.$inferSelect;
export type InsertMobileSyncCursor = z.infer<typeof insertMobileSyncCursorSchema>;

// =============================================
// GEOPROCESSING QUEUE SYSTEM - Phase 1
// =============================================

// Geo Job Status Enum
export const geoJobStatus = pgEnum('geo_job_status', [
  'queued', 
  'running', 
  'completed', 
  'failed',
  'cancelled'
]);

// Target Type Enum for flexible geographic targeting
export const geoTargetType = pgEnum('geo_target_type', [
  'governorate',
  'district', 
  'subDistrict',
  'neighborhood',
  'neighborhoodUnit',
  'block',
  'plot',
  'tile',
  'none'
]);

// Geo Jobs - Production-grade Job Queue
export const geoJobs = pgTable('geo_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // Job queue management fields
  priority: smallint('priority').default(100), // Lower = higher priority
  scheduledAt: timestamp('scheduled_at').default(sql`CURRENT_TIMESTAMP`),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  lockedBy: text('locked_by'), // Worker ID that claimed this job
  lockedAt: timestamp('locked_at'),
  heartbeatAt: timestamp('heartbeat_at'),
  idempotencyKey: text('idempotency_key').unique(),
  correlationId: text('correlation_id'), // For tracing across systems
  
  // Task definition
  taskType: text('task_type').notNull(), // 'GEOTIFF_PROCESSING', 'RASTER_ANALYSIS', etc.
  taskVersion: text('task_version').default('1.0'),
  codeVersion: text('code_version'), // For tracking which worker version processed this
  status: geoJobStatus('status').notNull().default('queued'),
  
  // Flexible geographic targeting
  targetType: geoTargetType('target_type').default('none'),
  targetId: uuid('target_id'), // ID of the target entity
  
  // Legacy neighborhood unit reference (kept for common use case)
  neighborhoodUnitId: uuid('neighborhood_unit_id')
    .references(() => neighborhoodUnits.id, { onDelete: 'cascade' }),

  // File storage (Object Storage integration)
  inputKey: text('input_key').notNull(), // Object storage key for input file
  outputKeys: text('output_keys').array().default(sql`'{}'`), // Array of output file keys
  
  // Payload data
  inputPayload: jsonb('input_payload').notNull(), // Task parameters
  outputPayload: jsonb('output_payload'), // Results and metadata
  
  // Progress tracking
  progress: integer('progress').default(0), // 0-100
  message: text('message'), // Current status message
  
  // Error handling  
  error: jsonb('error'), // Structured error: {class, message, stack, context}
  
  // Ownership and security
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),

  // Timestamps
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  // Primary queue index for job polling
  statusPriorityScheduledIndex: index('geo_jobs_status_priority_scheduled_idx')
    .on(table.status, table.priority, table.scheduledAt, table.createdAt),
  
  // Geographic targeting index
  targetTypeIdIndex: index('geo_jobs_target_type_id_idx')
    .on(table.targetType, table.targetId),
  
  // Owner access index
  ownerCreatedIndex: index('geo_jobs_owner_created_idx')
    .on(table.ownerId, table.createdAt),
  
  // Correlation ID index for distributed tracing
  correlationIdIndex: index('geo_jobs_correlation_id_idx')
    .on(table.correlationId),
  
  // Partial index for active jobs only (performance optimization)
  activeJobsIndex: sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS geo_jobs_active_idx ON geo_jobs (status, priority, scheduled_at) WHERE status IN ('queued', 'running')`,
  
  // Constraints
  progressRange: sql`CONSTRAINT geo_jobs_progress_range CHECK (progress >= 0 AND progress <= 100)`,
  attemtsRange: sql`CONSTRAINT geo_jobs_attempts_range CHECK (attempts >= 0 AND attempts <= max_attempts)`,
  statusAttemptsConsistency: sql`CONSTRAINT geo_jobs_status_attempts_consistency CHECK (
    (status = 'failed' AND attempts >= max_attempts) OR 
    (status != 'failed') OR 
    (status = 'failed' AND max_attempts = 0)
  )`,
  heartbeatConsistency: sql`CONSTRAINT geo_jobs_heartbeat_consistency CHECK (
    (status = 'running' AND locked_by IS NOT NULL AND locked_at IS NOT NULL) OR 
    (status != 'running')
  )`
}));

// Geo Job Events - Audit Trail and Observability
export const geoJobEvents = pgTable('geo_job_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  
  jobId: uuid('job_id')
    .references(() => geoJobs.id, { onDelete: 'cascade' })
    .notNull(),
  
  // State transition tracking
  fromStatus: text('from_status'), // Previous status (null for initial events)
  toStatus: text('to_status').notNull(), // New status
  
  // Event details
  eventType: text('event_type').notNull(), // 'status_change', 'progress_update', 'error', 'heartbeat'
  message: text('message'),
  payload: jsonb('payload'), // Additional event data
  
  // Worker information
  workerId: text('worker_id'), // Which worker generated this event
  workerVersion: text('worker_version'),
  
  // Performance metrics
  processingTimeMs: integer('processing_time_ms'),
  memoryUsageMb: integer('memory_usage_mb'),
  
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  // Job events index for audit queries
  jobIdCreatedIndex: index('geo_job_events_job_id_created_idx')
    .on(table.jobId, table.createdAt),
  
  // Event type analysis index
  eventTypeCreatedIndex: index('geo_job_events_event_type_created_idx')
    .on(table.eventType, table.createdAt),
  
  // Worker performance analysis index
  workerIdCreatedIndex: index('geo_job_events_worker_id_created_idx')
    .on(table.workerId, table.createdAt)
}));

// Zod Schemas for Geo Jobs
export const insertGeoJobSchema = createInsertSchema(geoJobs).omit({
  id: true,
  attempts: true,
  lockedBy: true,
  lockedAt: true,
  heartbeatAt: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
}).extend({
  taskType: z.enum(['GEOTIFF_PROCESSING', 'RASTER_ANALYSIS', 'TILE_GENERATION']),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).default('queued'),
  targetType: z.enum(['governorate', 'district', 'subDistrict', 'neighborhood', 'neighborhoodUnit', 'block', 'plot', 'tile', 'none']).default('none'),
  priority: z.number().int().min(1).max(1000).default(100),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  progress: z.number().int().min(0).max(100).default(0),
  inputKey: z.string().min(1, "Input key is required"),
  outputKeys: z.array(z.string()).default([]),
  inputPayload: z.record(z.any()),
  outputPayload: z.record(z.any()).optional(),
});

export const insertGeoJobEventSchema = createInsertSchema(geoJobEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  eventType: z.enum(['status_change', 'progress_update', 'error', 'heartbeat', 'worker_assigned']),
  toStatus: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
  fromStatus: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  message: z.string().optional(),
  payload: z.record(z.any()).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
  memoryUsageMb: z.number().int().min(0).optional(),
});

export type GeoJob = typeof geoJobs.$inferSelect;
export type InsertGeoJob = z.infer<typeof insertGeoJobSchema>;
export type GeoJobEvent = typeof geoJobEvents.$inferSelect;
export type InsertGeoJobEvent = z.infer<typeof insertGeoJobEventSchema>;

// =============================================
// TECHNICAL REVIEW SYSTEM - ZOD SCHEMAS
// =============================================

// Technical Review Cases Schemas
export const insertTechnicalReviewCaseSchema = createInsertSchema(technicalReviewCases).omit({
  id: true,
  reviewVersion: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["pending", "in_progress", "completed", "approved", "rejected", "needs_modification"]).default("pending"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  reviewType: z.enum(["technical", "legal", "administrative"]).default("technical"),
  decision: z.enum(["approve", "reject", "modify", "return"]).optional(),
  workflowStage: z.string().default("technical_review_pending"),
});

export type TechnicalReviewCase = typeof technicalReviewCases.$inferSelect;
export type InsertTechnicalReviewCase = z.infer<typeof insertTechnicalReviewCaseSchema>;

// Review Artifacts Schemas
export const insertReviewArtifactSchema = createInsertSchema(reviewArtifacts).omit({
  id: true,
  artifactVersion: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  artifactType: z.enum(["geometry", "raster", "document", "calculation", "annotation"]),
  sourceType: z.enum(["mobile_sync", "csv_upload", "shapefile_upload", "manual_entry", "georaster_upload"]),
  geometryType: z.enum(["Point", "LineString", "Polygon", "MultiPolygon"]).optional(),
  crs: z.enum(["EPSG:4326", "EPSG:3857", "EPSG:32638"]).default("EPSG:4326"),
  validationStatus: z.enum(["pending", "valid", "invalid", "warning"]).default("pending"),
  status: z.enum(["active", "archived", "deleted", "superseded"]).default("active"),
  isVisible: z.boolean().default(true),
  layerOrder: z.number().int().min(1).default(1),
  strokeWidth: z.number().int().min(1).max(10).default(3),
});

export type ReviewArtifact = typeof reviewArtifacts.$inferSelect;
export type InsertReviewArtifact = z.infer<typeof insertReviewArtifactSchema>;

// Ingestion Jobs Schemas
export const insertIngestionJobSchema = createInsertSchema(ingestionJobs).omit({
  id: true,
  recordsProcessed: true,
  recordsValid: true,
  recordsInvalid: true,
  artifactsCreated: true,
  retryCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  jobType: z.enum(["mobile_sync", "csv_processing", "shapefile_processing", "georaster_processing"]),
  sourceFormat: z.enum(["csv", "shp", "tif", "tiff", "zip", "geojson", "kml"]).optional(),
  outputFormat: z.enum(["geojson", "postgis", "shapefile", "png"]).default("geojson"),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).default("pending"),
  progress: z.number().min(0).max(100).default(0),
  maxRetries: z.number().int().min(0).max(10).default(3),
});

export type IngestionJob = typeof ingestionJobs.$inferSelect;
export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;

// Raster Products Schemas
export const insertRasterProductSchema = createInsertSchema(rasterProducts).omit({
  id: true,
  accessCount: true,
  lastAccessedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  productType: z.enum(["basemap", "overlay", "orthophoto", "dem", "classification", "satellite"]),
  crs: z.enum(["EPSG:4326", "EPSG:3857", "EPSG:32638"]).default("EPSG:4326"),
  dataType: z.enum(["uint8", "uint16", "uint32", "float32", "float64"]).default("uint8"),
  processingLevel: z.enum(["raw", "processed", "orthorectified", "mosaic"]).default("raw"),
  status: z.enum(["processing", "ready", "error", "archived"]).default("processing"),
  validationStatus: z.enum(["pending", "valid", "invalid"]).default("pending"),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  bandCount: z.number().int().min(1).max(10).default(3),
  minZoomLevel: z.number().int().min(0).max(22).default(0),
  maxZoomLevel: z.number().int().min(0).max(22).default(18),
  opacity: z.number().min(0).max(1).default(1),
  isVisible: z.boolean().default(true),
  displayOrder: z.number().int().min(1).default(1),
});

export type RasterProduct = typeof rasterProducts.$inferSelect;
export type InsertRasterProduct = z.infer<typeof insertRasterProductSchema>;


