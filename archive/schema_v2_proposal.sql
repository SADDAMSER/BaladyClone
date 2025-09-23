-- =========================================================
-- مخطط قاعدة البيانات المحسن لمنصة "بناء اليمن" الرقمية
-- Enhanced Database Schema for Yemen Digital Platform
-- الإصدار: 2.0
-- التاريخ: ديسمبر 2024
-- =========================================================

BEGIN;

-- =========================================================
-- 0) Extensions & ENUM Types (Idempotent)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM Types for System
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
  CREATE TYPE language_direction AS ENUM ('rtl','ltr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE survey_measurement_type AS ENUM ('boundary','area','coordinates','elevation','distance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('pdf','doc','docx','jpg','png','jpeg','gif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 1) Core System Tables (Authentication & Authorization)
-- =========================================================

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  father_name VARCHAR(100),
  grandfather_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  national_id VARCHAR(50) UNIQUE,
  avatar_url VARCHAR(500),
  status user_status_enum DEFAULT 'pending',
  email_verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  locale VARCHAR(10) DEFAULT 'ar',
  timezone VARCHAR(50) DEFAULT 'Asia/Aden',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- create, read, update, delete, execute
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);

DROP TABLE IF EXISTS role_permissions;
CREATE TABLE role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 2) Organizational Structure
-- =========================================================

DROP TABLE IF EXISTS ministries CASCADE;
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL,
  parent_department_id UUID,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  department_code VARCHAR(20) NOT NULL,
  description TEXT,
  manager_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS positions CASCADE;
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  level INTEGER DEFAULT 1,
  description TEXT,
  required_qualifications TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  position_id UUID NOT NULL,
  department_id UUID NOT NULL,
  direct_manager_id UUID,
  hire_date DATE NOT NULL,
  employment_status VARCHAR(50) DEFAULT 'active',
  salary DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 3) Geographic & Administrative Divisions
-- =========================================================

DROP TABLE IF EXISTS governorates CASCADE;
CREATE TABLE governorates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code VARCHAR(10) UNIQUE NOT NULL,
  capital_city VARCHAR(255),
  population BIGINT,
  area_km2 DECIMAL(10,2),
  coordinates GEOMETRY(POINT, 4326),
  boundaries GEOMETRY(MULTIPOLYGON, 4326),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS districts CASCADE;
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  governorate_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code VARCHAR(10) NOT NULL,
  population BIGINT,
  area_km2 DECIMAL(10,2),
  coordinates GEOMETRY(POINT, 4326),
  boundaries GEOMETRY(MULTIPOLYGON, 4326),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS neighborhoods CASCADE;
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code VARCHAR(10) NOT NULL,
  type VARCHAR(50), -- residential, commercial, industrial, mixed
  coordinates GEOMETRY(POINT, 4326),
  boundaries GEOMETRY(MULTIPOLYGON, 4326),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 4) Government Services System
-- =========================================================

DROP TABLE IF EXISTS service_categories CASCADE;
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS government_services CASCADE;
CREATE TABLE government_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  category_id UUID NOT NULL,
  ministry_id UUID NOT NULL,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS service_requirements CASCADE;
CREATE TABLE service_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  requirement_name_en VARCHAR(255),
  description TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  document_type VARCHAR(100),
  validation_rules JSONB,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- =========================================================
-- 5) Application Management System
-- =========================================================

DROP TABLE IF EXISTS citizen_applications CASCADE;
CREATE TABLE citizen_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  service_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  current_step_id UUID,
  status application_status_enum DEFAULT 'submitted',
  priority priority_enum DEFAULT 'normal',
  application_data JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  expected_completion_date DATE,
  completed_at TIMESTAMP,
  total_fees DECIMAL(10,2) DEFAULT 0,
  paid_fees DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS application_workflow_steps CASCADE;
CREATE TABLE application_workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS application_attachments CASCADE;
CREATE TABLE application_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL,
  requirement_id UUID,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type document_type_enum NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID,
  verified_at TIMESTAMP,
  verification_notes TEXT
);

-- =========================================================
-- 6) Workflow Templates System
-- =========================================================

