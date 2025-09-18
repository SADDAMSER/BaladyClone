// Enhanced Input Validation Middleware for Yemen Construction Platform Mobile APIs
// Comprehensive data sanitization and validation to prevent injection attacks

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import validator from 'validator';

// Enhanced validation schemas for mobile API endpoints
export const mobileValidationSchemas = {
  // Authentication schemas with enhanced security
  loginSchema: z.object({
    username: z.string()
      .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
      .max(50, 'اسم المستخدم طويل جداً')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'اسم المستخدم يحتوي على أحرف غير مسموحة')
      .trim(), // Clean whitespace only
    password: z.string()
      .min(8, 'كلمة المرور قصيرة جداً')
      .max(128, 'كلمة المرور طويلة جداً'),
    deviceName: z.string()
      .min(1, 'اسم الجهاز مطلوب')
      .max(100, 'اسم الجهاز طويل جداً')
      .trim(),
    deviceModel: z.string()
      .max(100, 'موديل الجهاز طويل جداً')
      .optional()
      .transform(val => val?.trim()),
    osVersion: z.string()
      .max(50, 'إصدار النظام طويل جداً')
      .optional()
      .transform(val => val?.trim()),
    appVersion: z.string()
      .regex(/^\d+\.\d+\.\d+$/, 'إصدار التطبيق يجب أن يكون بصيغة x.y.z')
      .max(20, 'إصدار التطبيق طويل جداً')
      .trim()
  }),

  // Survey session schemas
  sessionSchema: z.object({
    applicationId: z.string()
      .uuid('معرف الطلب يجب أن يكون UUID صحيح')
      .optional(),
    startLocation: z.object({
      latitude: z.number()
        .min(-90, 'خط العرض غير صحيح')
        .max(90, 'خط العرض غير صحيح'),
      longitude: z.number()
        .min(-180, 'خط الطول غير صحيح')
        .max(180, 'خط الطول غير صحيح'),
      accuracy: z.number()
        .min(0, 'دقة الموقع يجب أن تكون أكبر من صفر')
        .max(1000, 'دقة الموقع مرتفعة جداً'),
      governorateId: z.string().uuid('معرف المحافظة يجب أن يكون UUID صحيح'),
      districtId: z.string().uuid('معرف المديرية يجب أن يكون UUID صحيح'),
      subDistrictId: z.string().uuid('معرف المديرية الفرعية يجب أن يكون UUID صحيح').optional(),
      neighborhoodId: z.string().uuid('معرف الحي يجب أن يكون UUID صحيح').optional()
    }),
    sessionType: z.enum(['field_survey', 'inspection', 'measurement'], {
      errorMap: () => ({ message: 'نوع الجلسة غير صحيح' })
    }),
    plannedDuration: z.number()
      .min(300, 'مدة الجلسة يجب أن تكون 5 دقائق على الأقل') // 5 minutes
      .max(28800, 'مدة الجلسة طويلة جداً (8 ساعات كحد أقصى)') // 8 hours
      .optional(),
    notes: z.string()
      .max(2000, 'الملاحظات طويلة جداً')
      .optional()
      .transform(val => val?.trim())
  }),

  // Attachment upload schemas
  attachmentUploadSchema: z.object({
    sessionId: z.string().uuid('معرف الجلسة يجب أن يكون UUID صحيح'),
    fileName: z.string()
      .min(1, 'اسم الملف مطلوب')
      .max(255, 'اسم الملف طويل جداً')
      .regex(/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{2,10}$/, 'اسم الملف غير صحيح')
      .refine(filename => {
        const ext = filename.toLowerCase().split('.').pop();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
        return allowedExtensions.includes(ext || '');
      }, 'نوع الملف غير مدعوم'),
    fileSize: z.number()
      .min(1, 'حجم الملف يجب أن يكون أكبر من صفر')
      .max(50 * 1024 * 1024, 'حجم الملف كبير جداً (الحد الأقصى 50MB)'), // 50MB max
    mimeType: z.string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, 'نوع الملف غير صحيح')
      .refine(mimeType => {
        const allowedTypes = [
          'image/jpeg', 'image/png', 'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        return allowedTypes.includes(mimeType);
      }, 'نوع الملف غير مدعوم'),
    attachmentType: z.enum(['survey_photo', 'document', 'measurement_data', 'sketch'], {
      errorMap: () => ({ message: 'نوع المرفق غير صحيح' })
    })
  }),

  // Sync operation schemas
  syncChangesSchema: z.object({
    lastSyncTime: z.string()
      .datetime('تاريخ آخر مزامنة غير صحيح')
      .optional(),
    entities: z.array(z.string().regex(/^[a-zA-Z_]+$/, 'اسم الكيان غير صحيح'))
      .max(20, 'عدد الكيانات كثير جداً')
      .optional(),
    limit: z.number()
      .min(1, 'الحد الأدنى للنتائج 1')
      .max(1000, 'الحد الأقصى للنتائج 1000')
      .default(100)
  }),

  // Geographic coordinate validation
  coordinateSchema: z.object({
    latitude: z.number()
      .min(-90, 'خط العرض يجب أن يكون بين -90 و 90')
      .max(90, 'خط العرض يجب أن يكون بين -90 و 90'),
    longitude: z.number()
      .min(-180, 'خط الطول يجب أن يكون بين -180 و 180')
      .max(180, 'خط الطول يجب أن يكون بين -180 و 180'),
    accuracy: z.number().min(0).max(1000).optional()
  }),

  // UUID parameter validation
  uuidParamSchema: z.object({
    id: z.string().uuid('المعرف يجب أن يكون UUID صحيح')
  }),

  sessionIdParamSchema: z.object({
    sessionId: z.string().uuid('معرف الجلسة يجب أن يكون UUID صحيح')
  }),

  attachmentIdParamSchema: z.object({
    attachmentId: z.string().uuid('معرف المرفق يجب أن يكون UUID صحيح')
  })
};

