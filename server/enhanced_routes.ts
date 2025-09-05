// =========================================================
// Enhanced API Routes for Yemen Digital Platform
// طرق API المحسنة لمنصة بناء اليمن الرقمية
// =========================================================

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Validation schemas for enhanced features
const createServiceCategorySchema = z.object({
  name: z.string().min(1, "اسم الفئة مطلوب"),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().default(0),
});

const createGovernmentServiceSchema = z.object({
  name: z.string().min(1, "اسم الخدمة مطلوب"),
  nameEn: z.string().optional(),
  categoryId: z.string().uuid("معرف الفئة غير صحيح"),
  ministryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  description: z.string().optional(),
  requirementsAr: z.string().optional(),
  requirementsEn: z.string().optional(),
  estimatedDurationDays: z.number().default(7),
  feesAmount: z.number().default(0),
  feesCurrency: z.string().default("YER"),
  isOnlineService: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

const createCitizenApplicationSchema = z.object({
  serviceId: z.string().uuid("معرف الخدمة مطلوب"),
  applicantId: z.string().uuid("معرف المتقدم مطلوب"),
  applicationData: z.any(),
  totalFees: z.number().default(0),
  notes: z.string().optional(),
});

const createLandSurveyRequestSchema = z.object({
  applicationId: z.string().uuid("معرف الطلب مطلوب"),
  landOwnerName: z.string().min(1, "اسم مالك الأرض مطلوب"),
  landLocationDescription: z.string().min(1, "وصف موقع الأرض مطلوب"),
  surveyPurpose: z.string().optional(),
  surveyorAssignedId: z.string().uuid().optional(),
  surveyDate: z.string().optional(),
});

export function registerEnhancedRoutes(app: Express): void {
  
  // =========================================================
  // Service Categories API
  // =========================================================
  
  // Get all service categories
  app.get("/api/service-categories", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM service_categories 
        WHERE is_active = true 
        ORDER BY sort_order, name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching service categories:", error);
      res.status(500).json({ message: "خطأ في استرجاع فئات الخدمات" });
    }
  });

  // Create service category
  app.post("/api/service-categories", async (req, res) => {
    try {
      const data = createServiceCategorySchema.parse(req.body);
      
      const result = await db.execute(sql`
        INSERT INTO service_categories (
          id, name, name_en, description, icon, color, sort_order
        ) VALUES (
          gen_random_uuid(), ${data.name}, ${data.nameEn}, 
          ${data.description}, ${data.icon}, ${data.color}, ${data.sortOrder}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating service category:", error);
      res.status(500).json({ message: "خطأ في إنشاء فئة الخدمة" });
    }
  });

  // =========================================================
  // Government Services API
  // =========================================================
  
  // Get all government services
  app.get("/api/government-services", async (req, res) => {
    try {
      const { categoryId, ministryId, isActive = 'true' } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (categoryId) {
        whereClause += ` AND gs.category_id = $${params.length + 1}`;
        params.push(categoryId);
      }
      if (ministryId) {
        whereClause += ` AND gs.ministry_id = $${params.length + 1}`;
        params.push(ministryId);
      }
      if (isActive === 'true') {
        whereClause += ` AND gs.is_active = true`;
      }

      const result = await db.execute(sql.raw(`
        SELECT 
          gs.*,
          sc.name as category_name,
          m.name as ministry_name
        FROM government_services gs
        LEFT JOIN service_categories sc ON gs.category_id = sc.id
        LEFT JOIN ministries m ON gs.ministry_id = m.id
        ${whereClause}
        ORDER BY gs.is_featured DESC, gs.name
      `, params));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching government services:", error);
      res.status(500).json({ message: "خطأ في استرجاع الخدمات الحكومية" });
    }
  });

  // Get featured services
  app.get("/api/government-services/featured", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          gs.*,
          sc.name as category_name,
          m.name as ministry_name
        FROM government_services gs
        LEFT JOIN service_categories sc ON gs.category_id = sc.id
        LEFT JOIN ministries m ON gs.ministry_id = m.id
        WHERE gs.is_featured = true AND gs.is_active = true
        ORDER BY gs.name
        LIMIT 6
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching featured services:", error);
      res.status(500).json({ message: "خطأ في استرجاع الخدمات المميزة" });
    }
  });

  // Get single government service
  app.get("/api/government-services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await db.execute(sql`
        SELECT 
          gs.*,
          sc.name as category_name,
          m.name as ministry_name,
          d.name as department_name
        FROM government_services gs
        LEFT JOIN service_categories sc ON gs.category_id = sc.id
        LEFT JOIN ministries m ON gs.ministry_id = m.id
        LEFT JOIN departments d ON gs.department_id = d.id
        WHERE gs.id = ${id}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "الخدمة غير موجودة" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching government service:", error);
      res.status(500).json({ message: "خطأ في استرجاع الخدمة" });
    }
  });

  // Create government service
  app.post("/api/government-services", async (req, res) => {
    try {
      const data = createGovernmentServiceSchema.parse(req.body);
      
      const serviceCode = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const result = await db.execute(sql`
        INSERT INTO government_services (
          id, service_code, name, name_en, category_id, ministry_id, department_id,
          description, requirements_ar, requirements_en, estimated_duration_days,
          fees_amount, fees_currency, is_online_service, is_featured
        ) VALUES (
          gen_random_uuid(), ${serviceCode}, ${data.name}, ${data.nameEn}, 
          ${data.categoryId}, ${data.ministryId}, ${data.departmentId},
          ${data.description}, ${data.requirementsAr}, ${data.requirementsEn}, 
          ${data.estimatedDurationDays}, ${data.feesAmount}, ${data.feesCurrency},
          ${data.isOnlineService}, ${data.isFeatured}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating government service:", error);
      res.status(500).json({ message: "خطأ في إنشاء الخدمة" });
    }
  });

  // =========================================================
  // Citizen Applications API
  // =========================================================
  
  // Get citizen applications
  app.get("/api/citizen-applications", async (req, res) => {
    try {
      const { status, applicantId, serviceId, page = '1', limit = '20' } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND ca.status = $${params.length + 1}`;
        params.push(status);
      }
      if (applicantId) {
        whereClause += ` AND ca.applicant_id = $${params.length + 1}`;
        params.push(applicantId);
      }
      if (serviceId) {
        whereClause += ` AND ca.service_id = $${params.length + 1}`;
        params.push(serviceId);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const result = await db.execute(sql.raw(`
        SELECT 
          ca.*,
          gs.name as service_name,
          u.full_name as applicant_name,
          COUNT(*) OVER() as total_count
        FROM citizen_applications ca
        LEFT JOIN government_services gs ON ca.service_id = gs.id
        LEFT JOIN users u ON ca.applicant_id = u.id
        ${whereClause}
        ORDER BY ca.submitted_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params));

      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / parseInt(limit as string));

      res.json({
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages,
        }
      });
    } catch (error) {
      console.error("Error fetching citizen applications:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلبات" });
    }
  });

  // Get single citizen application
  app.get("/api/citizen-applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await db.execute(sql`
        SELECT 
          ca.*,
          gs.name as service_name,
          gs.estimated_duration_days,
          u.full_name as applicant_name,
          u.email as applicant_email,
          u.phone_number as applicant_phone
        FROM citizen_applications ca
        LEFT JOIN government_services gs ON ca.service_id = gs.id
        LEFT JOIN users u ON ca.applicant_id = u.id
        WHERE ca.id = ${id}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching citizen application:", error);
      res.status(500).json({ message: "خطأ في استرجاع الطلب" });
    }
  });

  // Create citizen application
  app.post("/api/citizen-applications", async (req, res) => {
    try {
      const data = createCitizenApplicationSchema.parse(req.body);
      
      const applicationNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const result = await db.execute(sql`
        INSERT INTO citizen_applications (
          id, application_number, service_id, applicant_id, 
          application_data, total_fees, notes
        ) VALUES (
          gen_random_uuid(), ${applicationNumber}, ${data.serviceId}, 
          ${data.applicantId}, ${JSON.stringify(data.applicationData)}, 
          ${data.totalFees}, ${data.notes}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating citizen application:", error);
      res.status(500).json({ message: "خطأ في إنشاء الطلب" });
    }
  });

  // Update application status
  app.patch("/api/citizen-applications/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "حالة غير صحيحة" });
      }

      const result = await db.execute(sql`
        UPDATE citizen_applications 
        SET 
          status = ${status},
          notes = COALESCE(${notes}, notes),
          completed_at = CASE WHEN ${status} IN ('approved', 'completed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة الطلب" });
    }
  });

  // =========================================================
  // Land Survey Requests API
  // =========================================================
  
  // Get land survey requests
  app.get("/api/land-survey-requests", async (req, res) => {
    try {
      const { status, surveyorAssignedId } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND lsr.status = $${params.length + 1}`;
        params.push(status);
      }
      if (surveyorAssignedId) {
        whereClause += ` AND lsr.surveyor_assigned_id = $${params.length + 1}`;
        params.push(surveyorAssignedId);
      }

      const result = await db.execute(sql.raw(`
        SELECT 
          lsr.*,
          ca.application_number,
          ca.status as application_status,
          u.full_name as surveyor_name
        FROM land_survey_requests lsr
        LEFT JOIN citizen_applications ca ON lsr.application_id = ca.id
        LEFT JOIN users u ON lsr.surveyor_assigned_id = u.id
        ${whereClause}
        ORDER BY lsr.created_at DESC
      `, params));

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching land survey requests:", error);
      res.status(500).json({ message: "خطأ في استرجاع طلبات المساحة" });
    }
  });

  // Create land survey request
  app.post("/api/land-survey-requests", async (req, res) => {
    try {
      const data = createLandSurveyRequestSchema.parse(req.body);
      
      const requestNumber = `LSR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const result = await db.execute(sql`
        INSERT INTO land_survey_requests (
          id, request_number, application_id, land_owner_name, 
          land_location_description, survey_purpose, 
          surveyor_assigned_id, survey_date
        ) VALUES (
          gen_random_uuid(), ${requestNumber}, ${data.applicationId}, 
          ${data.landOwnerName}, ${data.landLocationDescription}, 
          ${data.surveyPurpose}, ${data.surveyorAssignedId}, 
          ${data.surveyDate ? new Date(data.surveyDate) : null}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating land survey request:", error);
      res.status(500).json({ message: "خطأ في إنشاء طلب المساحة" });
    }
  });

  // =========================================================
  // Enhanced Dashboard Statistics
  // =========================================================
  
  app.get("/api/enhanced-dashboard/stats", async (req, res) => {
    try {
      const stats = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status IN ('submitted', 'under_review')`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'approved'`),
        db.execute(sql`SELECT COUNT(*) as count FROM citizen_applications WHERE status = 'rejected'`),
        db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'pending'`),
        db.execute(sql`SELECT COUNT(*) as count FROM land_survey_requests WHERE status = 'completed'`),
        db.execute(sql`SELECT COUNT(*) as count FROM government_services WHERE is_active = true`),
        db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`),
      ]);

      const recentActivity = await db.execute(sql`
        SELECT 
          'application' as type, 
          application_number as reference, 
          status, 
          submitted_at as date
        FROM citizen_applications 
        ORDER BY submitted_at DESC 
        LIMIT 10
      `);

      res.json({
        totalApplications: parseInt(stats[0].rows[0].count),
        pendingApplications: parseInt(stats[1].rows[0].count),
        approvedApplications: parseInt(stats[2].rows[0].count),
        rejectedApplications: parseInt(stats[3].rows[0].count),
        pendingSurveys: parseInt(stats[4].rows[0].count),
        completedSurveys: parseInt(stats[5].rows[0].count),
        totalServices: parseInt(stats[6].rows[0].count),
        activeUsers: parseInt(stats[7].rows[0].count),
        recentActivity: recentActivity.rows,
      });
    } catch (error) {
      console.error("Error fetching enhanced dashboard stats:", error);
      res.status(500).json({ message: "خطأ في استرجاع إحصائيات لوحة التحكم" });
    }
  });

  // =========================================================
  // Search API
  // =========================================================
  
  app.get("/api/enhanced-search", async (req, res) => {
    try {
      const { q: query, type = 'all', limit = '10' } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "مطلوب كلمة البحث" });
      }

      const searchTerm = `%${query}%`;
      const searchLimit = parseInt(limit as string);

      const results: any = {};

      if (type === 'all' || type === 'services') {
        const servicesResult = await db.execute(sql`
          SELECT id, name, description, service_code
          FROM government_services 
          WHERE (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
          AND is_active = true
          LIMIT ${searchLimit}
        `);
        results.services = servicesResult.rows;
      }

      if (type === 'all' || type === 'applications') {
        const applicationsResult = await db.execute(sql`
          SELECT id, application_number, status, submitted_at
          FROM citizen_applications 
          WHERE application_number ILIKE ${searchTerm}
          LIMIT ${searchLimit}
        `);
        results.applications = applicationsResult.rows;
      }

      if (type === 'all' || type === 'surveys') {
        const surveysResult = await db.execute(sql`
          SELECT id, request_number, land_owner_name, status
          FROM land_survey_requests 
          WHERE (request_number ILIKE ${searchTerm} OR land_owner_name ILIKE ${searchTerm})
          LIMIT ${searchLimit}
        `);
        results.surveys = surveysResult.rows;
      }

      res.json(results);
    } catch (error) {
      console.error("Error performing enhanced search:", error);
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  // =========================================================
  // Ministries API
  // =========================================================
  
  app.get("/api/ministries", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM ministries 
        WHERE is_active = true 
        ORDER BY name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching ministries:", error);
      res.status(500).json({ message: "خطأ في استرجاع الوزارات" });
    }
  });
}