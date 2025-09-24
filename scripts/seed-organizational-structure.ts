#!/usr/bin/env tsx

/**
 * 🏢 Yemen Digital Construction Platform - Organizational Structure Seeder
 * 
 * المهمة 0.5: بناء هيكل تنظيمي مصغر واقعي لقطاع المساحة
 * 
 * يقوم هذا السكريبت بإنشاء:
 * 1. التسلسل الهرمي: الديوان العام ← محافظة صنعاء ← مديرية سنحان وبني بهلول
 * 2. المناصب الإدارية الحقيقية لكل مستوى
 * 3. مستخدمين حقيقيين مع أسماء واضحة
 * 4. ربط جغرافي فعلي باستخدام UUIDs حقيقية من قاعدة البيانات
 * 
 * الهدف: إنشاء بيئة تشغيلية واقعية للاختبارات بدلاً من البيانات الوهمية
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq, and, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  departments,
  positions,
  users,
  userGeographicAssignments,
  governorates,
  districts
} from '../shared/schema';

// إعدادات الاتصال بقاعدة البيانات
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// 🌍 المعرفات الجغرافية الحقيقية من قاعدة البيانات
const GEOGRAPHIC_IDS = {
  SANAA_GOVERNORATE: '6cb4d669-b015-485c-995c-62f0b465705f', // صنعاء
  SANHAN_DISTRICT: 'a365ac78-2b0a-4347-8fa1-bfb5671500d4'    // سنحان وبني بهلول
};

// 🏢 البيانات التأسيسية للهيكل التنظيمي
interface OrganizationalUnit {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  parentId?: string;
  organizationalLevel: number;
}

interface Position {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  departmentId: string;
  level: number;
  permissions: any;
}

interface OrganizationalUser {
  id: string;
  username: string;
  password: string;
  email: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  role: string;
  departmentId: string;
  positionId: string;
  geographicScope: {
    governorateId?: string;
    districtId?: string;
    assignmentLevel: 'governorate' | 'district' | 'national';
  };
}

// 🔑 معرفات ثابتة للكيانات الرئيسية
const ENTITY_IDS = {
  // الإدارات
  DEPT_GENERAL: '10000000-0000-4000-8000-000000000001',
  DEPT_SANAA_GOV: '10000000-0000-4000-8000-000000000002', 
  DEPT_SANHAN_DIST: '10000000-0000-4000-8000-000000000003',
  
  // المناصب
  POS_SECTOR_DEPUTY: '20000000-0000-4000-8000-000000000001',
  POS_GENERAL_MANAGER: '20000000-0000-4000-8000-000000000002',
  POS_GOV_DIRECTOR: '20000000-0000-4000-8000-000000000003',
  POS_SUPERVISION_HEAD: '20000000-0000-4000-8000-000000000004',
  POS_DISTRICT_MANAGER: '20000000-0000-4000-8000-000000000005',
  POS_FIELD_SURVEYOR: '20000000-0000-4000-8000-000000000006',
  
  // المستخدمون
  USER_DEPUTY_MINISTER: '30000000-0000-4000-8000-000000000001',
  USER_GENERAL_MANAGER: '30000000-0000-4000-8000-000000000002',
  USER_GOV_DIRECTOR: '30000000-0000-4000-8000-000000000003',
  USER_SUPERVISION_HEAD: '30000000-0000-4000-8000-000000000004',
  USER_DISTRICT_MANAGER: '30000000-0000-4000-8000-000000000005',
  USER_FIELD_SURVEYOR: '30000000-0000-4000-8000-000000000006'
};

const DEPARTMENTS: OrganizationalUnit[] = [
  {
    id: ENTITY_IDS.DEPT_GENERAL,
    name: 'الديوان العام لقطاع المساحة',
    nameEn: 'General Directorate of Surveying Sector',
    description: 'الإدارة المركزية العليا لقطاع المساحة في الجمهورية اليمنية',
    organizationalLevel: 1
  },
  {
    id: ENTITY_IDS.DEPT_SANAA_GOV,
    name: 'مكتب محافظة صنعاء - قطاع المساحة',
    nameEn: 'Sanaa Governorate Office - Surveying Sector',
    description: 'الإدارة الإقليمية لخدمات المساحة في محافظة صنعاء',
    parentId: ENTITY_IDS.DEPT_GENERAL,
    organizationalLevel: 2
  },
  {
    id: ENTITY_IDS.DEPT_SANHAN_DIST,
    name: 'مكتب مديرية سنحان وبني بهلول - قطاع المساحة',
    nameEn: 'Sanhan and Bani Bahloul District Office - Surveying Sector',
    description: 'المكتب المحلي لخدمات المساحة في مديرية سنحان وبني بهلول',
    parentId: ENTITY_IDS.DEPT_SANAA_GOV,
    organizationalLevel: 3
  }
];

const POSITIONS: Position[] = [
  // مناصب الديوان العام (المستوى الوطني)
  {
    id: ENTITY_IDS.POS_SECTOR_DEPUTY,
    title: 'وكيل قطاع المساحة',
    titleEn: 'Deputy Minister of Surveying Sector',
    description: 'أعلى منصب تنفيذي في قطاع المساحة، مسؤول عن السياسات الوطنية',
    departmentId: ENTITY_IDS.DEPT_GENERAL,
    level: 1,
    permissions: {
      national_oversight: true,
      policy_making: true,
      budget_approval: true,
      strategic_planning: true
    }
  },
  {
    id: ENTITY_IDS.POS_GENERAL_MANAGER,
    title: 'المدير العام للخدمات المساحية',
    titleEn: 'General Manager of Surveying Services',
    description: 'مسؤول عن تنسيق وإشراف جميع الخدمات المساحية على المستوى الوطني',
    departmentId: ENTITY_IDS.DEPT_GENERAL,
    level: 2,
    permissions: {
      service_coordination: true,
      technical_oversight: true,
      quality_assurance: true
    }
  },

  // مناصب مكتب المحافظة
  {
    id: ENTITY_IDS.POS_GOV_DIRECTOR,
    title: 'مدير مكتب محافظة صنعاء',
    titleEn: 'Sanaa Governorate Office Director',
    description: 'مسؤول عن إدارة جميع خدمات المساحة في محافظة صنعاء',
    departmentId: ENTITY_IDS.DEPT_SANAA_GOV,
    level: 3,
    permissions: {
      governorate_management: true,
      resource_allocation: true,
      performance_monitoring: true
    }
  },
  {
    id: ENTITY_IDS.POS_SUPERVISION_HEAD,
    title: 'رئيس قسم الإشراف الفني',
    titleEn: 'Head of Technical Supervision Department',
    description: 'مسؤول عن الإشراف الفني على العمليات المساحية في المحافظة',
    departmentId: ENTITY_IDS.DEPT_SANAA_GOV,
    level: 4,
    permissions: {
      technical_supervision: true,
      quality_control: true,
      staff_training: true
    }
  },

  // مناصب مكتب المديرية
  {
    id: ENTITY_IDS.POS_DISTRICT_MANAGER,
    title: 'مدير مكتب مديرية سنحان وبني بهلول',
    titleEn: 'Sanhan and Bani Bahloul District Office Manager',
    description: 'مسؤول عن الخدمات المساحية المحلية في المديرية',
    departmentId: ENTITY_IDS.DEPT_SANHAN_DIST,
    level: 5,
    permissions: {
      local_service_delivery: true,
      citizen_relations: true,
      field_coordination: true
    }
  },
  {
    id: ENTITY_IDS.POS_FIELD_SURVEYOR,
    title: 'مساح ميداني',
    titleEn: 'Field Surveyor',
    description: 'مختص بتنفيذ عمليات المسح الميداني وجمع البيانات الجغرافية',
    departmentId: ENTITY_IDS.DEPT_SANHAN_DIST,
    level: 6,
    permissions: {
      field_surveying: true,
      data_collection: true,
      report_generation: true
    }
  }
];

const USERS: OrganizationalUser[] = [
  // مستخدمو الديوان العام
  {
    id: ENTITY_IDS.USER_DEPUTY_MINISTER,
    username: 'ahmed_alkhatib',
    password: 'SecurePass123!',
    email: 'ahmed.alkhatib@yemen.gov.ye',
    fullName: 'أحمد محمد الخطيب',
    nationalId: '01-01-01-0001',
    phoneNumber: '+967-1-500001',
    role: 'admin',
    departmentId: ENTITY_IDS.DEPT_GENERAL,
    positionId: ENTITY_IDS.POS_SECTOR_DEPUTY,
    geographicScope: {
      assignmentLevel: 'national' // صلاحية على المستوى الوطني
    }
  },
  {
    id: ENTITY_IDS.USER_GENERAL_MANAGER,
    username: 'fatima_saleh',
    password: 'SecurePass123!',
    email: 'fatima.saleh@yemen.gov.ye',
    fullName: 'فاطمة أحمد صالح',
    nationalId: '01-01-01-0002',
    phoneNumber: '+967-1-500002',
    role: 'manager',
    departmentId: ENTITY_IDS.DEPT_GENERAL,
    positionId: ENTITY_IDS.POS_GENERAL_MANAGER,
    geographicScope: {
      assignmentLevel: 'national'
    }
  },

  // مستخدمو مكتب المحافظة
  {
    id: ENTITY_IDS.USER_GOV_DIRECTOR,
    username: 'omar_alhadhrami',
    password: 'SecurePass123!',
    email: 'omar.alhadhrami@sanaa.gov.ye',
    fullName: 'عمر علي الحضرمي',
    nationalId: '23-01-01-0001',
    phoneNumber: '+967-1-600001',
    role: 'manager',
    departmentId: ENTITY_IDS.DEPT_SANAA_GOV,
    positionId: ENTITY_IDS.POS_GOV_DIRECTOR,
    geographicScope: {
      governorateId: GEOGRAPHIC_IDS.SANAA_GOVERNORATE,
      assignmentLevel: 'governorate'
    }
  },
  {
    id: ENTITY_IDS.USER_SUPERVISION_HEAD,
    username: 'layla_mohammed',
    password: 'SecurePass123!',
    email: 'layla.mohammed@sanaa.gov.ye',
    fullName: 'ليلى محمد الشامي',
    nationalId: '23-01-01-0002',
    phoneNumber: '+967-1-600002',
    role: 'manager',
    departmentId: ENTITY_IDS.DEPT_SANAA_GOV,
    positionId: ENTITY_IDS.POS_SUPERVISION_HEAD,
    geographicScope: {
      governorateId: GEOGRAPHIC_IDS.SANAA_GOVERNORATE,
      assignmentLevel: 'governorate'
    }
  },

  // مستخدمو مكتب المديرية
  {
    id: ENTITY_IDS.USER_DISTRICT_MANAGER,
    username: 'khalid_alsanani',
    password: 'SecurePass123!',
    email: 'khalid.alsanani@sanhan.gov.ye',
    fullName: 'خالد أحمد الصنعاني',
    nationalId: '23-05-01-0001',
    phoneNumber: '+967-1-700001',
    role: 'manager',
    departmentId: ENTITY_IDS.DEPT_SANHAN_DIST,
    positionId: ENTITY_IDS.POS_DISTRICT_MANAGER,
    geographicScope: {
      governorateId: GEOGRAPHIC_IDS.SANAA_GOVERNORATE,
      districtId: GEOGRAPHIC_IDS.SANHAN_DISTRICT,
      assignmentLevel: 'district'
    }
  },
  {
    id: ENTITY_IDS.USER_FIELD_SURVEYOR,
    username: 'youssef_almadhaji',
    password: 'SecurePass123!',
    email: 'youssef.almadhaji@sanhan.gov.ye',
    fullName: 'يوسف علي المذاجي',
    nationalId: '23-05-01-0002',
    phoneNumber: '+967-1-700002',
    role: 'employee',
    departmentId: ENTITY_IDS.DEPT_SANHAN_DIST,
    positionId: ENTITY_IDS.POS_FIELD_SURVEYOR,
    geographicScope: {
      governorateId: GEOGRAPHIC_IDS.SANAA_GOVERNORATE,
      districtId: GEOGRAPHIC_IDS.SANHAN_DISTRICT,
      assignmentLevel: 'district'
    }
  }
];

/**
 * 🏗️ تحقق من صحة البيانات الجغرافية
 */
