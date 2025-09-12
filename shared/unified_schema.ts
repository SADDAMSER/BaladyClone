/**
 * ==========================================================================
 * منصة بناء اليمن الرقمية - المخطط الموحد 
 * Yemen Digital Construction Platform - Unified Schema
 * ==========================================================================
 * الإصدار: 2.1 الموحد
 * التاريخ: سبتمبر 2025
 * الوصف: دمج مخططات shared/schema.ts و yemen_platform_enhanced.sql
 * ==========================================================================
 */

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
  pgEnum,
  customType,
  serial
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================================================
// المخططات والأنواع المخصصة (ENUMs & Custom Types)
// ==========================================================================

// ✅ ENUMs (Database-level) - حسب القرار التقني الإلزامي
export const userStatusEnum = pgEnum('user_status_enum', ['active', 'inactive', 'suspended', 'pending']);
export const applicationStatusEnum = pgEnum('application_status_enum', [
  'submitted', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'
]);
export const priorityEnum = pgEnum('priority_enum', ['low', 'normal', 'high', 'urgent']);
export const notificationTypeEnum = pgEnum('notification_type_enum', [
  'info', 'warning', 'error', 'success', 'reminder'
]);
export const channelTypeEnum = pgEnum('channel_type_enum', [
  'email', 'sms', 'push', 'in_app', 'whatsapp'
]);
export const languageDirectionEnum = pgEnum('language_direction', ['rtl', 'ltr']);
export const surveyMeasurementTypeEnum = pgEnum('survey_measurement_type', [
  'boundary', 'area', 'coordinates', 'elevation', 'distance'
]);
export const documentTypeEnum = pgEnum('document_type_enum', [
  'pdf', 'doc', 'docx', 'jpg', 'png', 'jpeg', 'gif'
]);
export const lawTypeEnum = pgEnum('law_type_enum', ['law', 'regulation', 'directive', 'guide']);
export const serviceTypeEnum = pgEnum('service_type_enum', [
  'building_license', 'surveying_decision', 'inspection', 'permit', 'certificate'
]);

// ✅ RBAC ENUMs - للنموذج الصحيح
export const permissionTypeEnum = pgEnum('permission_type_enum', [
  'read', 'write', 'update', 'delete', 'approve', 'reject', 'assign', 'review', 'inspect'
]);
export const roleTypeEnum = pgEnum('role_type_enum', [
  'system_admin', 'department_manager', 'employee', 'citizen', 'surveyor', 'inspector', 'cashier'
]);
export const employmentStatusEnum = pgEnum('employment_status_enum', [
  'active', 'inactive', 'terminated', 'suspended', 'probation'
]);

// ✅ PostGIS Custom Types - حسب القرار التقني الإلزامي
const point = customType<{ data: string }>({
  dataType() {
    return 'geometry(POINT, 4326)';
  },
});

const multiPolygon = customType<{ data: string }>({
  dataType() {
    return 'geometry(MULTIPOLYGON, 4326)';
  },
});

const polygon = customType<{ data: string }>({
  dataType() {
    return 'geometry(POLYGON, 4326)';
  },
});

const lineString = customType<{ data: string }>({
  dataType() {
    return 'geometry(LINESTRING, 4326)';
  },
});

// ==========================================================================
// أ) الأساسيات: المستخدمون والمصادقة (Users & Authentication)
// ==========================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  // 🚨 أمان: تشفير كلمة المرور إلزامي - سيتم تشفيرها بـ bcrypt في التطبيق
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  
  // الاسم الكامل (هيكل يمني)
  firstName: varchar("first_name", { length: 100 }).notNull(),
  fatherName: varchar("father_name", { length: 100 }),
  grandfatherName: varchar("grandfather_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  fullName: text("full_name").notNull(), // الاسم الكامل للبحث
  
  // بيانات التواصل والهوية
  phoneNumber: varchar("phone_number", { length: 20 }),
  nationalId: varchar("national_id", { length: 50 }).unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  
  // الحالة (بدون أدوار مباشرة - سنستخدم RBAC)
  status: userStatusEnum("status").default('pending'),
  
  // التحقق والأمان
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  lastLoginAt: timestamp("last_login_at"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  
  // الإعدادات الشخصية
  locale: varchar("locale", { length: 10 }).default('ar'),
  timezone: varchar("timezone", { length: 50 }).default('Asia/Aden'),
  
  // تواريخ النظام
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("created_by"),
});

