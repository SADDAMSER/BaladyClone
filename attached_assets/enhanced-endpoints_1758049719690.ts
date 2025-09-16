/**
 * Enhanced API Endpoints with Pagination Support
 * 
 * هذا الملف يحتوي على تحسينات لـ endpoints الموجودة بإضافة دعم التصفح والبحث والتصفية
 * يجب دمج هذه التحسينات مع ملف api.ts الرئيسي
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq, and, or, desc, asc, like, sql } from "drizzle-orm";
import { applications, users, departments, tasks } from "@shared/schema";
import { 
  executePaginatedQuery, 
  validatePaginationParams, 
  createErrorResponse, 
  createSuccessResponse 
} from "./pagination-utils";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    roleCodes?: string[];
    geographicAssignments?: any[];
  };
}

/**
 * دالة لتسجيل endpoints المحسنة
 */
export function registerEnhancedEndpoints(
  app: Express, 
  db: any, 
  storage: any,
  authenticateToken: any,
  requireRole: any,
  enforceLBACAccess: any
) {

  // ======= ENHANCED APPLICATIONS API WITH PAGINATION =======

  /**
   * GET /api/applications - جلب الطلبات مع دعم التصفح المتقدم
   * يحل محل endpoint الموجود ويضيف ميزات جديدة
   */
  app.get("/api/applications/paginated", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paginationParams = validatePaginationParams(req.query);
      
      // تحديد الحقول القابلة للبحث
      const searchableFields = ['applicationNumber', 'notes'];
      
      // تحديد الحقول القابلة للتصفية
      const filterableFields = {
        applicationNumber: applications.applicationNumber,
        serviceId: applications.serviceId,
        status: applications.status,
        currentStage: applications.currentStage,
        assignedToId: applications.assignedToId,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt
      };
      
      // تحديد الحقول القابلة للترتيب
      const sortableFields = {
        applicationNumber: applications.applicationNumber,
        serviceId: applications.serviceId,
        status: applications.status,
        currentStage: applications.currentStage,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        fees: applications.fees
      };

      // شروط إضافية بناءً على دور المستخدم
      const baseConditions = [];
      
      // تطبيق LBAC - المستخدمون يرون فقط الطلبات في نطاقهم الجغرافي
      if (req.user?.role !== 'admin') {
        // هنا يجب تطبيق منطق LBAC الفعلي
        // للتبسيط، سنفترض أن المستخدمين غير الإداريين يرون فقط الطلبات المكلفين بها
        if (req.user?.role === 'engineer' || req.user?.role === 'surveyor') {
          baseConditions.push(eq(applications.assignedToId, req.user.id));
        }
      }

      // تنفيذ الاستعلام مع التصفح
      const result = await executePaginatedQuery(
        db,
        applications,
        paginationParams,
        searchableFields,
        filterableFields,
        sortableFields,
        baseConditions
      );

      // إضافة معلومات إضافية للطلبات
      const enrichedApplications = await Promise.all(
        result.data.map(async (application: any) => {
          const enrichedApp = { ...application };
          
          // جلب معلومات المستخدم المكلف
          if (application.assignedToId) {
            try {
              const assignedUser = await storage.getUser(application.assignedToId);
              enrichedApp.assignedTo = assignedUser ? {
                id: assignedUser.id,
                fullName: assignedUser.fullName,
                username: assignedUser.username
              } : null;
            } catch (error) {
              console.error('Error fetching assigned user:', error);
              enrichedApp.assignedTo = null;
            }
          }
          
          // حساب عدد المهام المرتبطة
          try {
            const taskCount = await db.select({ count: sql`count(*)` })
              .from(tasks)
              .where(eq(tasks.applicationId, application.id));
            enrichedApp.tasksCount = parseInt(taskCount[0]?.count || '0');
          } catch (error) {
            console.error('Error counting tasks:', error);
            enrichedApp.tasksCount = 0;
          }
          
          return enrichedApp;
        })
      );

      res.json(createSuccessResponse({
        ...result,
        data: enrichedApplications
      }));

    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع الطلبات"));
    }
  });

  /**
   * GET /api/applications/stats - إحصائيات الطلبات
   */
  app.get("/api/applications/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // بناء شروط الاستعلام بناءً على دور المستخدم
      let userCondition = null;
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        if (req.user?.role === 'engineer' || req.user?.role === 'surveyor') {
          userCondition = eq(applications.assignedToId, req.user.id);
        }
      }

      // حساب الإحصائيات
      const stats = await Promise.all([
        // إجمالي الطلبات
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition),
        
        // الطلبات الجديدة (submitted)
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition ? and(userCondition, eq(applications.status, 'submitted')) : eq(applications.status, 'submitted')),
        
        // الطلبات قيد المراجعة
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition ? and(userCondition, eq(applications.status, 'under_review')) : eq(applications.status, 'under_review')),
        
        // الطلبات المعتمدة
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition ? and(userCondition, eq(applications.status, 'approved')) : eq(applications.status, 'approved')),
        
        // الطلبات المكتملة
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition ? and(userCondition, eq(applications.status, 'completed')) : eq(applications.status, 'completed')),
        
        // الطلبات المرفوضة
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(userCondition ? and(userCondition, eq(applications.status, 'rejected')) : eq(applications.status, 'rejected'))
      ]);

      const statsResult = {
        total: parseInt(stats[0][0]?.count || '0'),
        submitted: parseInt(stats[1][0]?.count || '0'),
        underReview: parseInt(stats[2][0]?.count || '0'),
        approved: parseInt(stats[3][0]?.count || '0'),
        completed: parseInt(stats[4][0]?.count || '0'),
        rejected: parseInt(stats[5][0]?.count || '0')
      };

      res.json(createSuccessResponse(statsResult));

    } catch (error) {
      console.error("Error fetching application stats:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع إحصائيات الطلبات"));
    }
  });

  // ======= ENHANCED USERS API WITH PAGINATION =======

  /**
   * GET /api/users/paginated - جلب المستخدمين مع دعم التصفح المتقدم
   */
  app.get("/api/users/paginated", authenticateToken, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paginationParams = validatePaginationParams(req.query);
      
      // تحديد الحقول القابلة للبحث
      const searchableFields = ['fullName', 'username', 'email'];
      
      // تحديد الحقول القابلة للتصفية
      const filterableFields = {
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        positionId: users.positionId,
        isActive: users.isActive,
        createdAt: users.createdAt
      };
      
      // تحديد الحقول القابلة للترتيب
      const sortableFields = {
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt
      };

      // تنفيذ الاستعلام مع التصفح
      const result = await executePaginatedQuery(
        db,
        users,
        paginationParams,
        searchableFields,
        filterableFields,
        sortableFields
      );

      // إضافة معلومات إضافية للمستخدمين
      const enrichedUsers = await Promise.all(
        result.data.map(async (user: any) => {
          const enrichedUser = { ...user };
          
          // إزالة كلمة المرور من النتيجة
          delete enrichedUser.password;
          
          // جلب معلومات القسم
          if (user.departmentId) {
            try {
              const department = await storage.getDepartment(user.departmentId);
              enrichedUser.department = department ? {
                id: department.id,
                nameAr: department.nameAr,
                nameEn: department.nameEn
              } : null;
            } catch (error) {
              console.error('Error fetching department:', error);
              enrichedUser.department = null;
            }
          }
          
          // جلب معلومات المنصب
          if (user.positionId) {
            try {
              const position = await storage.getPosition(user.positionId);
              enrichedUser.position = position ? {
                id: position.id,
                titleAr: position.titleAr,
                titleEn: position.titleEn
              } : null;
            } catch (error) {
              console.error('Error fetching position:', error);
              enrichedUser.position = null;
            }
          }
          
          // حساب عدد المهام المكلف بها
          try {
            const taskCount = await db.select({ count: sql`count(*)` })
              .from(tasks)
              .where(eq(tasks.assignedToId, user.id));
            enrichedUser.assignedTasksCount = parseInt(taskCount[0]?.count || '0');
          } catch (error) {
            console.error('Error counting assigned tasks:', error);
            enrichedUser.assignedTasksCount = 0;
          }
          
          return enrichedUser;
        })
      );

      res.json(createSuccessResponse({
        ...result,
        data: enrichedUsers
      }));

    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع المستخدمين"));
    }
  });

  /**
   * GET /api/users/search - البحث السريع في المستخدمين
   */
  app.get("/api/users/search", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, role, department, limit = 10 } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json(createErrorResponse("يجب أن يكون البحث على الأقل حرفين"));
      }

      // بناء شروط البحث
      const searchConditions = [
        like(users.fullName, `%${q}%`),
        like(users.username, `%${q}%`),
        like(users.email, `%${q}%`)
      ];

      let whereCondition = or(...searchConditions);

      // إضافة تصفية الدور
      if (role && typeof role === 'string') {
        whereCondition = and(whereCondition, eq(users.role, role));
      }

      // إضافة تصفية القسم
      if (department && typeof department === 'string') {
        whereCondition = and(whereCondition, eq(users.departmentId, department));
      }

      // إضافة شرط المستخدمين النشطين فقط
      whereCondition = and(whereCondition, eq(users.isActive, true));

      // تنفيذ البحث
      const searchResults = await db.select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId
      })
      .from(users)
      .where(whereCondition)
      .limit(parseInt(limit as string))
      .orderBy(asc(users.fullName));

      res.json(createSuccessResponse(searchResults));

    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json(createErrorResponse("خطأ في البحث عن المستخدمين"));
    }
  });

  // ======= ENHANCED DEPARTMENTS API WITH PAGINATION =======

  /**
   * GET /api/departments/paginated - جلب الأقسام مع دعم التصفح
   */
  app.get("/api/departments/paginated", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paginationParams = validatePaginationParams(req.query);
      
      // تحديد الحقول القابلة للبحث والتصفية
      const searchableFields = ['nameAr', 'nameEn', 'description'];
      const filterableFields = {
        nameAr: departments.nameAr,
        nameEn: departments.nameEn,
        description: departments.description,
        isActive: departments.isActive,
        createdAt: departments.createdAt
      };
      const sortableFields = {
        nameAr: departments.nameAr,
        nameEn: departments.nameEn,
        createdAt: departments.createdAt
      };

      // تنفيذ الاستعلام مع التصفح
      const result = await executePaginatedQuery(
        db,
        departments,
        paginationParams,
        searchableFields,
        filterableFields,
        sortableFields
      );

      // إضافة معلومات إضافية للأقسام
      const enrichedDepartments = await Promise.all(
        result.data.map(async (department: any) => {
          const enrichedDept = { ...department };
          
          // حساب عدد الموظفين في القسم
          try {
            const employeeCount = await db.select({ count: sql`count(*)` })
              .from(users)
              .where(and(eq(users.departmentId, department.id), eq(users.isActive, true)));
            enrichedDept.employeeCount = parseInt(employeeCount[0]?.count || '0');
          } catch (error) {
            console.error('Error counting employees:', error);
            enrichedDept.employeeCount = 0;
          }
          
          return enrichedDept;
        })
      );

      res.json(createSuccessResponse({
        ...result,
        data: enrichedDepartments
      }));

    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع الأقسام"));
    }
  });

  /**
   * GET /api/dashboard/stats - إحصائيات لوحة التحكم
   */
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // بناء شروط الاستعلام بناءً على دور المستخدم
      let applicationCondition = null;
      let taskCondition = null;
      
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        if (req.user?.role === 'engineer' || req.user?.role === 'surveyor') {
          applicationCondition = eq(applications.assignedToId, req.user.id);
          taskCondition = or(
            eq(tasks.assignedToId, req.user.id),
            eq(tasks.assignedById, req.user.id)
          );
        }
      }

      // حساب الإحصائيات بشكل متوازي
      const [
        totalApplications,
        pendingApplications,
        totalTasks,
        pendingTasks,
        totalUsers,
        totalDepartments
      ] = await Promise.all([
        // إجمالي الطلبات
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(applicationCondition),
        
        // الطلبات المعلقة
        db.select({ count: sql`count(*)` })
          .from(applications)
          .where(applicationCondition ? 
            and(applicationCondition, eq(applications.status, 'submitted')) : 
            eq(applications.status, 'submitted')),
        
        // إجمالي المهام
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(taskCondition),
        
        // المهام المعلقة
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(taskCondition ? 
            and(taskCondition, eq(tasks.status, 'pending')) : 
            eq(tasks.status, 'pending')),
        
        // إجمالي المستخدمين (للإداريين فقط)
        req.user?.role === 'admin' ? 
          db.select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.isActive, true)) : 
          Promise.resolve([{ count: '0' }]),
        
        // إجمالي الأقسام (للإداريين فقط)
        req.user?.role === 'admin' ? 
          db.select({ count: sql`count(*)` })
            .from(departments)
            .where(eq(departments.isActive, true)) : 
          Promise.resolve([{ count: '0' }])
      ]);

      const dashboardStats = {
        applications: {
          total: parseInt(totalApplications[0]?.count || '0'),
          pending: parseInt(pendingApplications[0]?.count || '0')
        },
        tasks: {
          total: parseInt(totalTasks[0]?.count || '0'),
          pending: parseInt(pendingTasks[0]?.count || '0')
        },
        users: {
          total: parseInt(totalUsers[0]?.count || '0')
        },
        departments: {
          total: parseInt(totalDepartments[0]?.count || '0')
        }
      };

      res.json(createSuccessResponse(dashboardStats));

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع إحصائيات لوحة التحكم"));
    }
  });

  console.log("✅ Enhanced API endpoints registered successfully with pagination support");
}