async function validateGeographicData(): Promise<boolean> {
  console.log('🌍 التحقق من صحة البيانات الجغرافية...');
  
  try {
    // التحقق من وجود محافظة صنعاء
    const sanaaGov = await db.select()
      .from(governorates)
      .where(eq(governorates.id, GEOGRAPHIC_IDS.SANAA_GOVERNORATE));
    
    if (sanaaGov.length === 0) {
      console.error('❌ لم يتم العثور على محافظة صنعاء في قاعدة البيانات');
      return false;
    }

    // التحقق من وجود مديرية سنحان
    const sanhanDistrict = await db.select()
      .from(districts)
      .where(eq(districts.id, GEOGRAPHIC_IDS.SANHAN_DISTRICT));
    
    if (sanhanDistrict.length === 0) {
      console.error('❌ لم يتم العثور على مديرية سنحان وبني بهلول في قاعدة البيانات');
      return false;
    }

    console.log(`✅ تم التحقق من البيانات الجغرافية:`);
    console.log(`   📍 محافظة صنعاء: ${sanaaGov[0].nameAr} (${GEOGRAPHIC_IDS.SANAA_GOVERNORATE})`);
    console.log(`   📍 مديرية سنحان: ${sanhanDistrict[0].nameAr} (${GEOGRAPHIC_IDS.SANHAN_DISTRICT})`);
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في التحقق من البيانات الجغرافية:', error);
    return false;
  }
}