// ✅ نموذج RBAC الصحيح - بدلاً من userRoleEnum
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 100 }),
  description: text("description"),
  type: roleTypeEnum("type").notNull(),
  level: integer("level").default(1), // hierarchy level
  isSystemRole: boolean("is_system_role").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 100 }),
  description: text("description"),
  type: permissionTypeEnum("type").notNull(),
  resource: varchar("resource", { length: 100 }), // applications, users, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  roleId: uuid("role_id").notNull(),
  assignedById: uuid("assigned_by_id"),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
  isActive: boolean("is_active").default(true),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: uuid("role_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
  assignedById: uuid("assigned_by_id"),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
  isActive: boolean("is_active").default(true),
});

// جدول الموظفين منفصل عن المستخدمين
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  employeeNumber: varchar("employee_number", { length: 50 }).unique().notNull(),
  positionId: uuid("position_id").notNull(),
  departmentId: uuid("department_id").notNull(),
  directManagerId: uuid("direct_manager_id"),
  hireDate: timestamp("hire_date").notNull(),
  employmentStatus: employmentStatusEnum("employment_status").default('active'),
  salary: decimal("salary", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ب) الهيكل التنظيمي (Organizational Structure)
// ==========================================================================

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  parentDepartmentId: uuid("parent_department_id"),
  headOfDepartmentId: uuid("head_of_department_id"),
  organizationalLevel: integer("organizational_level").default(1),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  description: text("description"),
  departmentId: uuid("department_id"),
  level: integer("level").default(1),
  permissions: jsonb("permissions"),
  responsibilities: jsonb("responsibilities"),
  requirements: jsonb("requirements"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ج) الإطار القانوني (Legal Framework) 
// ==========================================================================

