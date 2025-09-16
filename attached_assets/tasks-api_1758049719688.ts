/**
 * Tasks API Endpoints with Pagination Support
 * 
 * هذا الملف يحتوي على endpoints إدارة المهام مع دعم التصفح والبحث والتصفية
 * يجب دمج هذه الـ endpoints مع ملف api.ts الرئيسي
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { tasks, users, applications } from "@shared/schema";
import { insertTaskSchema } from "@shared/schema";
import { 
  executePaginatedQuery, 
  validatePaginationParams, 
  createErrorResponse, 
  createSuccessResponse,
  type PaginationParams 
} from "./pagination-utils";

// تعريف الأنواع المطلوبة (يجب استيرادها من الملفات الأصلية)
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
 * دالة لتسجيل endpoints المهام
 * يجب استدعاء هذه الدالة من ملف api.ts الرئيسي
 */
export function registerTasksEndpoints(
  app: Express, 
  db: any, 
  storage: any,
  authenticateToken: any,
  requireRole: any,
  enforceLBACAccess: any,
  validateRequest: any
) {

  // ======= TASKS MANAGEMENT API WITH PAGINATION =======

  /**
   * GET /api/tasks - جلب المهام مع دعم التصفح والبحث والتصفية
   */
  app.get("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // التحقق من صحة معاملات التصفح
      const paginationParams = validatePaginationParams(req.query);
      
      // تحديد الحقول القابلة للبحث
      const searchableFields = ['title', 'description', 'notes'];
      
      // تحديد الحقول القابلة للتصفية
      const filterableFields = {
        title: tasks.title,
        description: tasks.description,
        notes: tasks.notes,
        status: tasks.status,
        priority: tasks.priority,
        assignedToId: tasks.assignedToId,
        assignedById: tasks.assignedById,
        applicationId: tasks.applicationId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      };
      
      // تحديد الحقول القابلة للترتيب
      const sortableFields = {
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        dueDate: tasks.dueDate
      };

      // شروط إضافية بناءً على دور المستخدم
      const baseConditions = [];
      
      // إذا لم يكن المستخدم admin أو manager، يرى فقط المهام المكلف بها
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        baseConditions.push(
          or(
            eq(tasks.assignedToId, req.user!.id),
            eq(tasks.assignedById, req.user!.id)
          )
        );
      }

      // تنفيذ الاستعلام مع التصفح
      const result = await executePaginatedQuery(
        db,
        tasks,
        paginationParams,
        searchableFields,
        filterableFields,
        sortableFields,
        baseConditions
      );

      // إضافة معلومات إضافية للمهام (المستخدم المكلف والطلب المرتبط)
      const enrichedTasks = await Promise.all(
        result.data.map(async (task: any) => {
          const enrichedTask = { ...task };
          
          // جلب معلومات المستخدم المكلف
          if (task.assignedToId) {
            try {
              const assignedUser = await storage.getUser(task.assignedToId);
              enrichedTask.assignedTo = assignedUser ? {
                id: assignedUser.id,
                fullName: assignedUser.fullName,
                username: assignedUser.username
              } : null;
            } catch (error) {
              console.error('Error fetching assigned user:', error);
              enrichedTask.assignedTo = null;
            }
          }
          
          // جلب معلومات المستخدم الذي كلف المهمة
          if (task.assignedById) {
            try {
              const assignedByUser = await storage.getUser(task.assignedById);
              enrichedTask.assignedBy = assignedByUser ? {
                id: assignedByUser.id,
                fullName: assignedByUser.fullName,
                username: assignedByUser.username
              } : null;
            } catch (error) {
              console.error('Error fetching assigning user:', error);
              enrichedTask.assignedBy = null;
            }
          }
          
          // جلب معلومات الطلب المرتبط
          if (task.applicationId) {
            try {
              const application = await storage.getApplication(task.applicationId);
              enrichedTask.application = application ? {
                id: application.id,
                applicationNumber: application.applicationNumber,
                serviceId: application.serviceId,
                status: application.status
              } : null;
            } catch (error) {
              console.error('Error fetching application:', error);
              enrichedTask.application = null;
            }
          }
          
          return enrichedTask;
        })
      );

      res.json(createSuccessResponse({
        ...result,
        data: enrichedTasks
      }));

    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع المهام"));
    }
  });

  /**
   * GET /api/tasks/:id - جلب مهمة محددة
   */
  app.get("/api/tasks/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      
      // جلب المهمة من قاعدة البيانات
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json(createErrorResponse("المهمة غير موجودة"));
      }

      // التحقق من الصلاحيات - المستخدم يمكنه رؤية المهام المكلف بها أو التي كلفها
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        if (task.assignedToId !== req.user?.id && task.assignedById !== req.user?.id) {
          return res.status(403).json(createErrorResponse("ليس لديك صلاحية لرؤية هذه المهمة"));
        }
      }

      // إضافة معلومات إضافية
      const enrichedTask = { ...task };
      
      // جلب معلومات المستخدم المكلف
      if (task.assignedToId) {
        const assignedUser = await storage.getUser(task.assignedToId);
        enrichedTask.assignedTo = assignedUser ? {
          id: assignedUser.id,
          fullName: assignedUser.fullName,
          username: assignedUser.username,
          email: assignedUser.email
        } : null;
      }
      
      // جلب معلومات المستخدم الذي كلف المهمة
      if (task.assignedById) {
        const assignedByUser = await storage.getUser(task.assignedById);
        enrichedTask.assignedBy = assignedByUser ? {
          id: assignedByUser.id,
          fullName: assignedByUser.fullName,
          username: assignedByUser.username
        } : null;
      }
      
      // جلب معلومات الطلب المرتبط
      if (task.applicationId) {
        const application = await storage.getApplication(task.applicationId);
        enrichedTask.application = application;
      }

      res.json(createSuccessResponse(enrichedTask));

    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع المهمة"));
    }
  });

  /**
   * POST /api/tasks - إنشاء مهمة جديدة
   */
  app.post("/api/tasks", 
    authenticateToken, 
    requireRole(['admin', 'manager']), 
    validateRequest(insertTaskSchema), 
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskData = {
        ...req.body,
        assignedById: req.user!.id, // تعيين المستخدم الحالي كمن كلف المهمة
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // التحقق من وجود المستخدم المكلف
      if (taskData.assignedToId) {
        const assignedUser = await storage.getUser(taskData.assignedToId);
        if (!assignedUser) {
          return res.status(400).json(createErrorResponse("المستخدم المكلف غير موجود"));
        }
      }

      // التحقق من وجود الطلب المرتبط (إذا كان موجوداً)
      if (taskData.applicationId) {
        const application = await storage.getApplication(taskData.applicationId);
        if (!application) {
          return res.status(400).json(createErrorResponse("الطلب المرتبط غير موجود"));
        }
      }

      // إنشاء المهمة
      const newTask = await storage.createTask(taskData);

      // إنشاء إشعار للمستخدم المكلف
      if (taskData.assignedToId && taskData.assignedToId !== req.user!.id) {
        try {
          await storage.createNotification({
            userId: taskData.assignedToId,
            title: "مهمة جديدة",
            message: `تم تكليفك بمهمة جديدة: ${taskData.title}`,
            type: "task_assigned",
            relatedEntityType: "task",
            relatedEntityId: newTask.id,
            isRead: false
          });
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
          // لا نوقف العملية إذا فشل إنشاء الإشعار
        }
      }

      res.status(201).json(createSuccessResponse(newTask, "تم إنشاء المهمة بنجاح"));

    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("بيانات المهمة غير صحيحة"));
      }
      res.status(500).json(createErrorResponse("خطأ في إنشاء المهمة"));
    }
  });

  /**
   * PUT /api/tasks/:id - تحديث مهمة موجودة
   */
  app.put("/api/tasks/:id", 
    authenticateToken, 
    validateRequest(insertTaskSchema.partial()), 
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      
      // جلب المهمة الحالية
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json(createErrorResponse("المهمة غير موجودة"));
      }

      // التحقق من الصلاحيات
      const canUpdate = req.user?.role === 'admin' || 
                       req.user?.role === 'manager' ||
                       existingTask.assignedToId === req.user?.id ||
                       existingTask.assignedById === req.user?.id;

      if (!canUpdate) {
        return res.status(403).json(createErrorResponse("ليس لديك صلاحية لتحديث هذه المهمة"));
      }

      // إعداد بيانات التحديث
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };

      // التحقق من وجود المستخدم المكلف الجديد (إذا تم تغييره)
      if (updateData.assignedToId && updateData.assignedToId !== existingTask.assignedToId) {
        const assignedUser = await storage.getUser(updateData.assignedToId);
        if (!assignedUser) {
          return res.status(400).json(createErrorResponse("المستخدم المكلف الجديد غير موجود"));
        }

        // إنشاء إشعار للمستخدم المكلف الجديد
        try {
          await storage.createNotification({
            userId: updateData.assignedToId,
            title: "تم تكليفك بمهمة",
            message: `تم تكليفك بمهمة: ${existingTask.title}`,
            type: "task_assigned",
            relatedEntityType: "task",
            relatedEntityId: taskId,
            isRead: false
          });
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }

      // تحديث المهمة
      const updatedTask = await storage.updateTask(taskId, updateData);

      res.json(createSuccessResponse(updatedTask, "تم تحديث المهمة بنجاح"));

    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse("بيانات التحديث غير صحيحة"));
      }
      res.status(500).json(createErrorResponse("خطأ في تحديث المهمة"));
    }
  });

  /**
   * DELETE /api/tasks/:id - حذف مهمة
   */
  app.delete("/api/tasks/:id", 
    authenticateToken, 
    requireRole(['admin', 'manager']), 
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      
      // التحقق من وجود المهمة
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json(createErrorResponse("المهمة غير موجودة"));
      }

      // حذف المهمة
      await storage.deleteTask(taskId);

      res.json(createSuccessResponse(null, "تم حذف المهمة بنجاح"));

    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json(createErrorResponse("خطأ في حذف المهمة"));
    }
  });

  /**
   * PUT /api/tasks/:id/status - تحديث حالة المهمة
   */
  app.put("/api/tasks/:id/status", 
    authenticateToken, 
    async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = req.params.id;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json(createErrorResponse("حالة المهمة مطلوبة"));
      }

      // التحقق من صحة الحالة
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json(createErrorResponse("حالة المهمة غير صحيحة"));
      }

      // جلب المهمة الحالية
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json(createErrorResponse("المهمة غير موجودة"));
      }

      // التحقق من الصلاحيات
      const canUpdateStatus = req.user?.role === 'admin' || 
                             req.user?.role === 'manager' ||
                             existingTask.assignedToId === req.user?.id;

      if (!canUpdateStatus) {
        return res.status(403).json(createErrorResponse("ليس لديك صلاحية لتحديث حالة هذه المهمة"));
      }

      // تحديث حالة المهمة
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      // إضافة ملاحظات إذا كانت موجودة
      if (notes) {
        updateData.notes = notes;
      }

      // إضافة تاريخ الإكمال إذا كانت الحالة مكتملة
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      const updatedTask = await storage.updateTask(taskId, updateData);

      // إنشاء إشعار لمن كلف المهمة (إذا لم يكن هو من حدث الحالة)
      if (existingTask.assignedById && existingTask.assignedById !== req.user?.id) {
        try {
          const statusMessages = {
            pending: 'في الانتظار',
            in_progress: 'قيد التنفيذ',
            completed: 'مكتملة',
            cancelled: 'ملغية',
            on_hold: 'معلقة'
          };

          await storage.createNotification({
            userId: existingTask.assignedById,
            title: "تحديث حالة المهمة",
            message: `تم تحديث حالة المهمة "${existingTask.title}" إلى: ${statusMessages[status]}`,
            type: "task_status_updated",
            relatedEntityType: "task",
            relatedEntityId: taskId,
            isRead: false
          });
        } catch (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }

      res.json(createSuccessResponse(updatedTask, "تم تحديث حالة المهمة بنجاح"));

    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json(createErrorResponse("خطأ في تحديث حالة المهمة"));
    }
  });

  /**
   * GET /api/tasks/stats - إحصائيات المهام
   */
  app.get("/api/tasks/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // بناء شروط الاستعلام بناءً على دور المستخدم
      let userCondition = null;
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        userCondition = or(
          eq(tasks.assignedToId, req.user!.id),
          eq(tasks.assignedById, req.user!.id)
        );
      }

      // حساب الإحصائيات
      const stats = await Promise.all([
        // إجمالي المهام
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(userCondition),
        
        // المهام المعلقة
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(userCondition ? and(userCondition, eq(tasks.status, 'pending')) : eq(tasks.status, 'pending')),
        
        // المهام قيد التنفيذ
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(userCondition ? and(userCondition, eq(tasks.status, 'in_progress')) : eq(tasks.status, 'in_progress')),
        
        // المهام المكتملة
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(userCondition ? and(userCondition, eq(tasks.status, 'completed')) : eq(tasks.status, 'completed')),
        
        // المهام المتأخرة (due date في الماضي وليست مكتملة)
        db.select({ count: sql`count(*)` })
          .from(tasks)
          .where(userCondition ? 
            and(userCondition, sql`due_date < NOW()`, sql`status != 'completed'`) : 
            and(sql`due_date < NOW()`, sql`status != 'completed'`)
          )
      ]);

      const statsResult = {
        total: parseInt(stats[0][0]?.count || '0'),
        pending: parseInt(stats[1][0]?.count || '0'),
        inProgress: parseInt(stats[2][0]?.count || '0'),
        completed: parseInt(stats[3][0]?.count || '0'),
        overdue: parseInt(stats[4][0]?.count || '0')
      };

      res.json(createSuccessResponse(statsResult));

    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع إحصائيات المهام"));
    }
  });

  /**
   * GET /api/tasks/my-tasks - المهام الخاصة بالمستخدم الحالي
   */
  app.get("/api/tasks/my-tasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paginationParams = validatePaginationParams(req.query);
      
      // تحديد الحقول القابلة للبحث والتصفية
      const searchableFields = ['title', 'description', 'notes'];
      const filterableFields = {
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority
      };
      const sortableFields = {
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        dueDate: tasks.dueDate
      };

      // شرط أساسي: المهام المكلف بها المستخدم الحالي فقط
      const baseConditions = [eq(tasks.assignedToId, req.user!.id)];

      const result = await executePaginatedQuery(
        db,
        tasks,
        paginationParams,
        searchableFields,
        filterableFields,
        sortableFields,
        baseConditions
      );

      res.json(createSuccessResponse(result));

    } catch (error) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json(createErrorResponse("خطأ في استرجاع مهامي"));
    }
  });

  console.log("✅ Tasks API endpoints registered successfully with pagination support");
}