/**
 * 🏢 إنشاء الهيكل التنظيمي (الإدارات)
 */
async function seedDepartments(): Promise<void> {
  console.log('🏢 إنشاء الهيكل التنظيمي...');

  for (const dept of DEPARTMENTS) {
    try {
      // التحقق من عدم وجود الإدارة
      const existing = await db.select()
        .from(departments)
        .where(eq(departments.id, dept.id));

      if (existing.length > 0) {
        console.log(`ℹ️  الإدارة موجودة مسبقاً: ${dept.name}`);
        continue;
      }

      // إنشاء الإدارة الجديدة
      const parentDepartmentId = dept.parentId || null;
      
      await db.insert(departments).values({
        id: dept.id,
        name: dept.name,
        nameEn: dept.nameEn,
        description: dept.description,
        parentDepartmentId,
        organizationalLevel: dept.organizationalLevel,
        isActive: true,
        createdAt: new Date()
      });

      console.log(`✅ تم إنشاء: ${dept.name} (المستوى: ${dept.organizationalLevel})`);
    } catch (error) {
      console.error(`❌ فشل إنشاء الإدارة ${dept.name}:`, error);
      throw error;
    }
  }
}

/**
 * 💼 إنشاء المناصب الإدارية
 */
async function seedPositions(): Promise<void> {
  console.log('💼 إنشاء المناصب الإدارية...');

  for (const position of POSITIONS) {
    try {
      // التحقق من عدم وجود المنصب
      const existing = await db.select()
        .from(positions)
        .where(eq(positions.id, position.id));

      if (existing.length > 0) {
        console.log(`ℹ️  المنصب موجود مسبقاً: ${position.title}`);
        continue;
      }

      await db.insert(positions).values({
        id: position.id,
        title: position.title,
        titleEn: position.titleEn,
        description: position.description,
        departmentId: position.departmentId,
        level: position.level,
        permissions: position.permissions,
        isActive: true,
        createdAt: new Date()
      });

      console.log(`✅ تم إنشاء منصب: ${position.title} (المستوى: ${position.level})`);
    } catch (error) {
      console.error(`❌ فشل إنشاء المنصب ${position.title}:`, error);
      throw error;
    }
  }
}