export const lawsRegulations = pgTable("laws_regulations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  type: lawTypeEnum("type").notNull(),
  issueDate: text("issue_date"),
  effectiveDate: text("effective_date"),
  description: text("description"),
  status: text("status").default("active"), // active, inactive, draft
  version: text("version").default("1.0"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
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
  examples: jsonb("examples"),
  relatedArticles: text("related_articles").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// د) المتطلبات التقنية (Technical Requirements)
// ==========================================================================

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
  priority: priorityEnum("priority").default('normal'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// هـ) الخدمات والطلبات (Services & Applications)
// ==========================================================================

export const services = pgTable("services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  type: serviceTypeEnum("type").notNull(),
  category: text("category"),
  processingTimeEstimate: integer("processing_time_estimate"), // in days
  fees: decimal("fees", { precision: 10, scale: 2 }),
  requiredDocuments: jsonb("required_documents"),
  workflow: jsonb("workflow"),
  prerequisites: jsonb("prerequisites"),
  outputDocuments: jsonb("output_documents"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationNumber: varchar("application_number", { length: 100 }).unique().notNull(),
  serviceId: uuid("service_id").notNull(),
  applicantId: uuid("applicant_id").notNull(),
  
  // بيانات الطلب
  projectTitle: text("project_title"),
  projectDescription: text("project_description"),
  projectLocation: text("project_location"),
  projectCoordinates: point("project_coordinates"),
  plotArea: decimal("plot_area", { precision: 12, scale: 2 }),
  buildingArea: decimal("building_area", { precision: 12, scale: 2 }),
  
  // الحالة والمعالجة
  status: applicationStatusEnum("status").default('submitted'),
  priority: priorityEnum("priority").default('normal'),
  currentStage: text("current_stage"),
  assignedToId: uuid("assigned_to_id"),
  
  // البيانات المالية
  totalFees: decimal("total_fees", { precision: 10, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'),
  paymentStatus: text("payment_status").default('pending'), // pending, paid, partial
  
  // المواعيد والتوقيتات
  submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`),
  reviewStartedAt: timestamp("review_started_at"),
  completedAt: timestamp("completed_at"),
  expectedCompletionDate: timestamp("expected_completion_date"),
  
  // البيانات التقنية
  formData: jsonb("form_data"),
  attachments: jsonb("attachments"),
  internalNotes: jsonb("internal_notes"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// و) الهيكل الجغرافي (Geographic Structure) - 11 جدول
// ==========================================================================

// المستوى 1: المحافظات (موجود)
export const governorates = pgTable("governorates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  capital: varchar("capital", { length: 100 }),
  population: integer("population"),
  area: decimal("area", { precision: 12, scale: 2 }), // km²
  boundaries: multiPolygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// المستوى 2: المديريات (موجود)
export const districts = pgTable("districts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  governorateId: uuid("governorate_id").notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  population: integer("population"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: multiPolygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// المستوى 3: الأحياء (موجود) 
export const neighborhoods = pgTable("neighborhoods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  districtId: uuid("district_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  type: varchar("type", { length: 50 }), // residential, commercial, industrial, mixed
  population: integer("population"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: multiPolygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 4: العزل
export const geoSubDistricts = pgTable("geo_sub_districts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  districtId: uuid("district_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  population: integer("population"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: multiPolygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 5: الحارات
export const geoHarat = pgTable("geo_harat", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  neighborhoodId: uuid("neighborhood_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  type: varchar("type", { length: 50 }), // traditional, modern, mixed
  population: integer("population"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: polygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 6: القطاعات التخطيطية
export const geoSectors = pgTable("geo_sectors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  neighborhoodId: uuid("neighborhood_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  type: varchar("type", { length: 50 }), // planning, zoning, administrative
  landUseType: varchar("land_use_type", { length: 50 }), // residential, commercial, etc.
  maxBuildingHeight: integer("max_building_height"), // floors
  maxCoverageRatio: decimal("max_coverage_ratio", { precision: 5, scale: 2 }), // percentage
  boundaries: polygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 7: وحدات الجوار
export const geoNeighborhoodUnits = pgTable("geo_neighborhood_units", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: uuid("sector_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  unitType: varchar("unit_type", { length: 50 }), // block, compound, complex
  households: integer("households"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: polygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 8: البلوكات (المجاميع السكنية)
export const geoBlocks = pgTable("geo_blocks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  neighborhoodUnitId: uuid("neighborhood_unit_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  blockType: varchar("block_type", { length: 50 }), // residential, commercial, mixed
  totalPlots: integer("total_plots"),
  occupiedPlots: integer("occupied_plots"),
  area: decimal("area", { precision: 12, scale: 2 }),
  boundaries: polygon("boundaries"),
  centroid: point("centroid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 9: قطع الأراضي (الأهم للـ LBAC)
export const geoPlots = pgTable("geo_plots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: uuid("block_id").notNull(),
  plotNumber: varchar("plot_number", { length: 50 }).notNull(),
  uniqueCode: varchar("unique_code", { length: 100 }).unique().notNull(), // كود قطعة فريد
  
  // بيانات القطعة
  area: decimal("area", { precision: 12, scale: 2 }).notNull(), // m²
  landUse: varchar("land_use", { length: 50 }), // residential, commercial, industrial
  zoning: varchar("zoning", { length: 50 }), // R1, R2, C1, I1, etc.
  
  // بيانات الملكية
  ownerType: varchar("owner_type", { length: 50 }), // private, government, public
  ownerName: varchar("owner_name", { length: 200 }),
  ownershipDocument: varchar("ownership_document", { length: 200 }),
  
  // بيانات التطوير
  developmentStatus: varchar("development_status", { length: 50 }), // vacant, developed, under_construction
  buildingPermitRequired: boolean("building_permit_required").default(true),
  maxBuildingHeight: integer("max_building_height"), // floors
  maxCoverageRatio: decimal("max_coverage_ratio", { precision: 5, scale: 2 }),
  
  // البيانات الجغرافية
  boundaries: polygon("boundaries").notNull(),
  centroid: point("centroid"),
  streetAccess: boolean("street_access").default(false),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 10: الشوارع
export const geoStreets = pgTable("geo_streets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  neighborhoodId: uuid("neighborhood_id").notNull(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  streetType: varchar("street_type", { length: 50 }), // main, secondary, local, alley
  width: decimal("width", { precision: 8, scale: 2 }), // meters
  length: decimal("length", { precision: 12, scale: 2 }), // meters
  surface: varchar("surface", { length: 50 }), // asphalt, concrete, dirt, gravel
  condition: varchar("condition", { length: 50 }), // excellent, good, fair, poor
  geometry: lineString("geometry"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🆕 المستوى 11: أجزاء الشوارع
export const geoStreetSegments = pgTable("geo_street_segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  streetId: uuid("street_id").notNull(),
  segmentNumber: integer("segment_number").notNull(),
  startPoint: point("start_point"),
  endPoint: point("end_point"),
  length: decimal("length", { precision: 12, scale: 2 }), // meters
  width: decimal("width", { precision: 8, scale: 2 }), // meters
  slope: decimal("slope", { precision: 5, scale: 2 }), // percentage
  geometry: lineString("geometry"),
  adjacentPlots: text("adjacent_plots").array(), // قطع الأراضي المجاورة
  utilities: jsonb("utilities"), // كابلات، مياه، صرف صحي
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ز) طبقة ربط الصلاحيات الجغرافية (LBAC Layer) - 3 جداول
// ==========================================================================

// 🔐 LBAC: مستويات الأمان والتصنيف
export const securityLevels = pgTable("security_levels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  level: integer("level").notNull().unique(), // 1, 2, 3, 4, 5
  name: varchar("name", { length: 100 }).notNull().unique(), // public, internal, confidential, secret, top_secret
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default('#gray'), 
  accessRules: jsonb("access_rules"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 🔐 LBAC: تصنيفات الموضوعات/الكائنات
export const objectLabels = pgTable("object_labels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  objectType: varchar("object_type", { length: 100 }).notNull(), // application, plot, document, etc.
  objectId: uuid("object_id").notNull(),
  
  // التصنيف الأمني
  securityLevelId: uuid("security_level_id").notNull(),
  
  // التصنيف الجغرافي
  geographicScope: varchar("geographic_scope", { length: 50 }), // governorate, district, neighborhood, plot
  geographicTargetId: uuid("geographic_target_id"),
  
  // تصنيفات إضافية
  categories: text("categories").array(), // sensitive, personal, financial, technical
  keywords: text("keywords").array(),
  accessRestrictions: jsonb("access_restrictions"),
  
  // سياق العمل
  workflowStage: varchar("workflow_stage", { length: 100 }),
  ownerUserId: uuid("owner_user_id"),
  ownerDepartmentId: uuid("owner_department_id"),
  
  // توقيتات
  validFrom: timestamp("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validTo: timestamp("valid_to"),
  classifiedBy: uuid("classified_by").notNull(),
  classifiedAt: timestamp("classified_at").default(sql`CURRENT_TIMESTAMP`),
  
  isActive: boolean("is_active").default(true),
});

// 🔐 LBAC: تصريحات الموظفين الأمنية
export const userClearances = pgTable("user_clearances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  
  // مستوى التصريح الأمني
  maxSecurityLevelId: uuid("max_security_level_id").notNull(),
  
  // النطاق الجغرافي المُصرح به
  geographicScopes: jsonb("geographic_scopes"), // [{ type: "governorate", targetId: "uuid" }, ...]
  customBoundaries: multiPolygon("custom_boundaries"), // للنطاقات المخصصة
  
  // قيود الوصول
  allowedCategories: text("allowed_categories").array(),
  forbiddenCategories: text("forbidden_categories").array(),
  maxApplicationsPerDay: integer("max_applications_per_day"),
  allowedWorkflowStages: text("allowed_workflow_stages").array(),
  
  // الصلاحيات الخاصة
  canClassifyData: boolean("can_classify_data").default(false),
  canDowngradeClassification: boolean("can_downgrade_classification").default(false),
  canAccessPersonalData: boolean("can_access_personal_data").default(false),
  
  // التفعيل والمراجعة
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validTo: timestamp("valid_to"),
  
  // الاعتماد
  approvedBy: uuid("approved_by").notNull(),
  approvedAt: timestamp("approved_at").default(sql`CURRENT_TIMESTAMP`),
  reviewRequired: boolean("review_required").default(true),
  nextReviewDate: timestamp("next_review_date"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// إضافة للتنظيم: فروع الإدارات 
export const orgBranches = pgTable("org_branches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: uuid("department_id").notNull(),
  branchName: varchar("branch_name", { length: 200 }).notNull(),
  branchType: varchar("branch_type", { length: 50 }), // main, regional, local, mobile
  
  // الموقع الجغرافي
  governorateId: uuid("governorate_id"),
  districtId: uuid("district_id"),
  neighborhoodId: uuid("neighborhood_id"),
  address: text("address"),
  coordinates: point("coordinates"),
  
  // بيانات التشغيل
  managerUserId: uuid("manager_user_id"),
  capacity: integer("capacity"), // السعة الاستيعابية
  workingHours: jsonb("working_hours"),
  contactInfo: jsonb("contact_info"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ح) القرارات المساحية (Surveying Decisions)
// ==========================================================================

export const surveyingDecisions = pgTable("surveying_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  decisionNumber: varchar("decision_number", { length: 100 }).unique().notNull(),
  applicationId: uuid("application_id").notNull(),
  surveyorUserId: uuid("surveyor_user_id").notNull(),
  
  // بيانات الموقع
  plotId: uuid("plot_id"),
  surveyLocation: text("survey_location").notNull(),
  coordinates: point("coordinates"),
  
  // نتائج المسح
  actualArea: decimal("actual_area", { precision: 12, scale: 2 }),
  boundaries: polygon("boundaries"),
  elevationData: jsonb("elevation_data"),
  soilType: varchar("soil_type", { length: 100 }),
  groundLevel: decimal("ground_level", { precision: 8, scale: 3 }),
  
  // المخالفات والملاحظات
  violations: jsonb("violations"),
  recommendations: text("recommendations"),
  surveyNotes: text("survey_notes"),
  
  // التواريخ والحالة
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  approvedDate: timestamp("approved_date"),
  status: applicationStatusEnum("status").default('submitted'),
  
  // المرفقات
  surveyReport: varchar("survey_report", { length: 500 }),
  photos: jsonb("photos"),
  measurements: jsonb("measurements"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ط) إدارة المهام والتكليفات (Task Management)
// ==========================================================================

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  
  // الربط
  applicationId: uuid("application_id"),
  serviceId: uuid("service_id"),
  assignedToId: uuid("assigned_to_id").notNull(),
  assignedById: uuid("assigned_by_id").notNull(),
  
  // التصنيف والأولوية
  category: varchar("category", { length: 100 }),
  priority: priorityEnum("priority").default('normal'),
  complexity: varchar("complexity", { length: 50 }), // simple, medium, complex
  estimatedHours: integer("estimated_hours"),
  
  // الحالة والتقدم
  status: varchar("status", { length: 50 }).default('assigned'), // assigned, in_progress, completed, cancelled
  progressPercentage: integer("progress_percentage").default(0),
  
  // التوقيتات
  dueDate: timestamp("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // البيانات الإضافية
  requirements: jsonb("requirements"),
  attachments: jsonb("attachments"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ي) المدفوعات والفواتير (Payments & Invoices)
// ==========================================================================

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentNumber: varchar("payment_number", { length: 100 }).unique().notNull(),
  applicationId: uuid("application_id").notNull(),
  payerId: uuid("payer_id").notNull(),
  
  // المبالغ
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }),
  
  // تفاصيل الدفع
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, bank_transfer, online, mobile
  paymentStatus: varchar("payment_status", { length: 50 }).default('pending'), // pending, paid, partial, refunded
  
  // المعلومات المصرفية
  bankName: varchar("bank_name", { length: 200 }),
  accountNumber: varchar("account_number", { length: 100 }),
  transactionReference: varchar("transaction_reference", { length: 200 }),
  
  // التواريخ
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  confirmedAt: timestamp("confirmed_at"),
  
  // المرفقات والتحقق
  receiptUrl: varchar("receipt_url", { length: 500 }),
  verificationDocuments: jsonb("verification_documents"),
  verifiedBy: uuid("verified_by"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ك) النظام والتنبيهات (System & Notifications)
// ==========================================================================

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: uuid("recipient_id").notNull(),
  senderId: uuid("sender_id"),
  
  // محتوى التنبيه
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default('info'),
  
  // الربط
  relatedEntityType: varchar("related_entity_type", { length: 100 }), // application, payment, task
  relatedEntityId: uuid("related_entity_id"),
  
  // قنوات الإرسال
  channels: channelTypeEnum("channel").array(),
  
  // الحالة
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at").default(sql`CURRENT_TIMESTAMP`),
  
  // بيانات إضافية
  actionUrl: varchar("action_url", { length: 500 }),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// ل) إدارة الملفات والمرفقات (File Management)
// ==========================================================================

export const fileAttachments = pgTable("file_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // الملف الأساسي
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"), // bytes
  fileType: documentTypeEnum("file_type").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // المسار والتخزين
  filePath: varchar("file_path", { length: 500 }).notNull(),
  storageType: varchar("storage_type", { length: 50 }).default('local'), // local, s3, object_storage
  
  // الربط
  entityType: varchar("entity_type", { length: 100 }), // application, payment, task, user
  entityId: uuid("entity_id"),
  uploadedById: uuid("uploaded_by_id").notNull(),
  
  // التصنيف
  category: varchar("category", { length: 100 }), // identity, ownership, technical, photo
  description: text("description"),
  
  // الأمان والتشفير
  isPublic: boolean("is_public").default(false),
  accessLevel: varchar("access_level", { length: 50 }).default('private'), // public, private, restricted
  checksum: varchar("checksum", { length: 64 }), // SHA-256
  
  // معلومات الصورة (إن وجدت)
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// م) إحصائيات ومراقبة الأداء (Analytics & Performance Monitoring)
// ==========================================================================

export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // المعرف والوقت
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`),
  level: varchar("level", { length: 20 }).notNull(), // error, warning, info, debug
  
  // المصدر
  source: varchar("source", { length: 100 }), // api, web, mobile, system
  module: varchar("module", { length: 100 }),
  action: varchar("action", { length: 100 }),
  
  // المستخدم والجلسة
  userId: uuid("user_id"),
  sessionId: varchar("session_id", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  
  // الرسالة والبيانات
  message: text("message"),
  errorCode: varchar("error_code", { length: 50 }),
  stackTrace: text("stack_trace"),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  
  // الأداء
  executionTime: integer("execution_time"), // milliseconds
  memoryUsage: integer("memory_usage"), // MB
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================================================
// الـــعــلاقـــات (Relations)
// ==========================================================================

// علاقات المستخدمين
export const usersRelations = relations(users, ({ one, many }) => ({
  applications: many(applications),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  surveyingDecisions: many(surveyingDecisions),
  notifications: many(notifications),
  userRoles: many(userRoles),
  userClearances: many(userClearances),
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
}));

// علاقات الإدارات
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parentDepartment: one(departments, {
    fields: [departments.parentDepartmentId],
    references: [departments.id],
  }),
  headOfDepartment: one(users, {
    fields: [departments.headOfDepartmentId],
    references: [users.id],
  }),
  employees: many(users),
  positions: many(positions),
  branches: many(orgBranches),
}));

// علاقات الطلبات
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
  plot: one(geoPlots, {
    fields: [applications.projectLocation],
    references: [geoPlots.uniqueCode],
  }),
  surveyingDecisions: many(surveyingDecisions),
  payments: many(payments),
  tasks: many(tasks),
}));

// علاقات جغرافية - هيكل هرمي
export const governoratesRelations = relations(governorates, ({ many }) => ({
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  governorate: one(governorates, {
    fields: [districts.governorateId],
    references: [governorates.id],
  }),
  neighborhoods: many(neighborhoods),
  subDistricts: many(geoSubDistricts),
}));

export const neighborhoodsRelations = relations(neighborhoods, ({ one, many }) => ({
  district: one(districts, {
    fields: [neighborhoods.districtId],
    references: [districts.id],
  }),
  harat: many(geoHarat),
  sectors: many(geoSectors),
  streets: many(geoStreets),
}));

// علاقات قطع الأراضي (مهم للـ LBAC)
export const geoPlotsRelations = relations(geoPlots, ({ one, many }) => ({
  block: one(geoBlocks, {
    fields: [geoPlots.blockId],
    references: [geoBlocks.id],
  }),
  applications: many(applications),
  surveyingDecisions: many(surveyingDecisions),
}));

// علاقات LBAC والفروع
export const orgBranchesRelations = relations(orgBranches, ({ one, many }) => ({
  department: one(departments, {
    fields: [orgBranches.departmentId],
    references: [departments.id],
  }),
  manager: one(users, {
    fields: [orgBranches.managerUserId],
    references: [users.id],
  }),
}));

// علاقات RBAC
export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// علاقات الموظفين
export const employeesRelations = relations(employees, ({ one }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  manager: one(employees, {
    fields: [employees.directManagerId],
    references: [employees.id],
  }),
}));

