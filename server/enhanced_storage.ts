// =========================================================
// Enhanced Storage Methods for Yemen Digital Platform
// طرق التخزين المحسنة لمنصة بناء اليمن الرقمية
// =========================================================

import { db } from "./db";
import { eq, like, ilike, and, or, desc, asc, sql, count, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

// Enhanced interfaces for new tables
export interface Ministry {
  id: string;
  name: string;
  nameEn?: string;
  ministryCode: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategory {
  id: string;
  parentId?: string;
  name: string;
  nameEn?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GovernmentService {
  id: string;
  serviceCode: string;
  name: string;
  nameEn?: string;
  categoryId: string;
  ministryId?: string;
  departmentId?: string;
  description?: string;
  requirementsAr?: string;
  requirementsEn?: string;
  workflowTemplateId?: string;
  estimatedDurationDays: number;
  feesAmount: number;
  feesCurrency: string;
  isOnlineService: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitizenApplication {
  id: string;
  applicationNumber: string;
  serviceId: string;
  applicantId: string;
  currentStepId?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  applicationData: any;
  submittedAt: Date;
  expectedCompletionDate?: Date;
  completedAt?: Date;
  totalFees: number;
  paidFees: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandSurveyRequest {
  id: string;
  requestNumber: string;
  applicationId: string;
  landOwnerName: string;
  landLocationDescription: string;
  surveyPurpose?: string;
  surveyorAssignedId?: string;
  surveyDate?: Date;
  surveyCompletedAt?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovedSurveyDecision {
  id: string;
  surveyRequestId: string;
  decisionNumber: string;
  landAreaM2: number;
  boundaryPoints: any;
  northBoundary?: string;
  southBoundary?: string;
  eastBoundary?: string;
  westBoundary?: string;
  approvedBy: string;
  approvedAt: Date;
  decisionDocumentPath?: string;
  validityPeriodMonths: number;
  expiresAt?: Date;
  isActive: boolean;
}

export interface SystemNotification {
  id: string;
  recipientId: string;
  notificationType: 'info' | 'warning' | 'error' | 'success' | 'reminder';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

// Enhanced Storage Interface
export interface IEnhancedStorage {
  // Ministry Management
  getMinistries(): Promise<Ministry[]>;
  getMinistry(id: string): Promise<Ministry | undefined>;
  createMinistry(ministry: Partial<Ministry>): Promise<Ministry>;
  updateMinistry(id: string, updates: Partial<Ministry>): Promise<Ministry>;
  deleteMinistry(id: string): Promise<void>;

  // Service Categories
  getServiceCategories(): Promise<ServiceCategory[]>;
  getServiceCategory(id: string): Promise<ServiceCategory | undefined>;
  createServiceCategory(category: Partial<ServiceCategory>): Promise<ServiceCategory>;
  updateServiceCategory(id: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory>;
  deleteServiceCategory(id: string): Promise<void>;

  // Government Services
  getGovernmentServices(filters?: { categoryId?: string; ministryId?: string; isActive?: boolean }): Promise<GovernmentService[]>;
  getGovernmentService(id: string): Promise<GovernmentService | undefined>;
  getGovernmentServiceByCode(serviceCode: string): Promise<GovernmentService | undefined>;
  createGovernmentService(service: Partial<GovernmentService>): Promise<GovernmentService>;
  updateGovernmentService(id: string, updates: Partial<GovernmentService>): Promise<GovernmentService>;
  deleteGovernmentService(id: string): Promise<void>;

  // Citizen Applications
  getCitizenApplications(filters?: { 
    status?: string; 
    applicantId?: string; 
    serviceId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<CitizenApplication[]>;
  getCitizenApplication(id: string): Promise<CitizenApplication | undefined>;
  getCitizenApplicationByNumber(applicationNumber: string): Promise<CitizenApplication | undefined>;
  createCitizenApplication(application: Partial<CitizenApplication>): Promise<CitizenApplication>;
  updateCitizenApplication(id: string, updates: Partial<CitizenApplication>): Promise<CitizenApplication>;
  deleteCitizenApplication(id: string): Promise<void>;

  // Land Survey Requests
  getLandSurveyRequests(filters?: { status?: string; surveyorAssignedId?: string }): Promise<LandSurveyRequest[]>;
  getLandSurveyRequest(id: string): Promise<LandSurveyRequest | undefined>;
  getLandSurveyRequestByNumber(requestNumber: string): Promise<LandSurveyRequest | undefined>;
  createLandSurveyRequest(request: Partial<LandSurveyRequest>): Promise<LandSurveyRequest>;
  updateLandSurveyRequest(id: string, updates: Partial<LandSurveyRequest>): Promise<LandSurveyRequest>;
  deleteLandSurveyRequest(id: string): Promise<void>;

  // Survey Decisions
  getApprovedSurveyDecisions(filters?: { status?: string; approvedBy?: string }): Promise<ApprovedSurveyDecision[]>;
  getApprovedSurveyDecision(id: string): Promise<ApprovedSurveyDecision | undefined>;
  getApprovedSurveyDecisionByNumber(decisionNumber: string): Promise<ApprovedSurveyDecision | undefined>;
  createApprovedSurveyDecision(decision: Partial<ApprovedSurveyDecision>): Promise<ApprovedSurveyDecision>;
  updateApprovedSurveyDecision(id: string, updates: Partial<ApprovedSurveyDecision>): Promise<ApprovedSurveyDecision>;
  deleteApprovedSurveyDecision(id: string): Promise<void>;

  // Notifications
  getSystemNotifications(recipientId: string, filters?: { isRead?: boolean; type?: string }): Promise<SystemNotification[]>;
  getSystemNotification(id: string): Promise<SystemNotification | undefined>;
  createSystemNotification(notification: Partial<SystemNotification>): Promise<SystemNotification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(recipientId: string): Promise<void>;
  deleteSystemNotification(id: string): Promise<void>;

  // Enhanced Dashboard Statistics
  getEnhancedDashboardStats(): Promise<{
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingSurveys: number;
    completedSurveys: number;
    totalServices: number;
    activeUsers: number;
    recentActivity: any[];
  }>;

  // Advanced Search
  advancedSearch(query: string, filters?: {
    type?: 'services' | 'applications' | 'users' | 'all';
    categoryId?: string;
    ministryId?: string;
    status?: string;
  }): Promise<{
    services: GovernmentService[];
    applications: CitizenApplication[];
    surveys: LandSurveyRequest[];
  }>;
}

export class EnhancedDatabaseStorage implements IEnhancedStorage {
  // Ministry Management
  async getMinistries(): Promise<Ministry[]> {
    const result = await db.execute(sql`
      SELECT * FROM ministries 
      WHERE is_active = true 
      ORDER BY name
    `);
    return result.rows as Ministry[];
  }

  async getMinistry(id: string): Promise<Ministry | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM ministries WHERE id = ${id}
    `);
    return result.rows[0] as Ministry | undefined;
  }

  async createMinistry(ministry: Partial<Ministry>): Promise<Ministry> {
    const id = randomUUID();
    const result = await db.execute(sql`
      INSERT INTO ministries (
        id, name, name_en, ministry_code, description, 
        logo_url, website_url, contact_email, contact_phone, address
      ) VALUES (
        ${id}, ${ministry.name}, ${ministry.nameEn}, ${ministry.ministryCode}, 
        ${ministry.description}, ${ministry.logoUrl}, ${ministry.websiteUrl}, 
        ${ministry.contactEmail}, ${ministry.contactPhone}, ${ministry.address}
      ) RETURNING *
    `);
    return result.rows[0] as Ministry;
  }

  async updateMinistry(id: string, updates: Partial<Ministry>): Promise<Ministry> {
    const fields = Object.keys(updates).map(key => `${key} = ${updates[key as keyof Ministry]}`).join(', ');
    const result = await db.execute(sql`
      UPDATE ministries 
      SET ${sql.raw(fields)}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as Ministry;
  }

  async deleteMinistry(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE ministries SET is_active = false WHERE id = ${id}
    `);
  }

  // Service Categories
  async getServiceCategories(): Promise<ServiceCategory[]> {
    const result = await db.execute(sql`
      SELECT * FROM service_categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    return result.rows as ServiceCategory[];
  }

  async getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM service_categories WHERE id = ${id}
    `);
    return result.rows[0] as ServiceCategory | undefined;
  }

  async createServiceCategory(category: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const id = randomUUID();
    const result = await db.execute(sql`
      INSERT INTO service_categories (
        id, parent_id, name, name_en, description, icon, color, sort_order
      ) VALUES (
        ${id}, ${category.parentId}, ${category.name}, ${category.nameEn}, 
        ${category.description}, ${category.icon}, ${category.color}, ${category.sortOrder || 0}
      ) RETURNING *
    `);
    return result.rows[0] as ServiceCategory;
  }

  async updateServiceCategory(id: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const fields = Object.keys(updates).map(key => `${key} = ${updates[key as keyof ServiceCategory]}`).join(', ');
    const result = await db.execute(sql`
      UPDATE service_categories 
      SET ${sql.raw(fields)}
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as ServiceCategory;
  }

  async deleteServiceCategory(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE service_categories SET is_active = false WHERE id = ${id}
    `);
  }

  // Government Services
  async getGovernmentServices(filters?: { categoryId?: string; ministryId?: string; isActive?: boolean }): Promise<GovernmentService[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.categoryId) {
      whereClause += ` AND category_id = $${params.length + 1}`;
      params.push(filters.categoryId);
    }
    if (filters?.ministryId) {
      whereClause += ` AND ministry_id = $${params.length + 1}`;
      params.push(filters.ministryId);
    }
    if (filters?.isActive !== undefined) {
      whereClause += ` AND is_active = $${params.length + 1}`;
      params.push(filters.isActive);
    }

    const result = await db.execute(sql.raw(`
      SELECT gs.*, sc.name as category_name, m.name as ministry_name
      FROM government_services gs
      LEFT JOIN service_categories sc ON gs.category_id = sc.id
      LEFT JOIN ministries m ON gs.ministry_id = m.id
      ${whereClause}
      ORDER BY gs.is_featured DESC, gs.name
    `, params));

    return result.rows as GovernmentService[];
  }

  async getGovernmentService(id: string): Promise<GovernmentService | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM government_services WHERE id = ${id}
    `);
    return result.rows[0] as GovernmentService | undefined;
  }

  async getGovernmentServiceByCode(serviceCode: string): Promise<GovernmentService | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM government_services WHERE service_code = ${serviceCode}
    `);
    return result.rows[0] as GovernmentService | undefined;
  }

  async createGovernmentService(service: Partial<GovernmentService>): Promise<GovernmentService> {
    const id = randomUUID();
    const serviceCode = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const result = await db.execute(sql`
      INSERT INTO government_services (
        id, service_code, name, name_en, category_id, ministry_id, department_id,
        description, requirements_ar, requirements_en, estimated_duration_days,
        fees_amount, fees_currency, is_online_service, is_featured
      ) VALUES (
        ${id}, ${serviceCode}, ${service.name}, ${service.nameEn}, ${service.categoryId},
        ${service.ministryId}, ${service.departmentId}, ${service.description},
        ${service.requirementsAr}, ${service.requirementsEn}, ${service.estimatedDurationDays || 7},
        ${service.feesAmount || 0}, ${service.feesCurrency || 'YER'}, 
        ${service.isOnlineService !== false}, ${service.isFeatured || false}
      ) RETURNING *
    `);
    return result.rows[0] as GovernmentService;
  }

  async updateGovernmentService(id: string, updates: Partial<GovernmentService>): Promise<GovernmentService> {
    const result = await db.execute(sql`
      UPDATE government_services 
      SET name = COALESCE(${updates.name}, name),
          name_en = COALESCE(${updates.nameEn}, name_en),
          description = COALESCE(${updates.description}, description),
          requirements_ar = COALESCE(${updates.requirementsAr}, requirements_ar),
          requirements_en = COALESCE(${updates.requirementsEn}, requirements_en),
          estimated_duration_days = COALESCE(${updates.estimatedDurationDays}, estimated_duration_days),
          fees_amount = COALESCE(${updates.feesAmount}, fees_amount),
          is_featured = COALESCE(${updates.isFeatured}, is_featured),
          is_active = COALESCE(${updates.isActive}, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as GovernmentService;
  }

  async deleteGovernmentService(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE government_services SET is_active = false WHERE id = ${id}
    `);
  }

  // Citizen Applications
  async getCitizenApplications(filters?: { 
    status?: string; 
    applicantId?: string; 
    serviceId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<CitizenApplication[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    if (filters?.applicantId) {
      whereClause += ` AND applicant_id = $${params.length + 1}`;
      params.push(filters.applicantId);
    }
    if (filters?.serviceId) {
      whereClause += ` AND service_id = $${params.length + 1}`;
      params.push(filters.serviceId);
    }
    if (filters?.fromDate) {
      whereClause += ` AND submitted_at >= $${params.length + 1}`;
      params.push(filters.fromDate);
    }
    if (filters?.toDate) {
      whereClause += ` AND submitted_at <= $${params.length + 1}`;
      params.push(filters.toDate);
    }

    const result = await db.execute(sql.raw(`
      SELECT ca.*, gs.name as service_name, u.full_name as applicant_name
      FROM citizen_applications ca
      LEFT JOIN government_services gs ON ca.service_id = gs.id
      LEFT JOIN users u ON ca.applicant_id = u.id
      ${whereClause}
      ORDER BY ca.submitted_at DESC
    `, params));

    return result.rows as CitizenApplication[];
  }

  async getCitizenApplication(id: string): Promise<CitizenApplication | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM citizen_applications WHERE id = ${id}
    `);
    return result.rows[0] as CitizenApplication | undefined;
  }

  async getCitizenApplicationByNumber(applicationNumber: string): Promise<CitizenApplication | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM citizen_applications WHERE application_number = ${applicationNumber}
    `);
    return result.rows[0] as CitizenApplication | undefined;
  }

  async createCitizenApplication(application: Partial<CitizenApplication>): Promise<CitizenApplication> {
    const id = randomUUID();
    const applicationNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const result = await db.execute(sql`
      INSERT INTO citizen_applications (
        id, application_number, service_id, applicant_id, status, priority,
        application_data, total_fees, paid_fees, notes
      ) VALUES (
        ${id}, ${applicationNumber}, ${application.serviceId}, ${application.applicantId},
        ${application.status || 'submitted'}, ${application.priority || 'normal'},
        ${JSON.stringify(application.applicationData)}, ${application.totalFees || 0},
        ${application.paidFees || 0}, ${application.notes}
      ) RETURNING *
    `);
    return result.rows[0] as CitizenApplication;
  }

  async updateCitizenApplication(id: string, updates: Partial<CitizenApplication>): Promise<CitizenApplication> {
    const result = await db.execute(sql`
      UPDATE citizen_applications 
      SET status = COALESCE(${updates.status}, status),
          priority = COALESCE(${updates.priority}, priority),
          application_data = COALESCE(${updates.applicationData ? JSON.stringify(updates.applicationData) : null}, application_data),
          total_fees = COALESCE(${updates.totalFees}, total_fees),
          paid_fees = COALESCE(${updates.paidFees}, paid_fees),
          notes = COALESCE(${updates.notes}, notes),
          completed_at = COALESCE(${updates.completedAt}, completed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as CitizenApplication;
  }

  async deleteCitizenApplication(id: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM citizen_applications WHERE id = ${id}
    `);
  }

  // Land Survey Requests
  async getLandSurveyRequests(filters?: { status?: string; surveyorAssignedId?: string }): Promise<LandSurveyRequest[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    if (filters?.surveyorAssignedId) {
      whereClause += ` AND surveyor_assigned_id = $${params.length + 1}`;
      params.push(filters.surveyorAssignedId);
    }

    const result = await db.execute(sql.raw(`
      SELECT lsr.*, ca.application_number, u.full_name as surveyor_name
      FROM land_survey_requests lsr
      LEFT JOIN citizen_applications ca ON lsr.application_id = ca.id
      LEFT JOIN users u ON lsr.surveyor_assigned_id = u.id
      ${whereClause}
      ORDER BY lsr.created_at DESC
    `, params));

    return result.rows as LandSurveyRequest[];
  }

  async getLandSurveyRequest(id: string): Promise<LandSurveyRequest | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM land_survey_requests WHERE id = ${id}
    `);
    return result.rows[0] as LandSurveyRequest | undefined;
  }

  async getLandSurveyRequestByNumber(requestNumber: string): Promise<LandSurveyRequest | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM land_survey_requests WHERE request_number = ${requestNumber}
    `);
    return result.rows[0] as LandSurveyRequest | undefined;
  }

  async createLandSurveyRequest(request: Partial<LandSurveyRequest>): Promise<LandSurveyRequest> {
    const id = randomUUID();
    const requestNumber = `LSR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const result = await db.execute(sql`
      INSERT INTO land_survey_requests (
        id, request_number, application_id, land_owner_name, land_location_description,
        survey_purpose, surveyor_assigned_id, survey_date, status
      ) VALUES (
        ${id}, ${requestNumber}, ${request.applicationId}, ${request.landOwnerName},
        ${request.landLocationDescription}, ${request.surveyPurpose}, 
        ${request.surveyorAssignedId}, ${request.surveyDate}, ${request.status || 'pending'}
      ) RETURNING *
    `);
    return result.rows[0] as LandSurveyRequest;
  }

  async updateLandSurveyRequest(id: string, updates: Partial<LandSurveyRequest>): Promise<LandSurveyRequest> {
    const result = await db.execute(sql`
      UPDATE land_survey_requests 
      SET surveyor_assigned_id = COALESCE(${updates.surveyorAssignedId}, surveyor_assigned_id),
          survey_date = COALESCE(${updates.surveyDate}, survey_date),
          survey_completed_at = COALESCE(${updates.surveyCompletedAt}, survey_completed_at),
          status = COALESCE(${updates.status}, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as LandSurveyRequest;
  }

  async deleteLandSurveyRequest(id: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM land_survey_requests WHERE id = ${id}
    `);
  }

  // Survey Decisions (simplified implementation)
  async getApprovedSurveyDecisions(): Promise<ApprovedSurveyDecision[]> {
    const result = await db.execute(sql`
      SELECT * FROM approved_survey_decisions 
      WHERE is_active = true 
      ORDER BY approved_at DESC
    `);
    return result.rows as ApprovedSurveyDecision[];
  }

  async getApprovedSurveyDecision(id: string): Promise<ApprovedSurveyDecision | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM approved_survey_decisions WHERE id = ${id}
    `);
    return result.rows[0] as ApprovedSurveyDecision | undefined;
  }

  async getApprovedSurveyDecisionByNumber(decisionNumber: string): Promise<ApprovedSurveyDecision | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM approved_survey_decisions WHERE decision_number = ${decisionNumber}
    `);
    return result.rows[0] as ApprovedSurveyDecision | undefined;
  }

  async createApprovedSurveyDecision(decision: Partial<ApprovedSurveyDecision>): Promise<ApprovedSurveyDecision> {
    const id = randomUUID();
    const decisionNumber = `ASD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const result = await db.execute(sql`
      INSERT INTO approved_survey_decisions (
        id, survey_request_id, decision_number, land_area_m2, boundary_points,
        north_boundary, south_boundary, east_boundary, west_boundary,
        approved_by, decision_document_path, validity_period_months
      ) VALUES (
        ${id}, ${decision.surveyRequestId}, ${decisionNumber}, ${decision.landAreaM2},
        ${JSON.stringify(decision.boundaryPoints)}, ${decision.northBoundary},
        ${decision.southBoundary}, ${decision.eastBoundary}, ${decision.westBoundary},
        ${decision.approvedBy}, ${decision.decisionDocumentPath}, ${decision.validityPeriodMonths || 12}
      ) RETURNING *
    `);
    return result.rows[0] as ApprovedSurveyDecision;
  }

  async updateApprovedSurveyDecision(id: string, updates: Partial<ApprovedSurveyDecision>): Promise<ApprovedSurveyDecision> {
    const result = await db.execute(sql`
      UPDATE approved_survey_decisions 
      SET land_area_m2 = COALESCE(${updates.landAreaM2}, land_area_m2),
          boundary_points = COALESCE(${updates.boundaryPoints ? JSON.stringify(updates.boundaryPoints) : null}, boundary_points),
          is_active = COALESCE(${updates.isActive}, is_active)
      WHERE id = ${id} 
      RETURNING *
    `);
    return result.rows[0] as ApprovedSurveyDecision;
  }

  async deleteApprovedSurveyDecision(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE approved_survey_decisions SET is_active = false WHERE id = ${id}
    `);
  }

  // Notifications
  async getSystemNotifications(recipientId: string, filters?: { isRead?: boolean; type?: string }): Promise<SystemNotification[]> {
    let whereClause = `WHERE recipient_id = '${recipientId}'`;
    
    if (filters?.isRead !== undefined) {
      whereClause += ` AND is_read = ${filters.isRead}`;
    }
    if (filters?.type) {
      whereClause += ` AND notification_type = '${filters.type}'`;
    }

    const result = await db.execute(sql.raw(`
      SELECT * FROM system_notifications 
      ${whereClause}
      ORDER BY sent_at DESC
      LIMIT 50
    `));

    return result.rows as SystemNotification[];
  }

  async getSystemNotification(id: string): Promise<SystemNotification | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM system_notifications WHERE id = ${id}
    `);
    return result.rows[0] as SystemNotification | undefined;
  }

  async createSystemNotification(notification: Partial<SystemNotification>): Promise<SystemNotification> {
    const id = randomUUID();
    
    const result = await db.execute(sql`
      INSERT INTO system_notifications (
        id, recipient_id, notification_type, title, message, data
      ) VALUES (
        ${id}, ${notification.recipientId}, ${notification.notificationType || 'info'},
        ${notification.title}, ${notification.message}, ${notification.data ? JSON.stringify(notification.data) : null}
      ) RETURNING *
    `);
    return result.rows[0] as SystemNotification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.execute(sql`
      UPDATE system_notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}
    `);
  }

  async markAllNotificationsAsRead(recipientId: string): Promise<void> {
    await db.execute(sql`
      UPDATE system_notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP 
      WHERE recipient_id = ${recipientId} AND is_read = false
    `);
  }

  async deleteSystemNotification(id: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM system_notifications WHERE id = ${id}
    `);
  }

  // Enhanced Dashboard Statistics
  async getEnhancedDashboardStats(): Promise<{
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingSurveys: number;
    completedSurveys: number;
    totalServices: number;
    activeUsers: number;
    recentActivity: any[];
  }> {
    const stats = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications`),
      db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'submitted' OR status = 'under_review'`),
      db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'approved'`),
      db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'rejected'`),
      db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'pending'`),
      db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'completed'`),
      db.execute(sql`SELECT COUNT(*) as count FROM government_services WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`),
    ]);

    const recentActivity = await db.execute(sql`
      SELECT 'application' as type, application_number as reference, status, submitted_at as date
      FROM citizen_applications 
      ORDER BY submitted_at DESC 
      LIMIT 10
    `);

    return {
      totalApplications: parseInt(stats[0].rows[0].count),
      pendingApplications: parseInt(stats[1].rows[0].count),
      approvedApplications: parseInt(stats[2].rows[0].count),
      rejectedApplications: parseInt(stats[3].rows[0].count),
      pendingSurveys: parseInt(stats[4].rows[0].count),
      completedSurveys: parseInt(stats[5].rows[0].count),
      totalServices: parseInt(stats[6].rows[0].count),
      activeUsers: parseInt(stats[7].rows[0].count),
      recentActivity: recentActivity.rows,
    };
  }

  // Advanced Search
  async advancedSearch(query: string, filters?: {
    type?: 'services' | 'applications' | 'users' | 'all';
    categoryId?: string;
    ministryId?: string;
    status?: string;
  }): Promise<{
    services: GovernmentService[];
    applications: CitizenApplication[];
    surveys: LandSurveyRequest[];
  }> {
    const searchTerm = `%${query}%`;
    
    const [servicesResult, applicationsResult, surveysResult] = await Promise.all([
      db.execute(sql`
        SELECT * FROM government_services 
        WHERE (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
        AND is_active = true
        LIMIT 10
      `),
      db.execute(sql`
        SELECT * FROM citizen_applications 
        WHERE application_number ILIKE ${searchTerm}
        LIMIT 10
      `),
      db.execute(sql`
        SELECT * FROM land_survey_requests 
        WHERE (request_number ILIKE ${searchTerm} OR land_owner_name ILIKE ${searchTerm})
        LIMIT 10
      `)
    ]);

    return {
      services: servicesResult.rows as GovernmentService[],
      applications: applicationsResult.rows as CitizenApplication[],
      surveys: surveysResult.rows as LandSurveyRequest[],
    };
  }
}

export const enhancedStorage = new EnhancedDatabaseStorage();