DROP TABLE IF EXISTS workflow_templates CASCADE;
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  service_category_id UUID,
  steps_configuration JSONB NOT NULL,
  auto_assignment_rules JSONB,
  escalation_rules JSONB,
  notification_rules JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS business_rules CASCADE;
CREATE TABLE business_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(255) NOT NULL,
  rule_name_en VARCHAR(255),
  description TEXT,
  service_id UUID,
  category VARCHAR(100),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 7) Notifications System
-- =========================================================

DROP TABLE IF EXISTS system_notifications CASCADE;
CREATE TABLE system_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL,
  notification_type notification_type_enum DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  expires_at TIMESTAMP
);

DROP TABLE IF EXISTS notification_channels CASCADE;
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  channel_type channel_type_enum NOT NULL,
  channel_address VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  verification_token VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS notification_templates CASCADE;
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(100) NOT NULL UNIQUE,
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  content_ar TEXT NOT NULL,
  content_en TEXT,
  variables JSONB,
  channel_types channel_type_enum[] DEFAULT ARRAY['in_app'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 8) Land Survey & Geospatial Services
-- =========================================================

DROP TABLE IF EXISTS land_survey_requests CASCADE;
CREATE TABLE land_survey_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  application_id UUID NOT NULL,
  land_owner_name VARCHAR(255) NOT NULL,
  land_location_description TEXT NOT NULL,
  land_coordinates GEOMETRY(POINT, 4326),
  survey_purpose VARCHAR(255),
  surveyor_assigned_id UUID,
  survey_date DATE,
  survey_completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS survey_measurements CASCADE;
CREATE TABLE survey_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_request_id UUID NOT NULL,
  measurement_type survey_measurement_type NOT NULL,
  measurement_data JSONB NOT NULL,
  coordinates_polygon GEOMETRY(POLYGON, 4326),
  coordinates_points GEOMETRY(MULTIPOINT, 4326),
  calculated_area DECIMAL(12,2),
  perimeter_length DECIMAL(12,2),
  measured_by UUID NOT NULL,
  measured_at TIMESTAMP DEFAULT NOW(),
  device_info JSONB,
  accuracy_meters DECIMAL(5,2),
  verification_status VARCHAR(50) DEFAULT 'pending'
);

DROP TABLE IF EXISTS approved_survey_decisions CASCADE;
CREATE TABLE approved_survey_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_request_id UUID NOT NULL,
  decision_number VARCHAR(50) UNIQUE NOT NULL,
  land_area_m2 DECIMAL(12,2) NOT NULL,
  land_boundaries GEOMETRY(POLYGON, 4326) NOT NULL,
  boundary_points JSONB NOT NULL,
  north_boundary VARCHAR(255),
  south_boundary VARCHAR(255),
  east_boundary VARCHAR(255),
  west_boundary VARCHAR(255),
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW(),
  decision_document_path VARCHAR(500),
  validity_period_months INTEGER DEFAULT 12,
  expires_at DATE,
  is_active BOOLEAN DEFAULT TRUE
);

DROP TABLE IF EXISTS survey_devices CASCADE;
CREATE TABLE survey_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_serial VARCHAR(100) UNIQUE NOT NULL,
  device_model VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  assigned_to_surveyor_id UUID,
  last_calibration_date DATE,
  calibration_certificate VARCHAR(500),
  accuracy_level VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS raw_survey_data CASCADE;
CREATE TABLE raw_survey_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_request_id UUID NOT NULL,
  device_id UUID NOT NULL,
  point_sequence INTEGER NOT NULL,
  point_name VARCHAR(100),
  latitude DECIMAL(12,8) NOT NULL,
  longitude DECIMAL(12,8) NOT NULL,
  elevation DECIMAL(8,3),
  accuracy_meters DECIMAL(5,2),
  point_type VARCHAR(50), -- corner, boundary, reference
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 9) Document Management & Digital Signatures
-- =========================================================

DROP TABLE IF EXISTS document_archives CASCADE;
CREATE TABLE document_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  retention_date DATE,
  is_archived BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS digital_signatures CASCADE;