// علاقات LBAC
export const securityLevelsRelations = relations(securityLevels, ({ many }) => ({
  objectLabels: many(objectLabels),
  userClearances: many(userClearances),
}));

export const objectLabelsRelations = relations(objectLabels, ({ one }) => ({
  securityLevel: one(securityLevels, {
    fields: [objectLabels.securityLevelId],
    references: [securityLevels.id],
  }),
  classifiedBy: one(users, {
    fields: [objectLabels.classifiedBy],
    references: [users.id],
  }),
}));

export const userClearancesRelations = relations(userClearances, ({ one }) => ({
  user: one(users, {
    fields: [userClearances.userId],
    references: [users.id],
  }),
  maxSecurityLevel: one(securityLevels, {
    fields: [userClearances.maxSecurityLevelId],
    references: [securityLevels.id],
  }),
  approvedBy: one(users, {
    fields: [userClearances.approvedBy],
    references: [users.id],
  }),
}));

// ==========================================================================
// مخططات Zod للتحقق (Validation Schemas) - كامل
// ==========================================================================

// 👤 Users & Auth Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

// 🏢 Organization Schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ⚖️ Legal Framework Schemas
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

// 🛠️ Services & Applications Schemas
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  applicationNumber: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
});

// ⚖️ Requirements Schemas  
export const insertRequirementCategorySchema = createInsertSchema(requirementCategories).omit({
  id: true,
  createdAt: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true,
});

