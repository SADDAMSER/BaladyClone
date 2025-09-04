import {
  users, departments, positions, lawsRegulations, lawSections, lawArticles,
  requirementCategories, requirements, services, serviceRequirements,
  applications, surveyingDecisions, tasks, systemSettings,
  type User, type InsertUser, type Department, type InsertDepartment,
  type Position, type InsertPosition, type LawRegulation, type InsertLawRegulation,
  type LawSection, type InsertLawSection, type LawArticle, type InsertLawArticle,
  type RequirementCategory, type InsertRequirementCategory,
  type Requirement, type InsertRequirement, type Service, type InsertService,
  type Application, type InsertApplication, type SurveyingDecision, type InsertSurveyingDecision,
  type Task, type InsertTask, type SystemSetting, type InsertSystemSetting
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
}

export const storage = new DatabaseStorage();
