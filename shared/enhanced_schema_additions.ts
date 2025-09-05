// =========================================================
// إضافات المخطط المحسن - منصة "بناء اليمن" الرقمية
// Enhanced Schema Additions for Yemen Digital Platform
// =========================================================

import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  boolean, 
  timestamp, 
  jsonb, 
  decimal, 
  uuid,
  date,
  pgEnum,
  inet
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =========================================================
// Enhanced ENUM Types
// =========================================================

export const notificationPriorityEnum = pgEnum('notification_priority_enum', ['low', 'normal', 'high', 'urgent']);
export const attachmentVerificationStatusEnum = pgEnum('attachment_verification_status', ['pending', 'verified', 'rejected', 'expired']);
export const digitalSignatureStatusEnum = pgEnum('digital_signature_status', ['valid', 'invalid', 'expired', 'revoked']);
export const surveyDeviceStatusEnum = pgEnum('survey_device_status', ['active', 'maintenance', 'calibration', 'retired']);

// =========================================================
// Enhanced Application Attachments System
// =========================================================

export const applicationAttachments = pgTable("application_attachments", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  applicationId: uuid("application_id").notNull(),
  requirementId: uuid("requirement_id"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 10 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: uuid("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
  verificationStatus: attachmentVerificationStatusEnum("verification_status").default('pending'),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  checksum: varchar("checksum", { length: 255 }),
  isEncrypted: boolean("is_encrypted").default(false),
  retentionDate: date("retention_date"),
});

// =========================================================
// Advanced Workflow System
// =========================================================

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  description: text("description"),
  serviceCategoryId: uuid("service_category_id"),
  stepsConfiguration: jsonb("steps_configuration").notNull(),
  autoAssignmentRules: jsonb("auto_assignment_rules"),
  escalationRules: jsonb("escalation_rules"),
  notificationRules: jsonb("notification_rules"),
  slaRules: jsonb("sla_rules"),
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const businessRules = pgTable("business_rules", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  ruleNameEn: varchar("rule_name_en", { length: 255 }),
  description: text("description"),
  serviceId: uuid("service_id"),
  category: varchar("category", { length: 100 }),
  conditions: jsonb("conditions").notNull(),
  actions: jsonb("actions").notNull(),
  priority: integer("priority").default(0),
  executionOrder: integer("execution_order").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// =========================================================
// Enhanced Notifications System
// =========================================================

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  templateName: varchar("template_name", { length: 100 }).notNull().unique(),
  titleAr: varchar("title_ar", { length: 255 }).notNull(),
  titleEn: varchar("title_en", { length: 255 }),
  contentAr: text("content_ar").notNull(),
  contentEn: text("content_en"),
  variables: jsonb("variables"),
  channelTypes: text("channel_types").array().default(sql`ARRAY['in_app']`),
  priority: notificationPriorityEnum("priority").default('normal'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const notificationQueue = pgTable("notification_queue", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  recipientId: uuid("recipient_id").notNull(),
  templateId: uuid("template_id"),
  channelType: varchar("channel_type", { length: 20 }).notNull(),
  priority: notificationPriorityEnum("priority").default('normal'),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  data: jsonb("data"),
  scheduledAt: timestamp("scheduled_at").default(sql`CURRENT_TIMESTAMP`),
  sentAt: timestamp("sent_at"),
  deliveryStatus: varchar("delivery_status", { length: 50 }).default('pending'),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  errorMessage: text("error_message"),
  expiresAt: timestamp("expires_at"),
});

// =========================================================
// Digital Signatures & Document Security
// =========================================================

export const digitalSignatures = pgTable("digital_signatures", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  documentId: uuid("document_id").notNull(),
  signerId: uuid("signer_id").notNull(),
  signatureHash: varchar("signature_hash", { length: 255 }).notNull(),
  signatureAlgorithm: varchar("signature_algorithm", { length: 50 }).default('SHA256'),
  certificateInfo: jsonb("certificate_info"),
  signatureData: text("signature_data").notNull(),
  signedAt: timestamp("signed_at").default(sql`CURRENT_TIMESTAMP`),
  ipAddress: inet("ip_address"),
  deviceInfo: jsonb("device_info"),
  geolocation: jsonb("geolocation"),
  status: digitalSignatureStatusEnum("status").default('valid'),
  verificationCount: integer("verification_count").default(0),
  lastVerifiedAt: timestamp("last_verified_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by"),
  revocationReason: text("revocation_reason"),
});

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  documentId: uuid("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  checksum: varchar("checksum", { length: 255 }).notNull(),
  changesSummary: text("changes_summary"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  isCurrent: boolean("is_current").default(false),
});

// =========================================================
// Advanced Survey Equipment & Data
// =========================================================

export const surveyDevices = pgTable("survey_devices", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  deviceSerial: varchar("device_serial", { length: 100 }).notNull().unique(),
  deviceModel: varchar("device_model", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  deviceType: varchar("device_type", { length: 100 }),
  assignedToSurveyorId: uuid("assigned_to_surveyor_id"),
  lastCalibrationDate: date("last_calibration_date"),
  calibrationCertificate: varchar("calibration_certificate", { length: 500 }),
  accuracySpecification: varchar("accuracy_specification", { length: 100 }),
  status: surveyDeviceStatusEnum("status").default('active'),
  maintenanceSchedule: jsonb("maintenance_schedule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const rawSurveyData = pgTable("raw_survey_data", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  surveyRequestId: uuid("survey_request_id").notNull(),
  deviceId: uuid("device_id").notNull(),
  sessionId: varchar("session_id", { length: 100 }),
  pointSequence: integer("point_sequence").notNull(),
  pointName: varchar("point_name", { length: 100 }),
  pointCode: varchar("point_code", { length: 50 }),
  latitude: decimal("latitude", { precision: 12, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 12, scale: 8 }).notNull(),
  elevation: decimal("elevation", { precision: 8, scale: 3 }),
  accuracyHorizontal: decimal("accuracy_horizontal", { precision: 5, scale: 3 }),
  accuracyVertical: decimal("accuracy_vertical", { precision: 5, scale: 3 }),
  pointType: varchar("point_type", { length: 50 }),
  measurementMethod: varchar("measurement_method", { length: 50 }),
  notes: text("notes"),
  qualityIndicators: jsonb("quality_indicators"),
  recordedAt: timestamp("recorded_at").default(sql`CURRENT_TIMESTAMP`),
  processedAt: timestamp("processed_at"),
  isValidated: boolean("is_validated").default(false),
});

export const surveyCalculations = pgTable("survey_calculations", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  surveyRequestId: uuid("survey_request_id").notNull(),
  calculationType: varchar("calculation_type", { length: 100 }).notNull(),
  inputPoints: jsonb("input_points").notNull(),
  calculationMethod: varchar("calculation_method", { length: 100 }),
  resultValue: decimal("result_value", { precision: 15, scale: 6 }),
  resultUnit: varchar("result_unit", { length: 20 }),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),
  calculationMetadata: jsonb("calculation_metadata"),
  calculatedBy: uuid("calculated_by"),
  calculatedAt: timestamp("calculated_at").default(sql`CURRENT_TIMESTAMP`),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at"),
  isFinal: boolean("is_final").default(false),
});

