// Default system permissions - extracted from scripts/seed.ts
// هذا الملف يحتوي على الصلاحيات الافتراضية للنظام

export const DEFAULT_PERMISSIONS = [
  // User management
  {
    code: 'manage_users',
    nameAr: 'إدارة المستخدمين',
    nameEn: 'Manage Users',
    description: 'إدارة المستخدمين - إنشاء وتعديل وحذف حسابات المستخدمين',
    category: 'user_management',
    resource: 'users',
    action: 'manage',
    scope: 'all',
    isSystemPermission: true,
    isActive: true
  },
  {
    code: 'assign_roles',
    nameAr: 'تعيين الأدوار',
    nameEn: 'Assign User Roles',
    description: 'تعيين الأدوار - ربط المستخدمين بالأدوار والصلاحيات',
    category: 'user_management',
    resource: 'users',
    action: 'assign_roles',
    scope: 'department',
    isSystemPermission: true,
    isActive: true
  },
  {
    code: 'view_user_activities',
    nameAr: 'عرض أنشطة المستخدمين',
    nameEn: 'View User Activities',
    description: 'عرض أنشطة المستخدمين - مراقبة سجل العمليات',
    category: 'user_management',
    resource: 'users',
    action: 'read_activities',
    scope: 'department',
    isSystemPermission: false,
    isActive: true
  },
  
  // Application management
  {
    code: 'create_application',
    nameAr: 'إنشاء طلب',
    nameEn: 'Create Application',
    description: 'إنشاء طلب - تقديم طلبات خدمات جديدة',
    category: 'application_management',
    resource: 'applications',
    action: 'create',
    scope: 'own',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'review_applications',
    nameAr: 'مراجعة الطلبات',
    nameEn: 'Review Applications',
    description: 'مراجعة الطلبات - فحص وتقييم الطلبات المقدمة',
    category: 'application_management',
    resource: 'applications',
    action: 'review',
    scope: 'department',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'approve_applications',
    nameAr: 'الموافقة على الطلبات',
    nameEn: 'Approve Applications',
    description: 'الموافقة على الطلبات - اعتماد أو رفض الطلبات',
    category: 'application_management',
    resource: 'applications',
    action: 'approve',
    scope: 'department',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'assign_tasks',
    nameAr: 'تكليف المهام',
    nameEn: 'Assign Tasks',
    description: 'تكليف المهام - تعيين المهندسين والمساحين للمهام',
    category: 'application_management',
    resource: 'tasks',
    action: 'assign',
    scope: 'department',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'update_status',
    nameAr: 'تحديث حالة الطلب',
    nameEn: 'Update Application Status',
    description: 'تحديث حالة الطلب - تغيير مراحل معالجة الطلبات',
    category: 'application_management',
    resource: 'applications',
    action: 'update_status',
    scope: 'own',
    isSystemPermission: false,
    isActive: true
  },
  
  // Financial operations
  {
    code: 'process_payments',
    nameAr: 'معالجة المدفوعات',
    nameEn: 'Process Payments',
    description: 'معالجة المدفوعات - تأكيد وإدارة الرسوم المالية',
    category: 'financial',
    resource: 'payments',
    action: 'process',
    scope: 'all',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'view_financial_reports',
    nameAr: 'عرض التقارير المالية',
    nameEn: 'View Financial Reports',
    description: 'عرض التقارير المالية - الاطلاع على الإحصائيات المالية',
    category: 'financial',
    resource: 'reports',
    action: 'read',
    scope: 'department',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'manage_treasury',
    nameAr: 'إدارة الخزينة',
    nameEn: 'Manage Treasury',
    description: 'إدارة الخزينة - التحكم في العمليات المالية والرسوم',
    category: 'financial',
    resource: 'treasury',
    action: 'manage',
    scope: 'all',
    isSystemPermission: false,
    isActive: true
  },
  
  // Field operations
  {
    code: 'conduct_survey',
    nameAr: 'إجراء المسح الميداني',
    nameEn: 'Conduct Field Survey',
    description: 'إجراء المسح الميداني - تنفيذ عمليات المسح والقياس',
    category: 'field_operations',
    resource: 'surveys',
    action: 'conduct',
    scope: 'own',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'submit_reports',
    nameAr: 'تقديم تقارير المسح',
    nameEn: 'Submit Survey Reports',
    description: 'تقديم تقارير المسح - رفع نتائج المسح الميداني',
    category: 'field_operations',
    resource: 'reports',
    action: 'submit',
    scope: 'own',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'schedule_appointments',
    nameAr: 'جدولة المواعيد',
    nameEn: 'Schedule Appointments',
    description: 'جدولة المواعيد - تنسيق مواعيد المسح والمقابلات',
    category: 'field_operations',
    resource: 'appointments',
    action: 'schedule',
    scope: 'own',
    isSystemPermission: false,
    isActive: true
  },
  
  // System administration
  {
    code: 'system_config',
    nameAr: 'إعداد النظام',
    nameEn: 'System Configuration',
    description: 'إعداد النظام - تكوين إعدادات المنصة العامة',
    category: 'system',
    resource: 'system',
    action: 'configure',
    scope: 'all',
    isSystemPermission: true,
    isActive: true
  },
  {
    code: 'database_management',
    nameAr: 'إدارة قاعدة البيانات',
    nameEn: 'Database Management',
    description: 'إدارة قاعدة البيانات - صيانة وإدارة البيانات',
    category: 'system',
    resource: 'database',
    action: 'manage',
    scope: 'all',
    isSystemPermission: true,
    isActive: true
  },
  {
    code: 'view_logs',
    nameAr: 'عرض سجلات النظام',
    nameEn: 'View System Logs',
    description: 'عرض سجلات النظام - مراقبة أداء وأمان المنصة',
    category: 'system',
    resource: 'logs',
    action: 'read',
    scope: 'all',
    isSystemPermission: false,
    isActive: true
  },
  
  // Geographic access
  {
    code: 'access_all_locations',
    nameAr: 'الوصول لجميع المواقع',
    nameEn: 'Access All Locations',
    description: 'الوصول لجميع المواقع - صلاحية جغرافية شاملة',
    category: 'geographic',
    resource: 'locations',
    action: 'access',
    scope: 'all',
    isSystemPermission: false,
    isActive: true
  },
  {
    code: 'access_assigned_locations',
    nameAr: 'الوصول للمواقع المكلف بها',
    nameEn: 'Access Assigned Locations',
    description: 'الوصول للمواقع المكلف بها - صلاحية جغرافية محدودة',
    category: 'geographic',
    resource: 'locations',
    action: 'access',
    scope: 'region',
    isSystemPermission: false,
    isActive: true
  }
];

// Permission categories for organization
export const PERMISSION_CATEGORIES = [
  {
    key: 'user_management',
    nameAr: 'إدارة المستخدمين',
    nameEn: 'User Management',
    color: '#3b82f6'
  },
  {
    key: 'application_management', 
    nameAr: 'إدارة الطلبات',
    nameEn: 'Application Management',
    color: '#10b981'
  },
  {
    key: 'financial',
    nameAr: 'العمليات المالية',
    nameEn: 'Financial Operations',
    color: '#f59e0b'
  },
  {
    key: 'field_operations',
    nameAr: 'العمليات الميدانية',
    nameEn: 'Field Operations',
    color: '#8b5cf6'
  },
  {
    key: 'system',
    nameAr: 'إدارة النظام',
    nameEn: 'System Administration',
    color: '#ef4444'
  },
  {
    key: 'geographic',
    nameAr: 'الوصول الجغرافي',
    nameEn: 'Geographic Access',
    color: '#06b6d4'
  }
];