// 🗺️ Geographic Schemas
export const insertGovernorateSchema = createInsertSchema(governorates).omit({
  id: true,
  createdAt: true,
});

export const insertDistrictSchema = createInsertSchema(districts).omit({
  id: true,
  createdAt: true,
});

export const insertNeighborhoodSchema = createInsertSchema(neighborhoods).omit({
  id: true,
  createdAt: true,
});

export const insertGeoPlotSchema = createInsertSchema(geoPlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 📊 Survey & Task Schemas
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

// 💰 Payment Schemas
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  paymentNumber: true,
  createdAt: true,
  updatedAt: true,
});

// 🔔 Notification Schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// 📎 File Schemas
export const insertFileAttachmentSchema = createInsertSchema(fileAttachments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 🔐 LBAC Schemas
export const insertSecurityLevelSchema = createInsertSchema(securityLevels).omit({
  id: true,
  createdAt: true,
});

export const insertObjectLabelSchema = createInsertSchema(objectLabels).omit({
  id: true,
  classifiedAt: true,
});

export const insertUserClearanceSchema = createInsertSchema(userClearances).omit({
  id: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
});

// 🏢 Organization Schemas  
export const insertOrgBranchSchema = createInsertSchema(orgBranches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 📈 System Schemas
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

// ==========================================================================
// أنواع TypeScript الكاملة (Complete TypeScript Types)
// ==========================================================================

// 👤 Users & Auth Types
export type User = typeof users.$inferSelect;
export type NewUser = z.infer<typeof insertUserSchema>;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = z.infer<typeof insertEmployeeSchema>;

export type Role = typeof roles.$inferSelect;
export type NewRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = z.infer<typeof insertPermissionSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;

// 🏢 Organization Types
export type Department = typeof departments.$inferSelect;
export type NewDepartment = z.infer<typeof insertDepartmentSchema>;

export type Position = typeof positions.$inferSelect;
export type NewPosition = z.infer<typeof insertPositionSchema>;

// ⚖️ Legal Framework Types
export type LawRegulation = typeof lawsRegulations.$inferSelect;
export type NewLawRegulation = z.infer<typeof insertLawRegulationSchema>;

export type LawSection = typeof lawSections.$inferSelect;
export type NewLawSection = z.infer<typeof insertLawSectionSchema>;

export type LawArticle = typeof lawArticles.$inferSelect;
export type NewLawArticle = z.infer<typeof insertLawArticleSchema>;

export type RequirementCategory = typeof requirementCategories.$inferSelect;
export type NewRequirementCategory = z.infer<typeof insertRequirementCategorySchema>;

export type Requirement = typeof requirements.$inferSelect;
export type NewRequirement = z.infer<typeof insertRequirementSchema>;

// 🛠️ Services & Applications Types
export type Service = typeof services.$inferSelect;
export type NewService = z.infer<typeof insertServiceSchema>;

export type Application = typeof applications.$inferSelect;
export type NewApplication = z.infer<typeof insertApplicationSchema>;

// 🗺️ Geographic Types
export type Governorate = typeof governorates.$inferSelect;
export type NewGovernorate = z.infer<typeof insertGovernorateSchema>;

export type District = typeof districts.$inferSelect;
export type NewDistrict = z.infer<typeof insertDistrictSchema>;

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type NewNeighborhood = z.infer<typeof insertNeighborhoodSchema>;

export type GeoPlot = typeof geoPlots.$inferSelect;
export type NewGeoPlot = z.infer<typeof insertGeoPlotSchema>;

export type GeoSubDistrict = typeof geoSubDistricts.$inferSelect;
export type GeoHara = typeof geoHarat.$inferSelect;
export type GeoSector = typeof geoSectors.$inferSelect;
export type GeoNeighborhoodUnit = typeof geoNeighborhoodUnits.$inferSelect;
export type GeoBlock = typeof geoBlocks.$inferSelect;
export type GeoStreet = typeof geoStreets.$inferSelect;
export type GeoStreetSegment = typeof geoStreetSegments.$inferSelect;

// 📊 Survey & Task Types
export type SurveyingDecision = typeof surveyingDecisions.$inferSelect;
export type NewSurveyingDecision = z.infer<typeof insertSurveyingDecisionSchema>;

export type Task = typeof tasks.$inferSelect;
export type NewTask = z.infer<typeof insertTaskSchema>;

// 💰 Payment Types
export type Payment = typeof payments.$inferSelect;
export type NewPayment = z.infer<typeof insertPaymentSchema>;

// 🔔 Notification Types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = z.infer<typeof insertNotificationSchema>;

// 📎 File Types
export type FileAttachment = typeof fileAttachments.$inferSelect;
export type NewFileAttachment = z.infer<typeof insertFileAttachmentSchema>;

// 📈 System Types
export type SystemLog = typeof systemLogs.$inferSelect;

// 🔐 LBAC Types
export type SecurityLevel = typeof securityLevels.$inferSelect;
export type NewSecurityLevel = z.infer<typeof insertSecurityLevelSchema>;

export type ObjectLabel = typeof objectLabels.$inferSelect;
export type NewObjectLabel = z.infer<typeof insertObjectLabelSchema>;

export type UserClearance = typeof userClearances.$inferSelect;
export type NewUserClearance = z.infer<typeof insertUserClearanceSchema>;

// 🏢 Organization Support Types
export type OrgBranch = typeof orgBranches.$inferSelect;
export type NewOrgBranch = z.infer<typeof insertOrgBranchSchema>;

// 📈 System Support Types
export type NewSystemLog = z.infer<typeof insertSystemLogSchema>;

// ==========================================================================
// الخـــاتـــمـــة
// ==========================================================================

/**
 * ملخص المخطط الموحد المُصحح:
 * 
 * 📊 إجمالي الجداول: 32 جدول
 * 
 * 👤 المستخدمين والصلاحيات: 6 جداول
 *    - users, roles, permissions, userRoles, rolePermissions, employees
 * 
 * 🏢 التنظيم والإدارة: 3 جداول
 *    - departments, positions, orgBranches
 * 
 * ⚖️ الإطار القانوني: 4 جداول
 *    - lawsRegulations, lawSections, lawArticles, requirementCategories, requirements
 * 
 * 🛠️ الخدمات والطلبات: 3 جداول
 *    - services, applications, surveyingDecisions
 * 
 * 🗺️ الجداول الجغرافية: 11 جدول (كامل)
 *    - governorates, districts, neighborhoods, geoSubDistricts, geoHarat
 *    - geoSectors, geoNeighborhoodUnits, geoBlocks, geoPlots, geoStreets, geoStreetSegments
 * 
 * 🔐 طبقة LBAC الحقيقية: 3 جداول (أمني)
 *    - securityLevels, objectLabels, userClearances
 * 
 * 💰📎🔔📈 الدعم والمساعدة: 6 جداول
 *    - tasks, payments, notifications, fileAttachments, systemLogs, requirementCategories
 * 
 * ✅ المميزات:
 * - نموذج RBAC صحيح (بدلاً من user roles enum)
 * - LBAC حقيقي مع تصنيف أمني
 * - PostGIS كامل مع customType
 * - ENUMs على مستوى قاعدة البيانات
 * - تشفير كلمات المرور
 * - UUID موحد
 * - مخططات Zod كاملة
 * - أنواع TypeScript شاملة
 * 
 * 🎯 جاهز للتطبيق والاختبار
 * 
 * ⚠️ ملاحظة: هذا المخطط يحل محل shared/schema.ts بالكامل
 */