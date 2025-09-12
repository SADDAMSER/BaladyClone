/**
 * Barrel module لحل تضارب module resolution
 * Re-exports من ../schema.ts مع aliases للتوافق مع server/storage.ts
 */

// إعادة تصدير كل شيء من المخطط الرئيسي
export * from "../schema";

// استيراد الجداول والأنواع للإنشاء aliases
import {
  users, departments, positions, lawsRegulations, lawSections, lawArticles,
  requirementCategories, requirements, services, applications, 
  surveyingDecisions, tasks, notifications,
  type User, type Department, type Position, type LawRegulation, 
  type LawSection, type LawArticle, type RequirementCategory,
  type Requirement, type Service, type Application, 
  type SurveyingDecision, type Task, type Notification
} from "../schema";

// إنشاء Insert* type aliases للتوافق مع server/storage.ts
export type InsertUser = typeof users.$inferInsert;
export type InsertDepartment = typeof departments.$inferInsert;
export type InsertPosition = typeof positions.$inferInsert;
export type InsertLawRegulation = typeof lawsRegulations.$inferInsert;
export type InsertLawSection = typeof lawSections.$inferInsert;
export type InsertLawArticle = typeof lawArticles.$inferInsert;
export type InsertRequirementCategory = typeof requirementCategories.$inferInsert;
export type InsertRequirement = typeof requirements.$inferInsert;
export type InsertService = typeof services.$inferInsert;
export type InsertApplication = typeof applications.$inferInsert;
export type InsertSurveyingDecision = typeof surveyingDecisions.$inferInsert;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;

// إضافة الجداول المفقودة كقوائم فارغة لتجنب أخطاء الاستيراد
// هذه ستكون بديلة مؤقتة حتى يتم إضافة الجداول الحقيقية
export const serviceRequirements = {} as any;
export const systemSettings = {} as any;
export const serviceTemplates = {} as any;
export const dynamicForms = {} as any;
export const workflowDefinitions = {} as any;
export const serviceBuilder = {} as any;
export const applicationAssignments = {} as any;
export const applicationStatusHistory = {} as any;
export const applicationReviews = {} as any;
export const appointments = {} as any;
export const contactAttempts = {} as any;
export const surveyAssignmentForms = {} as any;
export const fieldVisits = {} as any;
export const surveyResults = {} as any;
export const surveyReports = {} as any;

// وأنواعها
export type SystemSetting = any;
export type InsertSystemSetting = any;
export type ServiceTemplate = any;
export type InsertServiceTemplate = any;
export type DynamicForm = any;
export type InsertDynamicForm = any;
export type WorkflowDefinition = any;
export type InsertWorkflowDefinition = any;
export type ServiceBuilder = any;
export type InsertServiceBuilder = any;
export type ApplicationAssignment = any;
export type InsertApplicationAssignment = any;
export type ApplicationStatusHistory = any;
export type InsertApplicationStatusHistory = any;
export type ApplicationReview = any;
export type InsertApplicationReview = any;
export type Appointment = any;
export type InsertAppointment = any;
export type ContactAttempt = any;
export type InsertContactAttempt = any;
export type SurveyAssignmentForm = any;
export type InsertSurveyAssignmentForm = any;
export type FieldVisit = any;
export type InsertFieldVisit = any;
export type SurveyResult = any;
export type InsertSurveyResult = any;
export type SurveyReport = any;
export type InsertSurveyReport = any;