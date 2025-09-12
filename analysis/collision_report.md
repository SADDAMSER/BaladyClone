# تقرير نقاط التصادم المتوقعة (Collision Report)
**Yemen Platform Schema Analysis - December 2024**

---

## 📊 ملخص التحليل

تم فحص وتحليل مخططين لقاعدة البيانات:
- **shared/schema.ts** - المخطط الحالي في التطبيق (Drizzle ORM)
- **database/schema/yemen_platform_enhanced.sql** - المخطط الجغرافي المحسن (PostGIS)

### النتائج الرئيسية:
✅ **3 من 11** جدول جغرافي موجود (governorates, districts, neighborhoods)  
❌ **8 جداول جغرافية** مفقودة (التفصيل أدناه)  
❌ **3 جداول طبقة ربط LBAC** مفقودة (منفصلة عن الجغرافية)  
⚠️ **5 نقاط تصادم** رئيسية محددة  
🚨 **مشكلة أمنية خطيرة**: كلمات المرور غير مشفرة  

---

## 🚨 نقاط التصادم المتوقعة (Critical Collisions)

### 1. تصادم جدول المستخدمين (users)
**المشكلة:** جدولين مختلفين بنفس الاسم

| المجال | shared/schema.ts | yemen_platform_enhanced.sql |
|---------|------------------|------------------------------|
| **الاسم الكامل** | `fullName: text("full_name")` | `first_name, father_name, grandfather_name, last_name` |
| **الهوية الوطنية** | `nationalId: text("national_id")` | `national_id VARCHAR(50)` |
| **الهاتف** | `phoneNumber: text("phone_number")` | `phone VARCHAR(20)` |
| **الدور** | `role: text("role")` - enum نصي | جدول منفصل `user_roles` + `roles` |
| **الحالة** | `isActive: boolean("is_active")` | `status user_status_enum` |

**الحل المطلوب:**
```typescript
// دمج التراكيب مع اعتماد الأسماء العربية التفصيلية
users: {
  // تفصيل الاسم العربي
  firstName: text("first_name").notNull(),
  fatherName: text("father_name"),
  grandfatherName: text("grandfather_name"), 
  lastName: text("last_name").notNull(),
  // نظام أدوار متقدم
  userRoles: many(userRoles), // علاقة مع جدول الأدوار
}
```

### 2. تصادم جدول الإدارات (departments)
**المشكلة:** تراكيب متشابهة لكن أعمدة مختلفة

| المجال | shared/schema.ts | yemen_platform_enhanced.sql |
|---------|------------------|------------------------------|
| **الوزارة** | ❌ غير موجود | `ministry_id UUID NOT NULL` |
| **كود الإدارة** | ❌ غير موجود | `department_code VARCHAR(20)` |
| **المدير** | `headOfDepartmentId` | `manager_id UUID` |
| **المستوى** | `organizationalLevel: integer` | ❌ غير موجود |

**الحل المطلوب:**
```typescript
departments: {
  ministryId: uuid("ministry_id").notNull(), // إضافة مطلوبة
  departmentCode: text("department_code").notNull(), // إضافة مطلوبة
  managerId: uuid("manager_id"), // توحيد التسمية
  organizationalLevel: integer("organizational_level"), // الاحتفاظ
}
```

### 3. تصادم جدول الخدمات (services vs government_services)
**المشكلة:** جدولين لنفس الغرض بتراكيب مختلفة

| المجال | shared/schema.ts (services) | yemen_platform_enhanced.sql (government_services) |
|---------|----------------------------|---------------------------------------------------|
| **الرمز** | ❌ غير موجود | `service_code VARCHAR(50) UNIQUE` |
| **الوزارة** | ❌ غير موجود | `ministry_id UUID NOT NULL` |
| **الإدارة** | ✅ `category: text("category")` | `department_id UUID` |
| **المدة المتوقعة** | `processingTimeEstimate: integer` | `estimated_duration_days INTEGER` |
| **الرسوم** | `fees: decimal(10, 2)` | `fees_amount DECIMAL(10,2), fees_currency VARCHAR(3)` |

