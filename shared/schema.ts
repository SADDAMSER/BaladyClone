import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal, uuid } from "drizzle-orm/pg-core";
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

// Surveying Decisions
export const surveyingDecisions = pgTable("surveying_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").notNull(),
  decisionNumber: text("decision_number").notNull().unique(),
  plotLocation: jsonb("plot_location"), // coordinates, address details
  plotArea: decimal("plot_area", { precision: 10, scale: 2 }),
  boundaries: jsonb("boundaries"),
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

// Sectors table (القطاعات التخطيطية) - independent planning entities
export const sectors = pgTable("sectors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  governorateId: uuid("governorate_id")
    .references(() => governorates.id, { onDelete: "cascade" })
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
  code: text("code"),
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

export const insertSurveyingDecisionSchema = createInsertSchema(surveyingDecisions).omit({
  id: true,
  decisionNumber: true,
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
export type InsertSurveyingDecision = z.infer<typeof insertSurveyingDecisionSchema>;

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
  governorate: one(governorates, {
    fields: [sectors.governorateId],
    references: [governorates.id],
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

