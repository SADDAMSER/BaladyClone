-- =========================================================
-- إضافات للمخطط المحسن - منصة "بناء اليمن" الرقمية
-- Enhanced Schema Additions for Yemen Digital Platform
-- =========================================================

BEGIN;

-- =========================================================
-- Additional ENUM Types for Enhanced Features
-- =========================================================

DO $$ BEGIN
  CREATE TYPE notification_priority_enum AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attachment_verification_status AS ENUM ('pending','verified','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE digital_signature_status AS ENUM ('valid','invalid','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE survey_device_status AS ENUM ('active','maintenance','calibration','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- Enhanced Application Attachments System
-- =========================================================

DROP TABLE IF EXISTS application_attachments CASCADE;
CREATE TABLE application_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL,
  requirement_id UUID,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  verification_status attachment_verification_status DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMP,
  verification_notes TEXT,
  checksum VARCHAR(255),
  is_encrypted BOOLEAN DEFAULT FALSE,
  retention_date DATE
);

-- =========================================================
-- Advanced Workflow System
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
  sla_rules JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_by UUID,
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
  execution_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- Enhanced Notifications System
-- =========================================================

DROP TABLE IF EXISTS notification_templates CASCADE;
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(100) NOT NULL UNIQUE,
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  content_ar TEXT NOT NULL,
  content_en TEXT,
  variables JSONB,
  channel_types TEXT[] DEFAULT ARRAY['in_app'],
  priority notification_priority_enum DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS notification_queue CASCADE;
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL,
  template_id UUID,
  channel_type VARCHAR(20) NOT NULL,
  priority notification_priority_enum DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  data JSONB,
  scheduled_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  expires_at TIMESTAMP
);

-- =========================================================
-- Digital Signatures & Document Security
-- =========================================================

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
  geolocation JSONB,
  status digital_signature_status DEFAULT 'valid',
  verification_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID,
  revocation_reason TEXT
);

DROP TABLE IF EXISTS document_versions CASCADE;
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(255) NOT NULL,
  changes_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE
);

-- =========================================================
-- Advanced Survey Equipment & Data
-- =========================================================

DROP TABLE IF EXISTS survey_devices CASCADE;
CREATE TABLE survey_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_serial VARCHAR(100) UNIQUE NOT NULL,
  device_model VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  device_type VARCHAR(100), -- GNSS, Total_Station, Drone, etc.
  assigned_to_surveyor_id UUID,
  last_calibration_date DATE,
  calibration_certificate VARCHAR(500),
  accuracy_specification VARCHAR(100),
  status survey_device_status DEFAULT 'active',
  location_coordinates GEOMETRY(POINT, 4326),
  maintenance_schedule JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS raw_survey_data CASCADE;
CREATE TABLE raw_survey_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_request_id UUID NOT NULL,
  device_id UUID NOT NULL,
  session_id VARCHAR(100),
  point_sequence INTEGER NOT NULL,
  point_name VARCHAR(100),
  point_code VARCHAR(50),
  latitude DECIMAL(12,8) NOT NULL,
  longitude DECIMAL(12,8) NOT NULL,
  elevation DECIMAL(8,3),
  accuracy_horizontal DECIMAL(5,3),
  accuracy_vertical DECIMAL(5,3),
  point_type VARCHAR(50), -- corner, boundary, reference, control
  measurement_method VARCHAR(50), -- GNSS, traverse, intersection
  notes TEXT,
  quality_indicators JSONB,
  recorded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  is_validated BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS survey_calculations CASCADE;
CREATE TABLE survey_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_request_id UUID NOT NULL,
  calculation_type VARCHAR(100) NOT NULL, -- area, perimeter, coordinates, bearings
  input_points JSONB NOT NULL,
  calculation_method VARCHAR(100),
  result_value DECIMAL(15,6),
  result_unit VARCHAR(20),
  confidence_level DECIMAL(5,2),
  calculation_metadata JSONB,
  calculated_by UUID,
  calculated_at TIMESTAMP DEFAULT NOW(),
  verified_by UUID,
  verified_at TIMESTAMP,
  is_final BOOLEAN DEFAULT FALSE
);

-- =========================================================
-- Performance Metrics & Analytics
-- =========================================================

DROP TABLE IF EXISTS service_performance_metrics CASCADE;
CREATE TABLE service_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL,
  department_id UUID,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  measurement_unit VARCHAR(50),
  measurement_period_start DATE NOT NULL,
  measurement_period_end DATE NOT NULL,
  target_value DECIMAL(15,2),
  benchmark_value DECIMAL(15,2),
  trend_direction VARCHAR(20), -- improving, declining, stable
  additional_data JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  calculated_by UUID
);

DROP TABLE IF EXISTS user_activity_logs CASCADE;
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  geolocation JSONB,
  activity_details JSONB,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- System Integration & API Management
-- =========================================================

DROP TABLE IF EXISTS api_endpoints CASCADE;
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_name VARCHAR(255) NOT NULL,
  endpoint_path VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  service_id UUID,
  description TEXT,
  request_schema JSONB,
  response_schema JSONB,
  rate_limit_per_minute INTEGER DEFAULT 60,
  requires_authentication BOOLEAN DEFAULT TRUE,
  required_permissions TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20) DEFAULT '1.0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS api_usage_logs CASCADE;
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID NOT NULL,
  user_id UUID,
  request_id VARCHAR(100) UNIQUE,
  ip_address INET,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  response_size_bytes INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- Advanced System Configuration
-- =========================================================

DROP TABLE IF EXISTS feature_flags CASCADE;
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0,
  target_users JSONB,
  target_departments JSONB,
  environment VARCHAR(50) DEFAULT 'production',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS system_health_checks CASCADE;
