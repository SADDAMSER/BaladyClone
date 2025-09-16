-- Performance Indexes for Yemen Platform Database
-- هذا الملف يحتوي على indexes إضافية لتحسين أداء الاستعلامات مع التصفح

-- ======= TASKS TABLE INDEXES =======

-- Index للبحث والتصفية حسب الحالة والأولوية
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority 
ON tasks (status, priority);

-- Index للبحث حسب المستخدم المكلف والحالة
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status 
ON tasks (assigned_to_id, status);

-- Index للبحث حسب من كلف المهمة والحالة
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by_status 
ON tasks (assigned_by_id, status);

-- Index للبحث حسب الطلب المرتبط
CREATE INDEX IF NOT EXISTS idx_tasks_application_id 
ON tasks (application_id);

-- Index للترتيب حسب تاريخ الإنشاء والتحديث
CREATE INDEX IF NOT EXISTS idx_tasks_created_updated 
ON tasks (created_at DESC, updated_at DESC);

-- Index للبحث في العنوان (للبحث النصي)
CREATE INDEX IF NOT EXISTS idx_tasks_title_gin 
ON tasks USING gin (to_tsvector('arabic', title));

-- Index للبحث في الوصف (للبحث النصي)
CREATE INDEX IF NOT EXISTS idx_tasks_description_gin 
ON tasks USING gin (to_tsvector('arabic', description));

-- Index للمهام المتأخرة
CREATE INDEX IF NOT EXISTS idx_tasks_overdue 
ON tasks (due_date, status) 
WHERE due_date < NOW() AND status != 'completed';

-- ======= APPLICATIONS TABLE INDEXES =======

-- Index للبحث والتصفية حسب الحالة والمرحلة الحالية
CREATE INDEX IF NOT EXISTS idx_applications_status_stage 
ON applications (status, current_stage);

-- Index للبحث حسب نوع الخدمة والحالة
CREATE INDEX IF NOT EXISTS idx_applications_service_status 
ON applications (service_id, status);

-- Index للبحث حسب المستخدم المكلف
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to 
ON applications (assigned_to_id);

-- Index للترتيب حسب تاريخ الإنشاء والتحديث
CREATE INDEX IF NOT EXISTS idx_applications_created_updated 
ON applications (created_at DESC, updated_at DESC);

-- Index للبحث في رقم الطلب
CREATE INDEX IF NOT EXISTS idx_applications_number 
ON applications (application_number);

-- Index للبحث النصي في الملاحظات
CREATE INDEX IF NOT EXISTS idx_applications_notes_gin 
ON applications USING gin (to_tsvector('arabic', notes));

-- Index للطلبات المدفوعة في انتظار التكليف
CREATE INDEX IF NOT EXISTS idx_applications_paid_awaiting 
ON applications (status, current_stage) 
WHERE status = 'paid';

-- Index للطلبات المعلقة للسداد
CREATE INDEX IF NOT EXISTS idx_applications_pending_payment 
ON applications (status, fees) 
WHERE status = 'pending_payment';

-- ======= USERS TABLE INDEXES =======

-- Index للبحث والتصفية حسب الدور والقسم
CREATE INDEX IF NOT EXISTS idx_users_role_department 
ON users (role, department_id);

-- Index للبحث حسب القسم والحالة النشطة
CREATE INDEX IF NOT EXISTS idx_users_department_active 
ON users (department_id, is_active);

-- Index للبحث حسب المنصب والحالة النشطة
CREATE INDEX IF NOT EXISTS idx_users_position_active 
ON users (position_id, is_active);

-- Index للبحث النصي في الاسم الكامل
CREATE INDEX IF NOT EXISTS idx_users_fullname_gin 
ON users USING gin (to_tsvector('arabic', full_name));

-- Index للبحث في اسم المستخدم والبريد الإلكتروني
CREATE INDEX IF NOT EXISTS idx_users_username_email 
ON users (username, email);

-- Index للمستخدمين النشطين فقط
CREATE INDEX IF NOT EXISTS idx_users_active_created 
ON users (is_active, created_at DESC) 
WHERE is_active = true;

-- Index لآخر تسجيل دخول
CREATE INDEX IF NOT EXISTS idx_users_last_login 
ON users (last_login_at DESC NULLS LAST);

-- ======= DEPARTMENTS TABLE INDEXES =======