// =========================================================
// Performance Metrics & Analytics
// =========================================================

export const servicePerformanceMetrics = pgTable("service_performance_metrics", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  serviceId: uuid("service_id").notNull(),
  departmentId: uuid("department_id"),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  measurementUnit: varchar("measurement_unit", { length: 50 }),
  measurementPeriodStart: date("measurement_period_start").notNull(),
  measurementPeriodEnd: date("measurement_period_end").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  benchmarkValue: decimal("benchmark_value", { precision: 15, scale: 2 }),
  trendDirection: varchar("trend_direction", { length: 20 }),
  additionalData: jsonb("additional_data"),
  calculatedAt: timestamp("calculated_at").default(sql`CURRENT_TIMESTAMP`),
  calculatedBy: uuid("calculated_by"),
});

export const userActivityLogs = pgTable("user_activity_logs", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  userId: uuid("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: uuid("resource_id"),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  geolocation: jsonb("geolocation"),
  activityDetails: jsonb("activity_details"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// =========================================================
// System Integration & API Management
// =========================================================

export const apiEndpoints = pgTable("api_endpoints", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  endpointName: varchar("endpoint_name", { length: 255 }).notNull(),
  endpointPath: varchar("endpoint_path", { length: 500 }).notNull(),
  httpMethod: varchar("http_method", { length: 10 }).notNull(),
  serviceId: uuid("service_id"),
  description: text("description"),
  requestSchema: jsonb("request_schema"),
  responseSchema: jsonb("response_schema"),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  requiresAuthentication: boolean("requires_authentication").default(true),
  requiredPermissions: text("required_permissions").array(),
  isActive: boolean("is_active").default(true),
  version: varchar("version", { length: 20 }).default('1.0'),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  endpointId: uuid("endpoint_id").notNull(),
  userId: uuid("user_id"),
  requestId: varchar("request_id", { length: 100 }).unique(),
  ipAddress: inet("ip_address"),
  requestMethod: varchar("request_method", { length: 10 }),
  requestPath: varchar("request_path", { length: 500 }),
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  responseTimeMs: integer("response_time_ms"),
  responseSizeBytes: integer("response_size_bytes"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// =========================================================
// Advanced System Configuration
// =========================================================

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  flagName: varchar("flag_name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0),
  targetUsers: jsonb("target_users"),
  targetDepartments: jsonb("target_departments"),
  environment: varchar("environment", { length: 50 }).default('production'),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const systemHealthChecks = pgTable("system_health_checks", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v4()`),
  checkName: varchar("check_name", { length: 100 }).notNull(),
  checkType: varchar("check_type", { length: 50 }).notNull(),
  targetResource: varchar("target_resource", { length: 255 }),
  status: varchar("status", { length: 20 }).default('unknown'),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  additionalInfo: jsonb("additional_info"),
  checkedAt: timestamp("checked_at").default(sql`CURRENT_TIMESTAMP`),
});

// =========================================================
// Relations for Enhanced Tables
// =========================================================

export const workflowTemplatesRelations = relations(workflowTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [workflowTemplates.createdBy],
    references: [users.id],
  }),
}));

export const businessRulesRelations = relations(businessRules, ({ one }) => ({
  service: one(services, {
    fields: [businessRules.serviceId],
    references: [services.id],
  }),
  createdBy: one(users, {
    fields: [businessRules.createdBy],
    references: [users.id],
  }),
}));

export const applicationAttachmentsRelations = relations(applicationAttachments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationAttachments.applicationId],
    references: [applications.id],
  }),
  uploadedBy: one(users, {
    fields: [applicationAttachments.uploadedBy],
    references: [users.id],
  }),
  verifiedBy: one(users, {
    fields: [applicationAttachments.verifiedBy],
    references: [users.id],
  }),
}));

export const digitalSignaturesRelations = relations(digitalSignatures, ({ one }) => ({
  signer: one(users, {
    fields: [digitalSignatures.signerId],
    references: [users.id],
  }),
  revokedBy: one(users, {
    fields: [digitalSignatures.revokedBy],
    references: [users.id],
  }),
}));

export const surveyDevicesRelations = relations(surveyDevices, ({ one, many }) => ({
  assignedToSurveyor: one(users, {
    fields: [surveyDevices.assignedToSurveyorId],
    references: [users.id],
  }),
  surveyData: many(rawSurveyData),
}));

export const rawSurveyDataRelations = relations(rawSurveyData, ({ one }) => ({
  surveyRequest: one(surveyingDecisions, {
    fields: [rawSurveyData.surveyRequestId],
    references: [surveyingDecisions.id],
  }),
  device: one(surveyDevices, {
    fields: [rawSurveyData.deviceId],
    references: [surveyDevices.id],
  }),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

// =========================================================
// Enhanced Type Exports
// =========================================================

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type BusinessRule = typeof businessRules.$inferSelect;
export type ApplicationAttachment = typeof applicationAttachments.$inferSelect;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NotificationQueue = typeof notificationQueue.$inferSelect;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type SurveyDevice = typeof surveyDevices.$inferSelect;
export type RawSurveyData = typeof rawSurveyData.$inferSelect;
export type SurveyCalculation = typeof surveyCalculations.$inferSelect;
export type ServicePerformanceMetric = typeof servicePerformanceMetrics.$inferSelect;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type ApiEndpoint = typeof apiEndpoints.$inferSelect;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type SystemHealthCheck = typeof systemHealthChecks.$inferSelect;

// =========================================================
// Enhanced Insert Schemas
// =========================================================

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessRuleSchema = createInsertSchema(businessRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationAttachmentSchema = createInsertSchema(applicationAttachments).omit({
  id: true,
  uploadedAt: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({
  id: true,
  signedAt: true,
  verificationCount: true,
});

export const insertSurveyDeviceSchema = createInsertSchema(surveyDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRawSurveyDataSchema = createInsertSchema(rawSurveyData).omit({
  id: true,
  recordedAt: true,
});

export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type InsertBusinessRule = z.infer<typeof insertBusinessRuleSchema>;
export type InsertApplicationAttachment = z.infer<typeof insertApplicationAttachmentSchema>;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;
export type InsertSurveyDevice = z.infer<typeof insertSurveyDeviceSchema>;
export type InsertRawSurveyData = z.infer<typeof insertRawSurveyDataSchema>;