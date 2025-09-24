import { Router } from 'express';
import { z } from 'zod';
import { workflowService } from '../services/workflowService';
// Authentication middleware (will be found in main routes.ts)
const authenticateToken = (req: any, res: any, next: any) => {
  // Temporary placeholder - will be integrated with existing auth system
  req.user = { id: 'test-user-id', role: 'employee' }; // Mock for now
  next();
};

const validateRequest = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ success: false, message: 'Validation error', error });
    }
  };
};

const router = Router();

// ==========================================
// Schema validation للـ workflow routes
// ==========================================

const transitionSchema = z.object({
  fromStage: z.string(),
  toStage: z.string(),
  transitionData: z.record(z.any()).optional(),
  notes: z.string().optional()
});

const pathDeterminationSchema = z.object({
  submissionType: z.enum(['office', 'digital']),
  signatureType: z.enum(['manual', 'digital']),
  paymentType: z.enum(['cash', 'electronic'])
});

// ==========================================
// Workflow Management Routes - المهمة 1.2
// ==========================================

/**
 * بدء workflow جديد لطلب قرار مساحي
 * POST /api/workflow/start/:applicationId
 */
router.post('/start/:applicationId', authenticateToken, async (req, res) => {
  try {
    console.log(`[WORKFLOW] Starting workflow for application ${req.params.applicationId}`);
    
    const instance = await workflowService.startWorkflowInstance(req.params.applicationId);
    
    res.status(201).json({
      success: true,
      message: 'تم بدء سير العمل بنجاح',
      data: {
        instanceId: instance.id,
        currentStage: instance.currentStage,
        status: instance.status
      }
    });

  } catch (error) {
    console.error('[WORKFLOW] Error starting workflow:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في بدء سير العمل',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * تحديد مسار المعالجة (مكتبي/بوابة)
 * POST /api/workflow/:applicationId/determine-path
 */
router.post(
  '/:applicationId/determine-path', 
  authenticateToken,
  validateRequest(pathDeterminationSchema),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { submissionType } = req.body;

      console.log(`[WORKFLOW] Determining path for application ${applicationId}: ${submissionType}`);

      const pathName = await workflowService.determinePath(applicationId, submissionType);

      res.json({
        success: true,
        message: 'تم تحديد مسار المعالجة',
        data: {
          applicationId,
          submissionType,
          pathName,
          nextStage: 'public_service_review'
        }
      });

    } catch (error) {
      console.error('[WORKFLOW] Error determining path:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديد مسار المعالجة',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * الانتقال إلى المرحلة التالية
 * POST /api/workflow/transition/:instanceId
 */
router.post(
  '/transition/:instanceId',
  authenticateToken,
  validateRequest(transitionSchema),
  async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { fromStage, toStage, transitionData, notes } = req.body;
      const userId = (req as any).user.id;

      console.log(`[WORKFLOW] Transitioning instance ${instanceId} from ${fromStage} to ${toStage}`);

      const updatedInstance = await workflowService.transitionToNextStage(
        instanceId,
        fromStage,
        toStage,
        userId,
        { ...transitionData, notes }
      );

      res.json({
        success: true,
        message: `تم الانتقال من ${fromStage} إلى ${toStage}`,
        data: {
          instanceId: updatedInstance.id,
          currentStage: updatedInstance.currentStage,
          stageHistory: updatedInstance.stageHistory
        }
      });

    } catch (error) {
      console.error('[WORKFLOW] Error in stage transition:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في انتقال المرحلة',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * الحصول على جميع المراحل النشطة للمستخدم
 * GET /api/workflow/my-tasks
 */
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log(`[WORKFLOW] Getting active tasks for user ${userId} with role ${userRole}`);

    // هنا سنحتاج لتنفيذ logic للحصول على المهام المخصصة للمستخدم
    // بناءً على دوره والموقع الجغرافي (LBAC)
    
    const activeTasks: any[] = []; // placeholder - سيتم تنفيذه لاحقاً

    res.json({
      success: true,
      message: 'تم الحصول على المهام النشطة',
      data: {
        userId,
        userRole,
        tasks: activeTasks,
        totalCount: activeTasks.length
      }
    });

  } catch (error) {
    console.error('[WORKFLOW] Error getting user tasks:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على المهام',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * الحصول على تفاصيل workflow instance
 * GET /api/workflow/instance/:instanceId
 */
router.get('/instance/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;

    console.log(`[WORKFLOW] Getting instance details for ${instanceId}`);

    // سيتم تنفيذ الـ logic للحصول على تفاصيل الـ instance
    const instanceDetails: any = {}; // placeholder

    res.json({
      success: true,
      data: instanceDetails
    });

  } catch (error) {
    console.error('[WORKFLOW] Error getting instance details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على تفاصيل سير العمل',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * الحصول على إحصائيات الـ workflow
 * GET /api/workflow/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    console.log(`[WORKFLOW] Getting workflow stats for user ${userId}`);

    const activeInstances = await workflowService.getActiveWorkflowInstances();

    // تجميع الإحصائيات حسب المراحل
    const statsByStage = activeInstances.reduce((acc: any, instance: any) => {
      const stage = instance.currentStage;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalActiveInstances: activeInstances.length,
        statsByStage,
        userRole,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[WORKFLOW] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الإحصائيات',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// Role-Specific Routes للمراحل المختلفة
// ==========================================

/**
 * موظف خدمة الجمهور - مراجعة الطلب
 * POST /api/workflow/public-service-review/:instanceId
 */
router.post('/public-service-review/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { documentVerification, feeCalculation, notes } = req.body;

    console.log(`[PUBLIC SERVICE] Processing review for instance ${instanceId}`);

    // تنفيذ المراجعة
    await workflowService.transitionToNextStage(
      instanceId,
      'public_service_review',
      'cashier_notification', 
      userId,
      {
        documentVerification,
        feeCalculation,
        notes,
        reviewedAt: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      message: 'تمت مراجعة الطلب وإرسال إشعار للصندوق',
      data: {
        instanceId,
        nextStage: 'cashier_notification'
      }
    });

  } catch (error) {
    console.error('[PUBLIC SERVICE] Error processing review:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مراجعة الطلب',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * موظف الصندوق - تأكيد السداد
 * POST /api/workflow/cashier-payment/:instanceId
 */
router.post('/cashier-payment/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { paymentMethod, amount, receiptNumber } = req.body;

    console.log(`[CASHIER] Processing payment for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'cashier_notification',
      'section_head_assignment',
      userId,
      {
        paymentMethod,
        amount,
        receiptNumber,
        paidAt: new Date().toISOString(),
        payment_status: 'paid'
      }
    );

    res.json({
      success: true,
      message: 'تم تأكيد السداد وإرسال الطلب لرئيس القسم',
      data: {
        instanceId,
        nextStage: 'section_head_assignment'
      }
    });

  } catch (error) {
    console.error('[CASHIER] Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة السداد',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * رئيس قسم المساحة - تكليف المساح
 * POST /api/workflow/assign-surveyor/:instanceId
 */
router.post('/assign-surveyor/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { surveyorId, notes, oldProjectionHandling } = req.body;

    console.log(`[SECTION HEAD] Assigning surveyor for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'section_head_assignment', 
      'assistant_head_scheduling',
      userId,
      {
        assigned_surveyor: surveyorId,
        surveyorId,
        notes,
        oldProjectionHandling,
        assignedAt: new Date().toISOString(),
        surveyor_assigned: true
      }
    );

    res.json({
      success: true,
      message: 'تم تكليف المساح بنجاح',
      data: {
        instanceId,
        surveyorId,
        nextStage: 'assistant_head_scheduling'
      }
    });

  } catch (error) {
    console.error('[SECTION HEAD] Error assigning surveyor:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تكليف المساح',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;