CREATE TABLE digital_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  signer_id UUID NOT NULL,
  signature_hash VARCHAR(255) NOT NULL,
  signature_algorithm VARCHAR(50) DEFAULT 'SHA256',
  certificate_info JSONB,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  device_info JSONB,
  is_valid BOOLEAN DEFAULT TRUE,
  verification_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP
);

-- =========================================================
-- 10) Reporting & Analytics
-- =========================================================

DROP TABLE IF EXISTS system_reports CASCADE;
CREATE TABLE system_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name VARCHAR(255) NOT NULL,
  report_name_en VARCHAR(255),
  report_type VARCHAR(100) NOT NULL,
  description TEXT,
  generated_by UUID NOT NULL,
  parameters JSONB,
  file_path VARCHAR(500),
  file_format VARCHAR(10) DEFAULT 'pdf',
  generated_at TIMESTAMP DEFAULT NOW(),
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_expression VARCHAR(100), -- cron expression
  retention_days INTEGER DEFAULT 30
);

DROP TABLE IF EXISTS performance_metrics CASCADE;
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(255) NOT NULL,
  metric_category VARCHAR(100),
  metric_value DECIMAL(15,2) NOT NULL,
  measurement_unit VARCHAR(50),
  measurement_date DATE DEFAULT CURRENT_DATE,
  measurement_time TIME DEFAULT CURRENT_TIME,
  department_id UUID,
  service_id UUID,
  additional_data JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 11) System Configuration
-- =========================================================

DROP TABLE IF EXISTS system_settings CASCADE;
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_name VARCHAR(255) NOT NULL,
  setting_name_en VARCHAR(255),
  setting_value TEXT,
  default_value TEXT,
  data_type VARCHAR(50) DEFAULT 'string',
  is_public BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE,
  validation_rules JSONB,
  category VARCHAR(100),
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS languages CASCADE;
CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(5) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  direction language_direction DEFAULT 'ltr',
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  flag_icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

-- =========================================================
-- Initial Data Insertion
-- =========================================================

-- Insert default languages
INSERT INTO languages (code, name, native_name, direction, is_active, is_default) VALUES
('ar', 'Arabic', 'العربية', 'rtl', TRUE, TRUE),
('en', 'English', 'English', 'ltr', TRUE, FALSE);

-- Insert default roles
INSERT INTO roles (name, name_ar, description, is_system_role) VALUES
('super_admin', 'مدير عام', 'صلاحيات كاملة على النظام', TRUE),
('ministry_admin', 'مدير وزارة', 'إدارة وزارة كاملة', TRUE),
('department_manager', 'مدير قسم', 'إدارة قسم محدد', TRUE),
('employee', 'موظف', 'موظف عادي في النظام', TRUE),
('citizen', 'مواطن', 'مواطن يستخدم الخدمات', TRUE),
('surveyor', 'مساح', 'مساح معتمد للقرارات المساحية', TRUE);

-- Insert default service categories
INSERT INTO service_categories (name, name_en, description, icon, color, sort_order) VALUES
('تراخيص البناء', 'Building Licenses', 'خدمات تراخيص البناء والإنشاءات', 'building', '#3B82F6', 1),
('القرارات المساحية', 'Survey Decisions', 'خدمات القرارات المساحية وتحديد الحدود', 'map', '#10B981', 2),
('الاشتراطات الفنية', 'Technical Requirements', 'الاشتراطات والمعايير الفنية', 'settings', '#F59E0B', 3),
('الخدمات المالية', 'Financial Services', 'الرسوم والخدمات المالية', 'credit-card', '#EF4444', 4);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_name, setting_name_en, setting_value, default_value, data_type, category) VALUES
('system_name', 'اسم النظام', 'System Name', 'منصة بناء اليمن الرقمية', 'منصة بناء اليمن الرقمية', 'string', 'general'),
('default_language', 'اللغة الافتراضية', 'Default Language', 'ar', 'ar', 'string', 'general'),
('max_file_size_mb', 'الحد الأقصى لحجم الملف', 'Max File Size MB', '10', '10', 'integer', 'uploads'),
('session_timeout_minutes', 'انتهاء صلاحية الجلسة', 'Session Timeout Minutes', '120', '120', 'integer', 'security');