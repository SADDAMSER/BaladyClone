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
  serviceRequirements, systemSettings, serviceTemplates, dynamicForms,
  workflowDefinitions, serviceBuilder, applicationAssignments, 
  applicationStatusHistory, appointments, fieldVisits, surveyResults, surveyReports,
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

// إضافة Insert* aliases للجداول الموجودة
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export type InsertServiceTemplate = typeof serviceTemplates.$inferInsert;
export type InsertDynamicForm = typeof dynamicForms.$inferInsert;
export type InsertWorkflowDefinition = typeof workflowDefinitions.$inferInsert;
export type InsertServiceBuilder = typeof serviceBuilder.$inferInsert;
export type InsertApplicationAssignment = typeof applicationAssignments.$inferInsert;
export type InsertApplicationStatusHistory = typeof applicationStatusHistory.$inferInsert;
export type InsertAppointment = typeof appointments.$inferInsert;
export type InsertFieldVisit = typeof fieldVisits.$inferInsert;
export type InsertSurveyResult = typeof surveyResults.$inferInsert;
export type InsertSurveyReport = typeof surveyReports.$inferInsert;

// الجداول المفقودة حقاً - يجب إضافتها للمخطط لاحقاً
// applicationReviews, contactAttempts, surveyAssignmentForms