-- =========================================================
-- Foreign Keys and Relationships for Yemen Platform
-- مفاتيح الربط الخارجية والعلاقات لمنصة بناء اليمن
-- =========================================================

BEGIN;

-- =========================================================
-- Core System Foreign Keys
-- =========================================================

-- Users table relationships
ALTER TABLE users 
ADD CONSTRAINT fk_users_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD CONSTRAINT fk_users_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- User roles relationships
ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_role_id 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT fk_user_roles_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Role permissions relationships
ALTER TABLE role_permissions 
ADD CONSTRAINT fk_role_permissions_role_id 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_permissions 
ADD CONSTRAINT fk_role_permissions_permission_id 
FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

-- User sessions relationships
ALTER TABLE user_sessions 
ADD CONSTRAINT fk_user_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =========================================================
-- Organizational Structure Foreign Keys
-- =========================================================

-- Departments relationships
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_ministry_id 
FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE CASCADE;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_parent_department_id 
FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager_id 
FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Positions relationships
ALTER TABLE positions 
ADD CONSTRAINT fk_positions_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

-- Employees relationships
ALTER TABLE employees 
ADD CONSTRAINT fk_employees_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE employees 
ADD CONSTRAINT fk_employees_position_id 
FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE employees 
ADD CONSTRAINT fk_employees_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE employees 
ADD CONSTRAINT fk_employees_direct_manager_id 
FOREIGN KEY (direct_manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- =========================================================
-- Geographic Divisions Foreign Keys
-- =========================================================

-- Districts relationships
ALTER TABLE districts 
ADD CONSTRAINT fk_districts_governorate_id 
FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE CASCADE;

-- Neighborhoods relationships
ALTER TABLE neighborhoods 
ADD CONSTRAINT fk_neighborhoods_district_id 
FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE;

-- =========================================================
-- Government Services Foreign Keys
-- =========================================================

-- Service categories relationships
ALTER TABLE service_categories 
ADD CONSTRAINT fk_service_categories_parent_id 
FOREIGN KEY (parent_id) REFERENCES service_categories(id) ON DELETE SET NULL;

-- Government services relationships
ALTER TABLE government_services 
ADD CONSTRAINT fk_government_services_category_id 
FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT;

ALTER TABLE government_services 
ADD CONSTRAINT fk_government_services_ministry_id 
FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE RESTRICT;

ALTER TABLE government_services 
ADD CONSTRAINT fk_government_services_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE government_services 
ADD CONSTRAINT fk_government_services_workflow_template_id 
FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE SET NULL;

-- Service requirements relationships
ALTER TABLE service_requirements 
ADD CONSTRAINT fk_service_requirements_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE CASCADE;

-- =========================================================
-- Application Management Foreign Keys
-- =========================================================

-- Citizen applications relationships
ALTER TABLE citizen_applications 
ADD CONSTRAINT fk_citizen_applications_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE RESTRICT;

ALTER TABLE citizen_applications 
ADD CONSTRAINT fk_citizen_applications_applicant_id 
FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE citizen_applications 
ADD CONSTRAINT fk_citizen_applications_current_step_id 
FOREIGN KEY (current_step_id) REFERENCES application_workflow_steps(id) ON DELETE SET NULL;

-- Application workflow steps relationships
ALTER TABLE application_workflow_steps 
ADD CONSTRAINT fk_application_workflow_steps_application_id 
FOREIGN KEY (application_id) REFERENCES citizen_applications(id) ON DELETE CASCADE;

ALTER TABLE application_workflow_steps 
ADD CONSTRAINT fk_application_workflow_steps_assigned_to_user_id 
FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Application attachments relationships
ALTER TABLE application_attachments 
ADD CONSTRAINT fk_application_attachments_application_id 
FOREIGN KEY (application_id) REFERENCES citizen_applications(id) ON DELETE CASCADE;

ALTER TABLE application_attachments 
ADD CONSTRAINT fk_application_attachments_requirement_id 
FOREIGN KEY (requirement_id) REFERENCES service_requirements(id) ON DELETE SET NULL;

ALTER TABLE application_attachments 
ADD CONSTRAINT fk_application_attachments_uploaded_by 
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE application_attachments 
ADD CONSTRAINT fk_application_attachments_verified_by 
FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================
-- Workflow System Foreign Keys
-- =========================================================

-- Workflow templates relationships
ALTER TABLE workflow_templates 
ADD CONSTRAINT fk_workflow_templates_service_category_id 
FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE SET NULL;

ALTER TABLE workflow_templates 
ADD CONSTRAINT fk_workflow_templates_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Business rules relationships
ALTER TABLE business_rules 
ADD CONSTRAINT fk_business_rules_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE CASCADE;

ALTER TABLE business_rules 
ADD CONSTRAINT fk_business_rules_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================
-- Land Survey Foreign Keys
-- =========================================================

-- Land survey requests relationships
ALTER TABLE land_survey_requests 
ADD CONSTRAINT fk_land_survey_requests_application_id 
FOREIGN KEY (application_id) REFERENCES citizen_applications(id) ON DELETE CASCADE;

ALTER TABLE land_survey_requests 
ADD CONSTRAINT fk_land_survey_requests_surveyor_assigned_id 
FOREIGN KEY (surveyor_assigned_id) REFERENCES users(id) ON DELETE SET NULL;

-- Survey measurements relationships
ALTER TABLE survey_measurements 
ADD CONSTRAINT fk_survey_measurements_survey_request_id 
FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;

ALTER TABLE survey_measurements 
ADD CONSTRAINT fk_survey_measurements_measured_by 
FOREIGN KEY (measured_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Approved survey decisions relationships
ALTER TABLE approved_survey_decisions 
ADD CONSTRAINT fk_approved_survey_decisions_survey_request_id 
FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;

ALTER TABLE approved_survey_decisions 
ADD CONSTRAINT fk_approved_survey_decisions_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Survey devices relationships
ALTER TABLE survey_devices 
ADD CONSTRAINT fk_survey_devices_assigned_to_surveyor_id 
FOREIGN KEY (assigned_to_surveyor_id) REFERENCES users(id) ON DELETE SET NULL;

-- Raw survey data relationships
ALTER TABLE raw_survey_data 
ADD CONSTRAINT fk_raw_survey_data_survey_request_id 
FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;

ALTER TABLE raw_survey_data 
ADD CONSTRAINT fk_raw_survey_data_device_id 
FOREIGN KEY (device_id) REFERENCES survey_devices(id) ON DELETE RESTRICT;

-- Survey calculations relationships
ALTER TABLE survey_calculations 
ADD CONSTRAINT fk_survey_calculations_survey_request_id 
FOREIGN KEY (survey_request_id) REFERENCES land_survey_requests(id) ON DELETE CASCADE;

ALTER TABLE survey_calculations 
ADD CONSTRAINT fk_survey_calculations_calculated_by 
FOREIGN KEY (calculated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE survey_calculations 
ADD CONSTRAINT fk_survey_calculations_verified_by 
FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================
-- Notifications Foreign Keys
-- =========================================================

-- System notifications relationships
ALTER TABLE system_notifications 
ADD CONSTRAINT fk_system_notifications_recipient_id 
FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;

-- Notification channels relationships
ALTER TABLE notification_channels 
ADD CONSTRAINT fk_notification_channels_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Notification queue relationships
ALTER TABLE notification_queue 
ADD CONSTRAINT fk_notification_queue_recipient_id 
FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notification_queue 
ADD CONSTRAINT fk_notification_queue_template_id 
FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL;

-- Notification templates relationships
ALTER TABLE notification_templates 
ADD CONSTRAINT fk_notification_templates_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================
-- Document Management Foreign Keys
-- =========================================================

-- Document archives relationships
ALTER TABLE document_archives 
ADD CONSTRAINT fk_document_archives_related_application_id 
FOREIGN KEY (related_application_id) REFERENCES citizen_applications(id) ON DELETE SET NULL;

ALTER TABLE document_archives 
ADD CONSTRAINT fk_document_archives_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Digital signatures relationships
ALTER TABLE digital_signatures 
ADD CONSTRAINT fk_digital_signatures_document_id 
FOREIGN KEY (document_id) REFERENCES document_archives(id) ON DELETE CASCADE;

ALTER TABLE digital_signatures 
ADD CONSTRAINT fk_digital_signatures_signer_id 
FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE digital_signatures 
ADD CONSTRAINT fk_digital_signatures_revoked_by 
FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL;

-- Document versions relationships
ALTER TABLE document_versions 
ADD CONSTRAINT fk_document_versions_document_id 
FOREIGN KEY (document_id) REFERENCES document_archives(id) ON DELETE CASCADE;

ALTER TABLE document_versions 
ADD CONSTRAINT fk_document_versions_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- =========================================================
-- Reporting & Analytics Foreign Keys
-- =========================================================

-- System reports relationships
ALTER TABLE system_reports 
ADD CONSTRAINT fk_system_reports_generated_by 
FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Performance metrics relationships
ALTER TABLE performance_metrics 
ADD CONSTRAINT fk_performance_metrics_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE performance_metrics 
ADD CONSTRAINT fk_performance_metrics_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE SET NULL;

-- Service performance metrics relationships
ALTER TABLE service_performance_metrics 
ADD CONSTRAINT fk_service_performance_metrics_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE CASCADE;

ALTER TABLE service_performance_metrics 
ADD CONSTRAINT fk_service_performance_metrics_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE service_performance_metrics 
ADD CONSTRAINT fk_service_performance_metrics_calculated_by 
FOREIGN KEY (calculated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Audit logs relationships
ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_session_id 
FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;

-- User activity logs relationships
ALTER TABLE user_activity_logs 
ADD CONSTRAINT fk_user_activity_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =========================================================
-- API Management Foreign Keys
-- =========================================================

-- API endpoints relationships
ALTER TABLE api_endpoints 
ADD CONSTRAINT fk_api_endpoints_service_id 
FOREIGN KEY (service_id) REFERENCES government_services(id) ON DELETE SET NULL;

-- API usage logs relationships
ALTER TABLE api_usage_logs 
ADD CONSTRAINT fk_api_usage_logs_endpoint_id 
FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(id) ON DELETE CASCADE;

ALTER TABLE api_usage_logs 
ADD CONSTRAINT fk_api_usage_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================
-- System Configuration Foreign Keys
-- =========================================================

-- System settings relationships
ALTER TABLE system_settings 
ADD CONSTRAINT fk_system_settings_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Feature flags relationships
ALTER TABLE feature_flags 
ADD CONSTRAINT fk_feature_flags_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE feature_flags 
ADD CONSTRAINT fk_feature_flags_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;

-- =========================================================
-- Performance Optimization Indexes
-- =========================================================

-- Critical performance indexes for most used queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citizen_applications_applicant_id ON citizen_applications(applicant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citizen_applications_service_id ON citizen_applications(service_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citizen_applications_status ON citizen_applications(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citizen_applications_submitted_at ON citizen_applications(submitted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_government_services_category_id ON government_services(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_government_services_ministry_id ON government_services(ministry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_government_services_is_active ON government_services(is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_land_survey_requests_application_id ON land_survey_requests(application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_land_survey_requests_surveyor_assigned_id ON land_survey_requests(surveyor_assigned_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_land_survey_requests_status ON land_survey_requests(status);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_service ON citizen_applications(status, service_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_applicant_status ON citizen_applications(applicant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_recipient_read ON system_notifications(recipient_id, is_read);

-- Text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_government_services_name_search ON government_services USING GIN (to_tsvector('arabic', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ministries_name_search ON ministries USING GIN (to_tsvector('arabic', name));

-- Date range indexes for reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_measurement_date ON performance_metrics(measurement_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);