CREATE TABLE system_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_name VARCHAR(100) NOT NULL,
  check_type VARCHAR(50) NOT NULL, -- database, api, service, storage
  target_resource VARCHAR(255),
  status VARCHAR(20) DEFAULT 'unknown', -- healthy, degraded, unhealthy
  response_time_ms INTEGER,
  error_message TEXT,
  additional_info JSONB,
  checked_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- Create Indexes for Performance
-- =========================================================

-- Performance indexes for frequently queried tables
CREATE INDEX IF NOT EXISTS idx_application_attachments_application_id ON application_attachments(application_id);
CREATE INDEX IF NOT EXISTS idx_application_attachments_uploaded_by ON application_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_application_attachments_verification_status ON application_attachments(verification_status);

CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient_id ON notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_delivery_status ON notification_queue(delivery_status);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_document_id ON digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer_id ON digital_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_status ON digital_signatures(status);

CREATE INDEX IF NOT EXISTS idx_raw_survey_data_survey_request_id ON raw_survey_data(survey_request_id);
CREATE INDEX IF NOT EXISTS idx_raw_survey_data_device_id ON raw_survey_data(device_id);
CREATE INDEX IF NOT EXISTS idx_raw_survey_data_recorded_at ON raw_survey_data(recorded_at);

CREATE INDEX IF NOT EXISTS idx_survey_calculations_survey_request_id ON survey_calculations(survey_request_id);
CREATE INDEX IF NOT EXISTS idx_survey_calculations_calculation_type ON survey_calculations(calculation_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint_id ON api_usage_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- GIN indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_steps_gin ON workflow_templates USING GIN (steps_configuration);
CREATE INDEX IF NOT EXISTS idx_business_rules_conditions_gin ON business_rules USING GIN (conditions);
CREATE INDEX IF NOT EXISTS idx_business_rules_actions_gin ON business_rules USING GIN (actions);
CREATE INDEX IF NOT EXISTS idx_notification_queue_data_gin ON notification_queue USING GIN (data);

-- Spatial indexes for geographic data
CREATE INDEX IF NOT EXISTS idx_survey_devices_location ON survey_devices USING GIST (location_coordinates);

COMMIT;

-- =========================================================
-- Initial Data for Enhanced Features
-- =========================================================

-- Insert default notification templates
INSERT INTO notification_templates (template_name, title_ar, title_en, content_ar, content_en, variables) VALUES
('application_submitted', 'تم تقديم الطلب بنجاح', 'Application Submitted Successfully', 
 'تم تقديم طلبكم رقم {{application_number}} بنجاح. سيتم مراجعته خلال {{estimated_days}} أيام عمل.', 
 'Your application #{{application_number}} has been submitted successfully. It will be reviewed within {{estimated_days}} business days.',
 '["application_number", "estimated_days"]'),

('application_approved', 'تمت الموافقة على الطلب', 'Application Approved', 
 'تمت الموافقة على طلبكم رقم {{application_number}}. يمكنكم تحميل الوثائق من الرابط المرفق.', 
 'Your application #{{application_number}} has been approved. You can download the documents from the attached link.',
 '["application_number", "download_link"]'),

('survey_scheduled', 'تم تحديد موعد المساحة', 'Survey Scheduled', 
 'تم تحديد موعد المساحة لطلبكم في تاريخ {{survey_date}} الساعة {{survey_time}}. المساح المعين: {{surveyor_name}}', 
 'Survey has been scheduled for your request on {{survey_date}} at {{survey_time}}. Assigned surveyor: {{surveyor_name}}',
 '["survey_date", "survey_time", "surveyor_name"]');

-- Insert default business rules
INSERT INTO business_rules (rule_name, rule_name_en, description, category, conditions, actions, priority) VALUES
('auto_approve_small_areas', 'الموافقة التلقائية للمساحات الصغيرة', 'موافقة تلقائية للأراضي أقل من 200 متر مربع', 'automation',
 '{"land_area": {"operator": "<=", "value": 200}, "zone_type": {"operator": "eq", "value": "residential"}}',
 '{"approve_automatically": true, "assign_to_role": "senior_reviewer", "send_notification": true}', 1),

('escalate_urgent_applications', 'تصعيد الطلبات العاجلة', 'تصعيد الطلبات العاجلة للمدير', 'escalation',
 '{"priority": {"operator": "eq", "value": "urgent"}, "days_pending": {"operator": ">", "value": 2}}',
 '{"escalate_to": "department_manager", "send_alert": true, "increase_priority": true}', 2);

-- Insert default feature flags
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage) VALUES
('enhanced_notifications', 'نظام الإشعارات المحسن مع قنوات متعددة', TRUE, 100),
('auto_workflow_assignment', 'تعيين المهام التلقائي في سير العمل', TRUE, 50),
('digital_signature_verification', 'التحقق من التوقيعات الرقمية', FALSE, 0),
('ai_document_classification', 'تصنيف المستندات بالذكاء الاصطناعي', FALSE, 10);

-- Insert default API endpoints
INSERT INTO api_endpoints (endpoint_name, endpoint_path, http_method, description, requires_authentication) VALUES
('Submit Application', '/api/applications', 'POST', 'تقديم طلب جديد للخدمات الحكومية', TRUE),
('Get Application Status', '/api/applications/{id}/status', 'GET', 'الاستعلام عن حالة الطلب', TRUE),
('Upload Document', '/api/applications/{id}/documents', 'POST', 'رفع مستند للطلب', TRUE),
('Public Services List', '/api/public/services', 'GET', 'قائمة الخدمات المتاحة للعامة', FALSE);