-- Index للبحث النصي في أسماء الأقسام
CREATE INDEX IF NOT EXISTS idx_departments_name_gin 
ON departments USING gin (
  to_tsvector('arabic', name_ar) || 
  to_tsvector('english', name_en)
);

-- Index للأقسام النشطة
CREATE INDEX IF NOT EXISTS idx_departments_active 
ON departments (is_active, created_at DESC) 
WHERE is_active = true;

-- ======= NOTIFICATIONS TABLE INDEXES =======

-- Index للإشعارات حسب المستخدم والحالة
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications (user_id, is_read, created_at DESC);

-- Index للإشعارات غير المقروءة
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications (user_id, created_at DESC) 
WHERE is_read = false;

-- Index للبحث حسب نوع الإشعار
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications (type, created_at DESC);

-- ======= APPLICATION STATUS HISTORY INDEXES =======

-- Index لتاريخ تغيير حالة الطلبات
CREATE INDEX IF NOT EXISTS idx_app_status_history_app_date 
ON application_status_history (application_id, changed_at DESC);

-- Index للبحث حسب من غير الحالة
CREATE INDEX IF NOT EXISTS idx_app_status_history_changed_by 
ON application_status_history (changed_by_id, changed_at DESC);

-- ======= GEOGRAPHIC DATA INDEXES =======

-- Index للبحث الجغرافي في المحافظات
CREATE INDEX IF NOT EXISTS idx_governorates_code 
ON governorates (code);

-- Index للبحث الجغرافي في المديريات
CREATE INDEX IF NOT EXISTS idx_districts_governorate 
ON districts (governorate_id, code);

-- Index للبحث الجغرافي في المديريات الفرعية
CREATE INDEX IF NOT EXISTS idx_sub_districts_district 
ON sub_districts (district_id, code);

-- Index للبحث الجغرافي في الأحياء
CREATE INDEX IF NOT EXISTS idx_neighborhoods_sub_district 
ON neighborhoods (sub_district_id, code);

-- ======= COMPOSITE INDEXES FOR COMPLEX QUERIES =======

-- Index مركب للمهام: المستخدم + الحالة + تاريخ الإنشاء
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_created 
ON tasks (assigned_to_id, status, created_at DESC);

-- Index مركب للطلبات: الخدمة + الحالة + تاريخ الإنشاء
CREATE INDEX IF NOT EXISTS idx_applications_service_status_created 
ON applications (service_id, status, created_at DESC);

-- Index مركب للمستخدمين: الدور + القسم + النشاط
CREATE INDEX IF NOT EXISTS idx_users_role_dept_active 
ON users (role, department_id, is_active);

-- ======= PARTIAL INDEXES FOR SPECIFIC CONDITIONS =======

-- Index للمهام المعلقة فقط
CREATE INDEX IF NOT EXISTS idx_tasks_pending_only 
ON tasks (assigned_to_id, created_at DESC) 
WHERE status = 'pending';

-- Index للمهام قيد التنفيذ فقط
CREATE INDEX IF NOT EXISTS idx_tasks_in_progress_only 
ON tasks (assigned_to_id, created_at DESC) 
WHERE status = 'in_progress';

-- Index للطلبات الجديدة فقط
CREATE INDEX IF NOT EXISTS idx_applications_submitted_only 
ON applications (service_id, created_at DESC) 
WHERE status = 'submitted';

-- ======= PERFORMANCE MONITORING QUERIES =======

-- استعلام لمراقبة استخدام الـ indexes
-- يمكن تشغيله لمعرفة أي indexes تُستخدم بكثرة وأيها لا تُستخدم

/*
-- للتحقق من استخدام الـ indexes:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- للتحقق من الـ indexes غير المستخدمة:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- للتحقق من أبطأ الاستعلامات:
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%tasks%' OR query LIKE '%applications%' OR query LIKE '%users%'
ORDER BY mean_time DESC 
LIMIT 10;
*/

-- ======= MAINTENANCE COMMANDS =======

-- تحديث إحصائيات الجداول لتحسين أداء الاستعلامات
ANALYZE tasks;
ANALYZE applications;
ANALYZE users;
ANALYZE departments;
ANALYZE notifications;

-- إعادة بناء الـ indexes إذا لزم الأمر (يُشغل عند الحاجة فقط)
-- REINDEX TABLE tasks;
-- REINDEX TABLE applications;
-- REINDEX TABLE users;

COMMIT;