/**
 * Create validation middleware for specific schema
 */
export const createValidationMiddleware = (schema: z.ZodSchema, validationType: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get data based on validation type
      const dataToValidate = validationType === 'body' ? req.body :
                            validationType === 'query' ? req.query :
                            req.params;

      // Validate with enhanced error messages
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const validationError = fromZodError(result.error);
        
        // Safe logging without exposing sensitive data
        console.warn('[INPUT VALIDATION] Validation failed:', {
          endpoint: req.path,
          method: req.method,
          userId: (req as any).user?.id || (req as any).mobileUser?.id,
          ip: req.ip,
          errorCount: result.error.issues.length,
          fieldPaths: result.error.issues.map(issue => issue.path.join('.')),
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          success: false,
          error: 'البيانات المدخلة غير صحيحة',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          })),
          code: 'INPUT_VALIDATION_FAILED'
        });
      }

      // Replace original data with validated/cleaned data
      if (validationType === 'body') {
        req.body = result.data;
      } else if (validationType === 'query') {
        req.query = result.data as any;
      } else {
        req.params = result.data as any;
      }

      next();

    } catch (error) {
      console.error('[INPUT VALIDATION] Validation error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'خطأ في نظام التحقق من البيانات',
        code: 'VALIDATION_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Basic Security Protection Middleware (Lightweight)
 * Only blocks obvious malicious patterns - relies on ORM parameterization for SQL injection protection
 */
export const basicSecurityProtection = (req: Request, res: Response, next: NextFunction) => {
  // Only check for truly dangerous patterns that shouldn't appear in normal input
  const dangerousPatterns = [
    /\x00/g, // Null bytes
    /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Control characters (except tab, newline, carriage return)
  ];

  const checkForDangerous = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(obj));
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForDangerous(value));
    }
    return false;
  };

  // Check all input sources for dangerous characters only
  const hasDangerousContent = checkForDangerous(req.body) || 
                             checkForDangerous(req.query) || 
                             checkForDangerous(req.params);

  if (hasDangerousContent) {
    // Safe logging without exposing content
    console.warn('[SECURITY] Dangerous characters detected:', {
      endpoint: req.path,
      method: req.method,
      userId: (req as any).user?.id || (req as any).mobileUser?.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CHARACTERS_DETECTED',
        message: 'البيانات تحتوي على أحرف غير مسموحة'
      }
    });
  }

  next();
};

/**
 * Content-Type validation middleware
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.get('Content-Type');
      
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        console.warn('[INPUT VALIDATION] Invalid content type:', {
          contentType,
          allowedTypes,
          endpoint: req.path,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'نوع المحتوى غير مدعوم'
          }
        });
      }
    }
    
    next();
  };
};

// Export commonly used validation middleware
export const validateMobileLogin = createValidationMiddleware(mobileValidationSchemas.loginSchema);
export const validateSessionCreation = createValidationMiddleware(mobileValidationSchemas.sessionSchema);
export const validateAttachmentUpload = createValidationMiddleware(mobileValidationSchemas.attachmentUploadSchema);
export const validateSyncChanges = createValidationMiddleware(mobileValidationSchemas.syncChangesSchema, 'query');

// Parameter validation middleware
export const validateUUIDParam = createValidationMiddleware(mobileValidationSchemas.uuidParamSchema, 'params');
export const validateSessionIdParam = createValidationMiddleware(mobileValidationSchemas.sessionIdParamSchema, 'params');
export const validateAttachmentIdParam = createValidationMiddleware(mobileValidationSchemas.attachmentIdParamSchema, 'params');

// Content type validators
export const requireJSON = validateContentType(['application/json']);
export const requireMultipart = validateContentType(['multipart/form-data']);