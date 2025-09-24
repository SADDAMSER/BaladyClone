import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { workflowService } from '../services/workflowService';

// Use same JWT secret as main routes
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

// Copy of main authenticateToken middleware to avoid circular dependency
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log(`[🔍 WORKFLOW AUTH DEBUG] ${req.method} ${req.path} - Token verification start`, {
    hasAuthHeader: !!authHeader,
    tokenLength: token ? token.length : 0,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  if (!token) {
    console.error(`[❌ WORKFLOW AUTH] Missing token for ${req.method} ${req.path}`);
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      console.error(`[❌ WORKFLOW AUTH] JWT verification failed for ${req.method} ${req.path}:`, {
        errorName: err.name,
        errorMessage: err.message,
        tokenSample: token.substring(0, 50) + '...',
        jwtSecretPresent: !!jwtSecret
      });
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Support both userId (test format) and id fields for compatibility
    const userId = user.userId || user.id;
    
    // Log only essential audit information
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ WORKFLOW AUTH SUCCESS] JWT verified for ${req.method} ${req.path}:`, {
        userId: userId ? userId.substring(0, 8) + '...' : 'undefined',
        username: user.username,
        role: user.role
      });
    }
    req.user = {
      ...user,
      id: userId, // Normalize to id field
      roleCodes: [user.role?.toUpperCase()] // Convert role to array of uppercase codes
    };
    next();
  });
};

// Role-based access control middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
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
 * مراجعة موظف خدمة الجمهور - المرحلة الأولى من سير العمل
 * POST /api/workflow/public-service-review/:instanceId
 */
router.post('/public-service-review/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { documentVerification, feeCalculation, notes } = req.body;
    const userId = (req as any).user.id;

    console.log(`[WORKFLOW] Public service review for instance ${instanceId}`);

    // تحديث workflow instance إلى المرحلة التالية
    const updatedInstance = await workflowService.transitionToNextStage(
      instanceId,
      'path_determination',
      'public_service_review',
      userId,
      {
        documentVerification,
        feeCalculation,
        reviewerNotes: notes,
        reviewedAt: new Date().toISOString(),
        reviewedBy: userId
      }
    );

    res.json({
      success: true,
      message: 'تم إكمال مراجعة موظف خدمة الجمهور',
      data: {
        instanceId: updatedInstance.id,
        currentStage: updatedInstance.currentStage,
        nextStage: 'cashier_payment',
        status: updatedInstance.status
      }
    });

  } catch (error) {
    console.error('[WORKFLOW] Error in public service review:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة مراجعة موظف خدمة الجمهور',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
router.post('/public-service-review/:instanceId', authenticateToken, requireRole(['public_service_employee']), async (req, res) => {
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
router.post('/cashier-payment/:instanceId', authenticateToken, requireRole(['cashier']), async (req, res) => {
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
router.post('/assign-surveyor/:instanceId', authenticateToken, requireRole(['section_head']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { surveyorId, notes, oldProjectionHandling, projectionNotes, priority, estimatedCompletionDays } = req.body;

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
        projectionNotes,
        priority,
        estimatedCompletionDays,
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

/**
 * مساعد رئيس القسم - جدولة الموعد
 * POST /api/workflow/assistant-scheduling/:instanceId
 */
router.post('/assistant-scheduling/:instanceId', authenticateToken, requireRole(['assistant_head']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { citizenNotification, appointmentScheduling, contactDetails } = req.body;

    console.log(`[ASSISTANT HEAD] Scheduling appointment for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'assistant_head_scheduling',
      'field_survey',
      userId,
      {
        citizenNotification,
        appointmentScheduling,
        contactDetails,
        scheduledAt: new Date().toISOString(),
        appointment_scheduled: true
      }
    );

    res.json({
      success: true,
      message: 'تم جدولة الموعد وإرسال إشعار للمواطن',
      data: {
        instanceId,
        nextStage: 'field_survey'
      }
    });

  } catch (error) {
    console.error('[ASSISTANT HEAD] Error scheduling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جدولة الموعد',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * المساح - تسليم بيانات الرفع المساحي
 * POST /api/workflow/surveyor-submit/:instanceId
 */
router.post('/surveyor-submit/:instanceId', authenticateToken, requireRole(['surveyor']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { fieldWork, coordinates, measurements, notes, photos, equipment } = req.body;

    console.log(`[SURVEYOR] Submitting survey data for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'field_survey',
      'technical_review',
      userId,
      {
        fieldWork,
        coordinates,
        measurements,
        notes,
        photos,
        equipment,
        submittedAt: new Date().toISOString(),
        survey_completed: true
      }
    );

    res.json({
      success: true,
      message: 'تم تسليم بيانات الرفع المساحي للمراجعة الفنية',
      data: {
        instanceId,
        nextStage: 'technical_review'
      }
    });

  } catch (error) {
    console.error('[SURVEYOR] Error submitting survey data:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسليم بيانات الرفع المساحي',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * المراجع الفني - مراجعة تقنية
 * POST /api/workflow/technical-review/:instanceId
 */
router.post('/technical-review/:instanceId', authenticateToken, requireRole(['technical_reviewer']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { technicalValidation, accuracyCheck, complianceVerification, mapGeneration, notes, recommendations } = req.body;

    console.log(`[TECHNICAL REVIEWER] Processing technical review for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'technical_review',
      'final_approval',
      userId,
      {
        technicalValidation,
        accuracyCheck,
        complianceVerification,
        mapGeneration,
        notes,
        recommendations,
        reviewedAt: new Date().toISOString(),
        technical_approved: true
      }
    );

    res.json({
      success: true,
      message: 'تمت المراجعة الفنية بنجاح',
      data: {
        instanceId,
        nextStage: 'final_approval'
      }
    });

  } catch (error) {
    console.error('[TECHNICAL REVIEWER] Error in technical review:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في المراجعة الفنية',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * الاعتماد النهائي
 * POST /api/workflow/final-approval/:instanceId
 */
router.post('/final-approval/:instanceId', authenticateToken, requireRole(['department_manager', 'branch_manager']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = (req as any).user.id;
    const { finalDecision, approvedBy, notes, validityPeriod, restrictions } = req.body;

    console.log(`[FINAL APPROVAL] Processing final approval for instance ${instanceId}`);

    await workflowService.transitionToNextStage(
      instanceId,
      'final_approval',
      'completed',
      userId,
      {
        finalDecision,
        approvedBy,
        notes,
        validityPeriod,
        restrictions,
        approvedAt: new Date().toISOString(),
        final_approved: true
      }
    );

    res.json({
      success: true,
      message: 'تم الاعتماد النهائي للقرار المساحي',
      data: {
        instanceId,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('[FINAL APPROVAL] Error in final approval:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الاعتماد النهائي',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// Data Access Endpoints
// ==========================================

/**
 * إيصال السداد
 * GET /api/workflow/instances/:instanceId/receipt
 */
router.get('/instances/:instanceId/receipt', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting receipt for instance ${instanceId}`);
    
    // Mock receipt data - would be replaced with real workflow data
    res.json({
      receiptNumber: `REC-${instanceId}-${new Date().getFullYear()}`,
      amount: 75000,
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString(),
      applicationId: instanceId
    });

  } catch (error) {
    console.error('[DATA ACCESS] Receipt fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

/**
 * بيانات الرفع المساحي
 * GET /api/workflow/instances/:instanceId/survey-data
 */
router.get('/instances/:instanceId/survey-data', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting survey data for instance ${instanceId}`);
    
    // Mock survey data
    res.json({
      coordinates: [
        { x: 587234.123, y: 1678901.456, z: 2134.789 },
        { x: 587245.678, y: 1678912.345, z: 2135.123 },
        { x: 587256.234, y: 1678923.678, z: 2134.567 }
      ],
      measurements: {
        totalArea: 498.5,
        perimeter: 92.3,
        frontage: 20.5
      }
    });

  } catch (error) {
    console.error('[DATA ACCESS] Survey data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch survey data' });
  }
});

/**
 * الخريطة المولدة
 * GET /api/workflow/instances/:instanceId/map
 */
router.get('/instances/:instanceId/map', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting map for instance ${instanceId}`);
    
    res.json({
      mapUrl: `/api/maps/generated/${instanceId}.png`,
      mapType: 'surveying_decision',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DATA ACCESS] Map fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch map' });
  }
});

/**
 * وثيقة القرار النهائي
 * GET /api/workflow/instances/:instanceId/decision-document
 */
router.get('/instances/:instanceId/decision-document', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting decision document for instance ${instanceId}`);
    
    res.json({
      documentUrl: `/api/documents/decisions/${instanceId}.pdf`,
      decisionNumber: `DEC-${instanceId}-${new Date().getFullYear()}`,
      issuedDate: new Date().toISOString(),
      validityPeriod: '2 years'
    });

  } catch (error) {
    console.error('[DATA ACCESS] Decision document fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch decision document' });
  }
});

/**
 * سجل الإشعارات
 * GET /api/workflow/instances/:instanceId/notifications
 */
router.get('/instances/:instanceId/notifications', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting notifications for instance ${instanceId}`);
    
    // Mock notifications data
    res.json([
      {
        id: '1',
        type: 'appointment_scheduled',
        message: 'تم تحديد موعد الرفع المساحي',
        sentAt: new Date().toISOString(),
        method: 'phone'
      }
    ]);

  } catch (error) {
    console.error('[DATA ACCESS] Notifications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * تفاصيل workflow instance
 * GET /api/workflow/instances/:instanceId
 */
router.get('/instances/:instanceId', authenticateToken, async (req, res) => {
  try {
    const { instanceId } = req.params;
    console.log(`[DATA ACCESS] Getting instance details for ${instanceId}`);
    
    // Mock workflow instance data
    res.json({
      id: instanceId,
      status: 'in_progress',
      currentStage: 'technical_review',
      transitions: [
        {
          id: '1',
          stageId: 'document_review',
          createdAt: new Date().toISOString(),
          data: { documentVerification: 'approved', feeCalculation: 75000 }
        },
        {
          id: '2', 
          stageId: 'payment_processing',
          createdAt: new Date().toISOString(),
          data: { receiptNumber: `REC-${instanceId}`, amount: 75000 }
        }
      ]
    });

  } catch (error) {
    console.error('[DATA ACCESS] Instance details fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch instance details' });
  }
});

export { requireRole };
export default router;