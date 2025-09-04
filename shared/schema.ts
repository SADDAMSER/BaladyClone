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

export const servicesRelations = relations(services, ({ many }) => ({
  applications: many(applications),
  serviceRequirements: many(serviceRequirements),
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