**الحل المطلوب:**
```typescript
services: {
  serviceCode: text("service_code").notNull().unique(), // إضافة مطلوبة
  ministryId: uuid("ministry_id").notNull(), // إضافة مطلوبة
  departmentId: uuid("department_id"), // إضافة مطلوبة
  feesAmount: decimal("fees_amount", { precision: 10, scale: 2 }),
  feesCurrency: text("fees_currency").default("YER"), // إضافة مطلوبة
}
```

### 4. تصادم جدول الطلبات (applications vs citizen_applications)
**المشكلة:** نفس الوظيفة، تسميات مختلفة

| المجال | shared/schema.ts (applications) | yemen_platform_enhanced.sql (citizen_applications) |
|---------|--------------------------------|---------------------------------------------------|
| **رقم الطلب** | `applicationNumber` | `application_number` |
| **مقدم الطلب** | `applicantId` | `applicant_id` |
| **البيانات** | `applicationData: jsonb` | `application_data JSONB` |
| **الحالة** | `status: text` - enum نصي | `status application_status_enum` |
| **الأولوية** | ❌ غير موجود | `priority priority_enum` |

**الحل المطلوب:**
```typescript
applications: {
  applicationNumber: text("application_number").notNull().unique(),
  priority: text("priority").default("normal"), // إضافة مطلوبة
  applicationData: jsonb("application_data").notNull(),
  // توحيد نظام الحالات مع ENUMs
}
```

### 5. تصادم النطاقات الجغرافية (plotLocation vs PostGIS)
**المشكلة:** بيانات جغرافية غير منظمة

| المجال | shared/schema.ts | yemen_platform_enhanced.sql |
|---------|------------------|------------------------------|
| **إحداثيات القطعة** | `plotLocation: jsonb` - غير منظم | `land_coordinates GEOMETRY(POINT, 4326)` |
| **الحدود** | `boundaries: jsonb` - غير منظم | `land_boundaries GEOMETRY(POLYGON, 4326)` |
| **البيانات الجغرافية** | JSON عشوائي | PostGIS معياري |

**الحل المطلوب:**
```typescript
// استخدام PostGIS بدلاً من JSONB
surveyingDecisions: {
  plotCoordinates: geometry("plot_coordinates", { type: "point", srid: 4326 }),
  plotBoundaries: geometry("plot_boundaries", { type: "polygon", srid: 4326 }),
  // إزالة plotLocation: jsonb نهائياً
}
```

---

## 📋 الجداول المفقودة 

### 🗺️ الجداول الجغرافية المفقودة (8 من 11):
**موجود:** governorates, districts, neighborhoods  
**مفقود:**
1. **geo_sub_districts** (العزل) 
2. **geo_harat** (الحارات)
3. **geo_sectors** (القطاعات)
4. **geo_neighborhood_units** (وحدات الجوار)  
5. **geo_blocks** (البلوكات)
6. **geo_plots** (قطع الأراضي) **[أولوية قصوى للـ LBAC]**
7. **geo_streets** (الشوارع)
8. **geo_street_segments** (أجزاء الشوارع)

### 🔗 طبقة الربط LBAC (3 جداول منفصلة):
1. **org_branches** (فروع الإدارات)
2. **org_branch_coverage_areas** (مناطق تغطية الفروع)
3. **org_employee_scopes** (نطاقات الموظفين الجغرافية)

### 📊 البيانات المتوفرة للاستيراد:
- ملف GeoJSON للمحافظات: 22 محافظة مع البيانات الجغرافية كاملة
- ملف GeoJSON للمديريات: 333 مديرية جاهزة للاستيراد

---

## 🛠️ دليل التسمية الموحد (Naming Convention v1)