/**
 * 👥 إنشاء المستخدمين الحقيقيين
 */
async function seedUsers(): Promise<void> {
  console.log('👥 إنشاء المستخدمين الحقيقيين...');

  for (const user of USERS) {
    try {
      // التحقق من عدم وجود المستخدم
      const existing = await db.select()
        .from(users)
        .where(eq(users.id, user.id));

      if (existing.length > 0) {
        console.log(`ℹ️  المستخدم موجود مسبقاً: ${user.fullName} (${user.username})`);
        continue;
      }

      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await db.insert(users).values({
        id: user.id,
        username: user.username,
        password: hashedPassword,
        email: user.email,
        fullName: user.fullName,
        nationalId: user.nationalId,
        phoneNumber: user.phoneNumber,
        role: user.role as any,
        departmentId: user.departmentId,
        positionId: user.positionId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✅ تم إنشاء المستخدم: ${user.fullName} (${user.username}) - ${user.role}`);
    } catch (error) {
      console.error(`❌ فشل إنشاء المستخدم ${user.fullName}:`, error);
      throw error;
    }
  }
}

/**
 * 🌍 إنشاء التكليفات الجغرافية
 */
async function seedGeographicAssignments(): Promise<void> {
  console.log('🌍 إنشاء التكليفات الجغرافية...');

  for (const user of USERS) {
    try {
      const { geographicScope } = user;
      
      // تخطي المستخدمين ذوي الصلاحية الوطنية
      if (geographicScope.assignmentLevel === 'national') {
        console.log(`ℹ️  ${user.fullName}: صلاحية وطنية - لا تحتاج تكليف جغرافي محدد`);
        continue;
      }

      // التحقق من عدم وجود تكليف سابق
      const existingAssignment = await db.select()
        .from(userGeographicAssignments)
        .where(and(
          eq(userGeographicAssignments.userId, user.id),
          eq(userGeographicAssignments.isActive, true)
        ));

      if (existingAssignment.length > 0) {
        console.log(`ℹ️  التكليف الجغرافي موجود مسبقاً للمستخدم: ${user.fullName}`);
        continue;
      }

      // إنشاء التكليف الجغرافي
      const assignmentData = {
        userId: user.id,
        governorateId: geographicScope.governorateId || null,
        districtId: geographicScope.districtId || null,
        subDistrictId: null,
        neighborhoodId: null,
        assignmentLevel: geographicScope.assignmentLevel,
        assignmentType: 'permanent' as const,
        canRead: true,
        canWrite: true,
        canApprove: user.role === 'manager' || user.role === 'admin',
        isActive: true,
        startDate: new Date(),
        createdAt: new Date()
      };

      await db.insert(userGeographicAssignments).values(assignmentData);

      const scopeDesc = geographicScope.assignmentLevel === 'governorate' 
        ? 'محافظة صنعاء'
        : 'مديرية سنحان وبني بهلول';
        
      console.log(`✅ تم إنشاء تكليف جغرافي: ${user.fullName} ← ${scopeDesc}`);
    } catch (error) {
      console.error(`❌ فشل إنشاء التكليف الجغرافي للمستخدم ${user.fullName}:`, error);
      throw error;
    }
  }
}

/**
 * 📊 عرض ملخص البيانات المُنشأة
 */
async function displaySummary(): Promise<void> {
  console.log('\n📊 ملخص الهيكل التنظيمي المُنشأ:');
  console.log('=' .repeat(60));

  // إحصائيات الإدارات
  const deptCount = await db.select({ count: sql`count(*)` }).from(departments);
  console.log(`🏢 الإدارات: ${deptCount[0].count}`);

  // إحصائيات المناصب
  const posCount = await db.select({ count: sql`count(*)` }).from(positions);
  console.log(`💼 المناصب: ${posCount[0].count}`);

  // إحصائيات المستخدمين
  const userCount = await db.select({ count: sql`count(*)` }).from(users);
  console.log(`👥 المستخدمين: ${userCount[0].count}`);

  // إحصائيات التكليفات الجغرافية
  const assignmentCount = await db.select({ count: sql`count(*)` })
    .from(userGeographicAssignments)
    .where(eq(userGeographicAssignments.isActive, true));
  console.log(`🌍 التكليفات الجغرافية النشطة: ${assignmentCount[0].count}`);

  console.log('\n✅ تم إنشاء الهيكل التنظيمي المصغر بنجاح!');
  console.log('🎯 النظام جاهز الآن للاختبارات الواقعية باستخدام بيانات حقيقية');
}

/**
 * 🚀 تنفيذ السكريبت الرئيسي
 */
async function main(): Promise<void> {
  try {
    console.log('🏗️  بدء إنشاء الهيكل التنظيمي المصغر لقطاع المساحة');
    console.log('📅 التاريخ:', new Date().toLocaleString('ar-YE'));
    console.log('=' .repeat(60));

    // 1. التحقق من صحة البيانات الجغرافية
    const isGeographicDataValid = await validateGeographicData();
    if (!isGeographicDataValid) {
      throw new Error('فشل في التحقق من البيانات الجغرافية');
    }

    // 2. إنشاء الإدارات
    await seedDepartments();

    // 3. إنشاء المناصب
    await seedPositions();

    // 4. إنشاء المستخدمين
    await seedUsers();

    // 5. إنشاء التكليفات الجغرافية
    await seedGeographicAssignments();

    // 6. عرض الملخص
    await displaySummary();

  } catch (error) {
    console.error('💥 فشل في إنشاء الهيكل التنظيمي:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل السكريبت
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, USERS, DEPARTMENTS, POSITIONS, GEOGRAPHIC_IDS };