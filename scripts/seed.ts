import { storage } from '../server/storage';
import type { Role, Permission } from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Define seed data
const seedData = {
  // Core system roles
  roles: [
    {
      code: 'admin',
      nameAr: 'مدير النظام',
      nameEn: 'System Administrator',
      description: 'مدير النظام - صلاحيات كاملة لإدارة المنصة والمستخدمين',
      level: 1,
      isSystemRole: true,
      isActive: true
    },
    {
      code: 'manager',
      nameAr: 'مدير القسم',
      nameEn: 'Department Manager',
      description: 'مدير القسم - إدارة الفرق والمشاريع والموافقات',
      level: 2,
      isSystemRole: false,
      isActive: true
    },
    {
      code: 'engineer',
      nameAr: 'مهندس أول',
      nameEn: 'Senior Engineer',
      description: 'مهندس أول - مراجعة الطلبات التقنية والمسح الميداني',
      level: 3,
      isSystemRole: false,
      isActive: true
    },
    {
      code: 'supervisor',
      nameAr: 'مشرف ميداني',
      nameEn: 'Field Supervisor',
      description: 'مشرف ميداني - إشراف على أعمال المسح والتفتيش',
      level: 3,
      isSystemRole: false,
      isActive: true
    },
    {
      code: 'treasury',
      nameAr: 'موظف الخزينة',
      nameEn: 'Treasury Officer',
      description: 'موظف الخزينة - إدارة المدفوعات والرسوم المالية',
      level: 4,
      isSystemRole: false,
      isActive: true
    },
    {
      code: 'clerk',
      nameAr: 'موظف خدمات عامة',
      nameEn: 'Public Services Clerk',
      description: 'موظف خدمات عامة - استقبال ومراجعة الطلبات الأولية',
      level: 4,
      isSystemRole: false,
      isActive: true
    },
    {
      code: 'citizen',
      nameAr: 'مواطن',
      nameEn: 'Citizen User',
      description: 'مواطن - تقديم الطلبات ومتابعة الخدمات الحكومية',
      level: 5,
      isSystemRole: false,
      isActive: true
    }
  ],

  // System permissions
  permissions: [
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
      isActive: true
    }
  ],

  // Role-Permission mappings
  rolePermissions: [
    // System Administrator - full access
    ['admin', [
      'manage_users', 'assign_roles', 'view_user_activities',
      'create_application', 'review_applications', 'approve_applications', 'assign_tasks', 'update_status',
      'process_payments', 'view_financial_reports', 'manage_treasury',
      'conduct_survey', 'submit_reports', 'schedule_appointments',
      'system_config', 'database_management', 'view_logs',
      'access_all_locations'
    ]],

    // Department Manager
    ['manager', [
      'view_user_activities', 'assign_roles',
      'review_applications', 'approve_applications', 'assign_tasks', 'update_status',
      'view_financial_reports',
      'schedule_appointments',
      'view_logs',
      'access_assigned_locations'
    ]],

    // Senior Engineer
    ['engineer', [
      'create_application', 'review_applications', 'update_status',
      'conduct_survey', 'submit_reports',
      'access_assigned_locations'
    ]],

    // Field Supervisor
    ['supervisor', [
      'review_applications', 'assign_tasks', 'update_status',
      'conduct_survey', 'submit_reports', 'schedule_appointments',
      'access_assigned_locations'
    ]],

    // Treasury Officer
    ['treasury', [
      'process_payments', 'view_financial_reports', 'manage_treasury',
      'update_status',
      'access_assigned_locations'
    ]],

    // Public Services Clerk
    ['clerk', [
      'create_application', 'review_applications', 'update_status',
      'schedule_appointments',
      'access_assigned_locations'
    ]],

    // Citizen User
    ['citizen', [
      'create_application'
    ]]
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if roles already exist
    const existingRoles = await storage.getRoles();
    if (existingRoles.length > 0) {
      console.log('⚠️  Roles already exist in database. Skipping seeding to avoid duplicates.');
      console.log(`Found ${existingRoles.length} existing roles:`, existingRoles.map(r => r.code).join(', '));
      return;
    }

    console.log('📋 Seeding roles...');
    const createdRoles: Role[] = [];
    for (const roleData of seedData.roles) {
      const role = await storage.createRole(roleData);
      createdRoles.push(role);
      console.log(`✅ Created role: ${role.code} - ${role.name}`);
    }

    console.log('🔐 Seeding permissions...');
    const createdPermissions: Permission[] = [];
    for (const permissionData of seedData.permissions) {
      const permission = await storage.createPermission(permissionData);
      createdPermissions.push(permission);
      console.log(`✅ Created permission: ${permission.code} - ${permission.name}`);
    }

    console.log('🔗 Creating role-permission mappings...');
    for (const [roleCode, permissionCodes] of seedData.rolePermissions) {
      const role = createdRoles.find(r => r.code === roleCode);
      if (!role) {
        console.error(`❌ Role ${roleCode} not found`);
        continue;
      }

      for (const permissionCode of permissionCodes) {
        const permission = createdPermissions.find(p => p.code === permissionCode);
        if (!permission) {
          console.error(`❌ Permission ${permissionCode} not found`);
          continue;
        }

        try {
          await storage.assignPermissionToRole({ 
            roleId: role.id, 
            permissionId: permission.id,
            isActive: true
          });
          console.log(`🔗 Assigned ${permission.code} to ${role.code}`);
        } catch (error) {
          console.error(`❌ Failed to assign ${permission.code} to ${role.code}:`, error);
        }
      }
    }

    console.log('✨ Database seeding completed successfully!');
    console.log(`Created ${createdRoles.length} roles and ${createdPermissions.length} permissions`);
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };