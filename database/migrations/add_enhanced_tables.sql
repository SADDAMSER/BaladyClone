-- =========================================================
-- إضافة الجداول المحسنة لمنصة "بناء اليمن" الرقمية
-- Adding Enhanced Tables for Yemen Digital Platform
-- =========================================================

BEGIN;

-- =========================================================
-- إضافة ENUM Types الجديدة
-- =========================================================

DO $$ BEGIN
  CREATE TYPE user_status_enum AS ENUM ('active','inactive','suspended','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status_enum AS ENUM ('submitted','under_review','approved','rejected','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_enum AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type_enum AS ENUM ('info','warning','error','success','reminder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE channel_type_enum AS ENUM ('email','sms','push','in_app','whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE survey_measurement_type AS ENUM ('boundary','area','coordinates','elevation','distance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('pdf','doc','docx','jpg','png','jpeg','gif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- إضافة جداول جديدة للنظام المحسن
-- =========================================================

-- جدول الوزارات
CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  ministry_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأدوار المحسن
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الصلاحيات
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول ربط المستخدمين بالأدوار
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);

-- جدول ربط الأدوار بالصلاحيات
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

-- جدول فئات الخدمات
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الخدمات الحكومية المحسن
CREATE TABLE IF NOT EXISTS government_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  category_id UUID NOT NULL,
  ministry_id UUID,
  department_id UUID,
  description TEXT,
  requirements_ar TEXT,
  requirements_en TEXT,
  workflow_template_id UUID,
  estimated_duration_days INTEGER DEFAULT 7,
  fees_amount DECIMAL(10,2) DEFAULT 0,
  fees_currency VARCHAR(3) DEFAULT 'YER',
  is_online_service BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول طلبات المواطنين المحسن
CREATE TABLE IF NOT EXISTS citizen_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  service_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  current_step_id UUID,
  status application_status_enum DEFAULT 'submitted',
  priority priority_enum DEFAULT 'normal',
  application_data JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_completion_date DATE,
  completed_at TIMESTAMP,
  total_fees DECIMAL(10,2) DEFAULT 0,
  paid_fees DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول خطوات سير العمل
CREATE TABLE IF NOT EXISTS application_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  step_order INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_description TEXT,
  assigned_to_role VARCHAR(100),
  assigned_to_user_id UUID,
  required_action VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline TIMESTAMP,
  notes TEXT,
  decision_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول طلبات القرارات المساحية
CREATE TABLE IF NOT EXISTS land_survey_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  application_id UUID NOT NULL,
  land_owner_name VARCHAR(255) NOT NULL,
  land_location_description TEXT NOT NULL,
  survey_purpose VARCHAR(255),
  surveyor_assigned_id UUID,
  survey_date DATE,
  survey_completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول قياسات المساحة
CREATE TABLE IF NOT EXISTS survey_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_request_id UUID NOT NULL,
  measurement_type survey_measurement_type NOT NULL,
  measurement_data JSONB NOT NULL,
  calculated_area DECIMAL(12,2),
  perimeter_length DECIMAL(12,2),
  measured_by UUID NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  device_info JSONB,
  accuracy_meters DECIMAL(5,2),
  verification_status VARCHAR(50) DEFAULT 'pending'
);

-- جدول القرارات المساحية المعتمدة
CREATE TABLE IF NOT EXISTS approved_survey_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_request_id UUID NOT NULL,
  decision_number VARCHAR(50) UNIQUE NOT NULL,
  land_area_m2 DECIMAL(12,2) NOT NULL,
  boundary_points JSONB NOT NULL,
  north_boundary VARCHAR(255),
  south_boundary VARCHAR(255),
  east_boundary VARCHAR(255),
  west_boundary VARCHAR(255),
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decision_document_path VARCHAR(500),
  validity_period_months INTEGER DEFAULT 12,
  expires_at DATE,
  is_active BOOLEAN DEFAULT TRUE
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  notification_type notification_type_enum DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- جدول قنوات الإشعارات
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_type channel_type_enum NOT NULL,
  channel_address VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  verification_token VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول أرشيف المستندات
CREATE TABLE IF NOT EXISTS document_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type document_type_enum NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  checksum VARCHAR(255),
  is_encrypted BOOLEAN DEFAULT FALSE,
  encryption_method VARCHAR(100),
  related_application_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retention_date DATE,
  is_archived BOOLEAN DEFAULT FALSE
);

-- =========================================================
-- إضافة Foreign Keys للعلاقات
-- =========================================================

-- علاقات الخدمات الحكومية
DO $$ BEGIN
  ALTER TABLE government_services 
  ADD CONSTRAINT fk_government_services_category_id 
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE government_services 
  ADD CONSTRAINT fk_government_services_ministry_id 
  FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE government_services 
  ADD CONSTRAINT fk_government_services_department_id 
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات طلبات المواطنين
DO $$ BEGIN
  ALTER TABLE citizen_applications 
  ADD CONSTRAINT fk_citizen_applications_service_id 
  FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE citizen_applications 
  ADD CONSTRAINT fk_citizen_applications_applicant_id 
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات خطوات سير العمل
DO $$ BEGIN
  ALTER TABLE application_workflow_steps 
  ADD CONSTRAINT fk_application_workflow_steps_application_id 
  FOREIGN KEY (application_id) REFERENCES citizen_applications(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE application_workflow_steps 
  ADD CONSTRAINT fk_application_workflow_steps_assigned_to_user_id 
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات القرارات المساحية
DO $$ BEGIN
  ALTER TABLE land_survey_requests 
  ADD CONSTRAINT fk_land_survey_requests_application_id 
  FOREIGN KEY (application_id) REFERENCES citizen_applications(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE land_survey_requests 
  ADD CONSTRAINT fk_land_survey_requests_surveyor_assigned_id 
  FOREIGN KEY (surveyor_assigned_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE survey_measurements 
  ADD CONSTRAINT fk_survey_measurements_survey_request_id 
  FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE survey_measurements 
  ADD CONSTRAINT fk_survey_measurements_measured_by 
  FOREIGN KEY (measured_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE approved_survey_decisions 
  ADD CONSTRAINT fk_approved_survey_decisions_survey_request_id 
  FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE approved_survey_decisions 
  ADD CONSTRAINT fk_approved_survey_decisions_approved_by 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات الإشعارات
DO $$ BEGIN
  ALTER TABLE system_notifications 
  ADD CONSTRAINT fk_system_notifications_recipient_id 
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE notification_channels 
  ADD CONSTRAINT fk_notification_channels_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات الأدوار والصلاحيات
DO $$ BEGIN
  ALTER TABLE user_roles 
  ADD CONSTRAINT fk_user_roles_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE user_roles 
  ADD CONSTRAINT fk_user_roles_role_id 
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE role_permissions 
  ADD CONSTRAINT fk_role_permissions_role_id 
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE role_permissions 
  ADD CONSTRAINT fk_role_permissions_permission_id 
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- علاقات أرشيف المستندات
DO $$ BEGIN
  ALTER TABLE document_archives 
  ADD CONSTRAINT fk_document_archives_related_application_id 
  FOREIGN KEY (related_application_id) REFERENCES citizen_applications(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE document_archives 
  ADD CONSTRAINT fk_document_archives_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- إضافة فهارس لتحسين الأداء
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_government_services_category_id ON government_services(category_id);
CREATE INDEX IF NOT EXISTS idx_government_services_ministry_id ON government_services(ministry_id);
CREATE INDEX IF NOT EXISTS idx_government_services_is_active ON government_services(is_active);

CREATE INDEX IF NOT EXISTS idx_citizen_applications_applicant_id ON citizen_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_citizen_applications_service_id ON citizen_applications(service_id);
CREATE INDEX IF NOT EXISTS idx_citizen_applications_status ON citizen_applications(status);
CREATE INDEX IF NOT EXISTS idx_citizen_applications_submitted_at ON citizen_applications(submitted_at);

CREATE INDEX IF NOT EXISTS idx_application_workflow_steps_application_id ON application_workflow_steps(application_id);
CREATE INDEX IF NOT EXISTS idx_application_workflow_steps_assigned_to_user_id ON application_workflow_steps(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_land_survey_requests_application_id ON land_survey_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_land_survey_requests_surveyor_assigned_id ON land_survey_requests(surveyor_assigned_id);
CREATE INDEX IF NOT EXISTS idx_land_survey_requests_status ON land_survey_requests(status);

CREATE INDEX IF NOT EXISTS idx_system_notifications_recipient_id ON system_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read ON system_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_sent_at ON system_notifications(sent_at);

-- فهارس البحث النصي
CREATE INDEX IF NOT EXISTS idx_government_services_name_search ON government_services USING GIN (to_tsvector('arabic', name));
CREATE INDEX IF NOT EXISTS idx_ministries_name_search ON ministries USING GIN (to_tsvector('arabic', name));

COMMIT;

-- =========================================================
-- إدراج البيانات الأولية
-- =========================================================

-- إدراج الأدوار الافتراضية
INSERT INTO roles (name, name_ar, description, is_system_role) VALUES
('super_admin', 'مدير عام', 'صلاحيات كاملة على النظام', TRUE),
('ministry_admin', 'مدير وزارة', 'إدارة وزارة كاملة', TRUE),
('department_manager', 'مدير قسم', 'إدارة قسم محدد', TRUE),
('employee', 'موظف', 'موظف عادي في النظام', TRUE),
('citizen', 'مواطن', 'مواطن يستخدم الخدمات', TRUE),
('surveyor', 'مساح', 'مساح معتمد للقرارات المساحية', TRUE)
ON CONFLICT (name) DO NOTHING;

-- إدراج الصلاحيات الأساسية
INSERT INTO permissions (name, name_ar, description, resource, action) VALUES
('manage_users', 'إدارة المستخدمين', 'إنشاء وتعديل وحذف المستخدمين', 'users', 'manage'),
('view_applications', 'عرض الطلبات', 'عرض طلبات المواطنين', 'applications', 'read'),
('approve_applications', 'الموافقة على الطلبات', 'الموافقة على طلبات المواطنين', 'applications', 'approve'),
('manage_services', 'إدارة الخدمات', 'إنشاء وتعديل الخدمات الحكومية', 'services', 'manage'),
('conduct_surveys', 'إجراء المساحة', 'إجراء عمليات المساحة والقياس', 'surveys', 'execute'),
('approve_surveys', 'اعتماد المساحة', 'اعتماد القرارات المساحية', 'surveys', 'approve'),
('view_reports', 'عرض التقارير', 'عرض تقارير النظام والإحصائيات', 'reports', 'read'),
('manage_system', 'إدارة النظام', 'إدارة إعدادات النظام العامة', 'system', 'manage')
ON CONFLICT (name) DO NOTHING;

-- إدراج فئات الخدمات الافتراضية
INSERT INTO service_categories (name, name_en, description, icon, color, sort_order) VALUES
('تراخيص البناء', 'Building Licenses', 'خدمات تراخيص البناء والإنشاءات', 'building', '#3B82F6', 1),
('القرارات المساحية', 'Survey Decisions', 'خدمات القرارات المساحية وتحديد الحدود', 'map', '#10B981', 2),
('الاشتراطات الفنية', 'Technical Requirements', 'الاشتراطات والمعايير الفنية', 'settings', '#F59E0B', 3),
('الخدمات المالية', 'Financial Services', 'الرسوم والخدمات المالية', 'credit-card', '#EF4444', 4),
('التراخيص التجارية', 'Commercial Licenses', 'تراخيص الأنشطة التجارية والاستثمارية', 'briefcase', '#8B5CF6', 5)
ON CONFLICT DO NOTHING;

-- إدراج الوزارات الأساسية
INSERT INTO ministries (name, name_en, ministry_code, description) VALUES
('وزارة الأشغال العامة والطرق', 'Ministry of Public Works and Roads', 'MPWR', 'مسؤولة عن البنية التحتية والطرق والمباني العامة'),
('وزارة الإدارة المحلية', 'Ministry of Local Administration', 'MLA', 'مسؤولة عن إدارة المحافظات والمديريات والخدمات المحلية'),
('وزارة التخطيط والتعاون الدولي', 'Ministry of Planning and International Cooperation', 'MPIC', 'مسؤولة عن التخطيط العام والمشاريع التنموية'),
('وزارة المالية', 'Ministry of Finance', 'MOF', 'مسؤولة عن الشؤون المالية والموازنة العامة'),
('وزارة العدل', 'Ministry of Justice', 'MOJ', 'مسؤولة عن النظام القضائي والقوانين')
ON CONFLICT (ministry_code) DO NOTHING;