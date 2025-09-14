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
