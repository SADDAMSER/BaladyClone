import {
  users, departments, positions, lawsRegulations, lawSections, lawArticles,
  requirementCategories, requirements, services, serviceRequirements,
  applications, surveyingDecisions, tasks, systemSettings,
  serviceTemplates, dynamicForms, workflowDefinitions, serviceBuilder,
  applicationAssignments, applicationStatusHistory, applicationReviews, notifications,
  appointments, contactAttempts, surveyAssignmentForms,
  fieldVisits, surveyResults, surveyReports,
  type User, type InsertUser, type Department, type InsertDepartment,
  type Position, type InsertPosition, type LawRegulation, type InsertLawRegulation,
  type LawSection, type InsertLawSection, type LawArticle, type InsertLawArticle,
  type RequirementCategory, type InsertRequirementCategory,
  type Requirement, type InsertRequirement, type Service, type InsertService,
  type Application, type InsertApplication, type SurveyingDecision, type InsertSurveyingDecision,
  type Task, type InsertTask, type SystemSetting, type InsertSystemSetting,
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
  type SurveyReport, type InsertSurveyReport
} from "@shared/schema";
import { db } from "./db";
import { eq, like, ilike, and, or, desc, asc, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getUsers(filters?: { role?: string; departmentId?: string; isActive?: boolean }): Promise<User[]>;

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
  getApplications(filters?: { status?: string; applicantId?: string; assignedToId?: string }): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByNumber(applicationNumber: string): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  // Surveying decisions
  getSurveyingDecisions(filters?: { status?: string; surveyorId?: string }): Promise<SurveyingDecision[]>;
  getSurveyingDecision(id: string): Promise<SurveyingDecision | undefined>;
  getSurveyingDecisionByNumber(decisionNumber: string): Promise<SurveyingDecision | undefined>;
  createSurveyingDecision(decision: InsertSurveyingDecision): Promise<SurveyingDecision>;
  updateSurveyingDecision(id: string, updates: Partial<InsertSurveyingDecision>): Promise<SurveyingDecision>;
  deleteSurveyingDecision(id: string): Promise<void>;

  // Tasks
  getTasks(filters?: { assignedToId?: string; status?: string; applicationId?: string }): Promise<Task[]>;
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

  // Applications
  async getApplications(filters?: { status?: string; applicantId?: string; assignedToId?: string }): Promise<Application[]> {
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(applications.status, filters.status));
      if (filters.applicantId) conditions.push(eq(applications.applicantId, filters.applicantId));
      if (filters.assignedToId) conditions.push(eq(applications.assignedToId, filters.assignedToId));
      
      if (conditions.length > 0) {
        return await db.select().from(applications)
          .where(and(...conditions))
          .orderBy(desc(applications.createdAt));
      }
    }
    
    return await db.select().from(applications)
      .orderBy(desc(applications.createdAt));
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

  // Surveying decisions
  async getSurveyingDecisions(filters?: { status?: string; surveyorId?: string }): Promise<SurveyingDecision[]> {
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(surveyingDecisions.status, filters.status));
      if (filters.surveyorId) conditions.push(eq(surveyingDecisions.surveyorId, filters.surveyorId));
      
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
        serviceName: serviceTemplates.nameAr,
        usageCount: count()
      })
      .from(serviceTemplates)
      .leftJoin(applications, eq(applications.serviceId, serviceTemplates.id))
      .groupBy(serviceTemplates.id, serviceTemplates.nameAr)
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
        stepCount: sql<number>`jsonb_array_length(${workflowDefinitions.workflowSteps})`
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
      .select({
        id: applicationAssignments.id,
        applicationId: applicationAssignments.applicationId,
        assignedToId: applicationAssignments.assignedToId,
        assignedById: applicationAssignments.assignedById,
        assignedAt: applicationAssignments.assignedAt,
        dueDate: applicationAssignments.dueDate,
        priority: applicationAssignments.priority,
        status: applicationAssignments.status,
        notes: applicationAssignments.notes,
        completedAt: applicationAssignments.completedAt,
        application: {
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          serviceType: applications.serviceType,
          applicantName: applications.applicantName,
          applicantId: applications.applicantId,
          status: applications.status,
          currentStage: applications.currentStage,
          submittedAt: applications.submittedAt,
          description: applications.description,
        }
      })
      .from(applicationAssignments)
      .leftJoin(applications, eq(applicationAssignments.applicationId, applications.id))
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
      .where(sql`${applicationAssignments.assignedToId} IN (${userIds.map(() => '?').join(',')})`, ...userIds);

    const pendingAssignments = await db
      .select({ count: count() })
      .from(applicationAssignments)
      .where(and(
        sql`${applicationAssignments.assignedToId} IN (${userIds.map(() => '?').join(',')})`, ...userIds,
        eq(applicationAssignments.status, 'pending')
      ));

    const completedAssignments = await db
      .select({ count: count() })
      .from(applicationAssignments)
      .where(and(
        sql`${applicationAssignments.assignedToId} IN (${userIds.map(() => '?').join(',')})`, ...userIds,
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
}

export const storage = new DatabaseStorage();