### القواعد الإلزامية:
```typescript
// 1. استخدام camelCase في Drizzle ORM
tableName: text("table_name") // ✅ صحيح
tableName: text("tableName")  // ❌ خطأ

// 2. أسماء الجداول الجغرافية
geo_* // للجداول الجغرافية
org_* // للجداول التنظيمية  
sys_* // للجداول النظامية

// 3. العلاقات الخارجية
foreignKeyId: uuid("foreign_key_id") // ✅ مع _id
foreignKey: uuid("foreign_key")      // ❌ بدون _id

// 4. البيانات الجغرافية
coordinates: geometry("coordinates", { type: "point", srid: 4326 })
boundaries: geometry("boundaries", { type: "multipolygon", srid: 4326 })
```

---

## 🎯 الخطة التصحيحية الموصى بها

### المرحلة 1: إنشاء المخطط الموحد
1. ⏳ إنشاء `shared/unified_schema.ts`
2. ⏳ دمج التعريفات مع حل التصادمات
3. ⏳ إضافة الجداول الجغرافية المفقودة
4. ⏳ إضافة طبقة الربط LBAC

### المرحلة 2: اختبار الهيكل
1. ⏳ كتابة اختبارات التحقق الهيكلي
2. ⏳ فحص العلاقات والقيود
3. ⏳ اختبار PostGIS functions

### المرحلة 3: التطبيق الآمن
1. ⏳ نسخة احتياطية من قاعدة البيانات
2. ⏳ تطبيق المخطط تدريجياً
3. ⏳ فحص تكامل البيانات

---

## 📈 مؤشرات النجاح المطلوبة

- ⏱️ **زمن استيراد 333 مديرية:** < 30 ثانية
- ⚡ **زمن استعلام LBAC:** < 200ms  
- 📊 **معدل نجاح استيراد GeoJSON:** > 98%
- 🗂️ **حجم قاعدة البيانات بعد الاستيراد:** < 500MB
- 🔍 **زمن استعلام PostGIS:** < 100ms للاستعلامات البسيطة

## 🛠️ القرارات التقنية الإلزامية

### استراتيجية ENUMs:
**القرار:** استخدام Database ENUMs مع Drizzle pgEnum
```typescript
// ✅ صحيح
export const statusEnum = pgEnum('status_enum', ['active', 'inactive']);
export const users = pgTable("users", {
  status: statusEnum("status").default('active'),
});

// ❌ خطأ - Text مع Zod فقط
status: text("status").default("active"), // تجنب هذا
```

### إدارة PostGIS في Drizzle:
**القرار:** استخدام SQL-managed columns مع customType
```typescript
// للبيانات الجغرافية
import { customType } from 'drizzle-orm/pg-core';

const geometry = customType<{ data: string }>({
  dataType() {
    return 'geometry(MULTIPOLYGON, 4326)';
  },
});

export const governorates = pgTable("governorates", {
  boundaries: geometry("boundaries"),
});
```

### الأمان والمصادقة:
🚨 **إلزامي:** تشفير كلمات المرور
```typescript
// ❌ خطير - كلمات مرور غير مشفرة
password: text("password").notNull(),

// ✅ صحيح - مع bcrypt
password: text("password_hash").notNull(), // سيتم تشفيرها في التطبيق
```

### استراتيجية المعرفات (IDs):
**القرار:** الاحتفاظ بـ UUID للجداول الجديدة، احترام الموجود
```typescript
// للجداول الجديدة
id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

// للجداول الموجودة - لا تغيير ID types أبداً
```

---

**📝 تم إنشاء هذا التقرير في:** 12 ديسمبر 2024  
**🔧 أداة التحليل:** Manual Schema Analysis + Drizzle ORM Introspection  
**⏳ الخطوة التالية:** إنشاء shared/unified_schema.ts مع القرارات التقنية المحددة