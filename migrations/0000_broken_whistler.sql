CREATE TABLE "application_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"assigned_to_id" uuid NOT NULL,
	"assigned_by_id" uuid NOT NULL,
	"assignment_type" text NOT NULL,
	"department_id" uuid,
	"stage" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"due_date" timestamp,
	"status" text DEFAULT 'pending',
	"notes" text,
	"assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "application_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"service_attachment_id" uuid,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"file_type" text,
	"uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" text DEFAULT 'uploaded',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "application_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"review_type" text NOT NULL,
	"decision" text NOT NULL,
	"comments" text,
	"review_data" jsonb,
	"attachments" jsonb,
	"is_required" boolean DEFAULT true,
	"reviewed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"previous_stage" text,
	"new_stage" text,
	"changed_by_id" uuid,
	"notes" text,
	"reason_code" text,
	"attachments" jsonb,
	"changed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_number" text NOT NULL,
	"service_id" uuid NOT NULL,
	"applicant_id" uuid NOT NULL,
	"status" text DEFAULT 'draft',
	"current_stage" text,
	"application_data" jsonb,
	"documents" jsonb,
	"assigned_to_id" uuid,
	"review_notes" text,
	"approval_date" timestamp,
	"completion_date" timestamp,
	"fees" numeric(10, 2),
	"is_paid" boolean DEFAULT false,
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"assigned_to_id" uuid NOT NULL,
	"scheduled_by_id" uuid NOT NULL,
	"appointment_date" timestamp NOT NULL,
	"appointment_time" text NOT NULL,
	"contact_phone" text,
	"contact_notes" text,
	"location" text,
	"status" text DEFAULT 'scheduled',
	"confirmation_status" text DEFAULT 'pending',
	"reminder_sent" boolean DEFAULT false,
	"citizen_confirmed" boolean DEFAULT false,
	"engineer_confirmed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"user_id" uuid,
	"session_id" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "contact_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"appointment_id" uuid,
	"attempted_by_id" uuid NOT NULL,
	"contact_method" text NOT NULL,
	"contact_details" text,
	"attempt_result" text NOT NULL,
	"notes" text,
	"next_attempt_date" timestamp,
	"attempt_count" integer DEFAULT 1,
	"is_successful" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"parent_department_id" uuid,
	"head_of_department_id" uuid,
	"organizational_level" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "dynamic_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"form_schema" jsonb NOT NULL,
	"validation_rules" jsonb,
	"ui_config" jsonb,
	"is_active" boolean DEFAULT true,
	"version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "field_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"engineer_id" uuid NOT NULL,
	"visit_date" timestamp NOT NULL,
	"visit_time" text,
	"status" text DEFAULT 'scheduled',
	"arrival_time" timestamp,
	"departure_time" timestamp,
	"gps_location" jsonb,
	"weather_conditions" text,
	"access_issues" text,
	"equipment_used" jsonb,
	"visit_notes" text,
	"requires_follow_up" boolean DEFAULT false,
	"follow_up_reason" text,
	"citizen_present" boolean DEFAULT false,
	"citizen_signature" text,
	"witness_info" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_type" text NOT NULL,
	"label" text NOT NULL,
	"label_en" text,
	"placeholder" text,
	"help_text" text,
	"validation" jsonb,
	"options" jsonb,
	"properties" jsonb,
	"is_required" boolean DEFAULT false,
	"is_visible" boolean DEFAULT true,
	"order_index" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "law_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"article_number" text NOT NULL,
	"article_text" text NOT NULL,
	"keywords" text,
	"penalties" text,
	"conditions" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "law_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_id" uuid NOT NULL,
	"parent_section_id" uuid,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 1,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "laws_regulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"type" text NOT NULL,
	"issue_date" text,
	"effective_date" text,
	"description" text,
	"status" text DEFAULT 'active',
	"version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"action_url" text,
	"priority" text DEFAULT 'medium',
	"is_read" boolean DEFAULT false,
	"is_action_required" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"structure_type" text NOT NULL,
	"hierarchy_levels" jsonb NOT NULL,
	"role_definitions" jsonb NOT NULL,
	"permission_matrix" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "payment_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"items" jsonb NOT NULL,
	"payment_method" text,
	"receipt_number" text,
	"cashier_notes" text,
	"issued_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"paid_at" timestamp,
	"qr_code" text,
	CONSTRAINT "payment_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"description" text,
	"department_id" uuid,
	"level" integer DEFAULT 1,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"report_type" text NOT NULL,
	"data_source" jsonb NOT NULL,
	"chart_config" jsonb,
	"filter_config" jsonb,
	"schedule_config" jsonb,
	"recipients" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "requirement_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"icon" text,
	"color" text,
	"order_index" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"specifications" jsonb,
	"minimum_standards" jsonb,
	"related_law_article_id" uuid,
	"is_conditional" boolean DEFAULT false,
	"conditions" jsonb,
	"priority" text DEFAULT 'medium',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_type" text,
	"is_required" boolean DEFAULT true,
	"max_file_size" integer,
	"order_index" integer DEFAULT 1,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_builder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"builder_data" jsonb NOT NULL,
	"form_config" jsonb,
	"workflow_config" jsonb,
	"organization_config" jsonb,
	"publication_status" text DEFAULT 'draft',
	"builder_id" uuid,
	"last_modified_by_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"icon" text,
	"color" text DEFAULT '#3b82f6',
	"target_audience" text[],
	"order_index" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"is_optional" boolean DEFAULT false,
	"conditions" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"category" text NOT NULL,
	"subcategory" text,
	"template_type" text NOT NULL,
	"template_data" jsonb NOT NULL,
	"icon" text,
	"tags" text[],
	"version" text DEFAULT '1.0',
	"is_public" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"rating" numeric(3, 2),
	"created_by_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"type" text NOT NULL,
	"category" text,
	"processing_time_estimate" integer,
	"fees" numeric(10, 2),
	"required_documents" jsonb,
	"workflow" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "survey_assignment_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"appointment_id" uuid,
	"assigned_to_id" uuid NOT NULL,
	"form_data" jsonb NOT NULL,
	"geo_reference_data" jsonb,
	"map_data" jsonb,
	"qr_code" text,
	"printed_at" timestamp,
	"signed_at" timestamp,
	"supervisor_signature" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "survey_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_result_id" uuid NOT NULL,
	"field_visit_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"engineer_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_path" text,
	"file_type" text,
	"file_size" integer,
	"thumbnail_path" text,
	"coordinates" jsonb,
	"capture_timestamp" timestamp,
	"device_info" jsonb,
	"tags" jsonb,
	"is_public" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT true,
	"approval_status" text DEFAULT 'pending',
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"rejection_reason" text,
	"version" integer DEFAULT 1,
	"parent_report_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "survey_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_visit_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"engineer_id" uuid NOT NULL,
	"land_area" numeric(10, 2),
	"boundaries" jsonb,
	"measurements" jsonb,
	"landmarks" jsonb,
	"neighboring_properties" jsonb,
	"access_roads" jsonb,
	"utilities" jsonb,
	"elevation_data" jsonb,
	"soil_type" text,
	"topography" text,
	"existing_structures" jsonb,
	"violations" jsonb,
	"recommendations" text,
	"survey_method" text,
	"accuracy_level" text,
	"reference_points" jsonb,
	"map_sheet" text,
	"coordinate_system" text,
	"completion_status" text DEFAULT 'in_progress',
	"quality_check_status" text DEFAULT 'pending',
	"review_notes" text,
	"approved_at" timestamp,
	"approved_by_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "surveying_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"decision_number" text NOT NULL,
	"plot_location" jsonb,
	"plot_area" numeric(10, 2),
	"boundaries" jsonb,
	"surveyor_id" uuid,
	"survey_date" timestamp,
	"shape_file_data" jsonb,
	"building_regulations" jsonb,
	"restrictions" jsonb,
	"status" text DEFAULT 'pending',
	"approved_by_id" uuid,
	"approval_date" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "surveying_decisions_decision_number_unique" UNIQUE("decision_number")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"description" text,
	"category" text,
	"is_public" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"application_id" uuid,
	"assigned_to_id" uuid NOT NULL,
	"assigned_by_id" uuid,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"national_id" text,
	"phone_number" text,
	"role" text DEFAULT 'citizen' NOT NULL,
	"department_id" uuid,
	"position_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"workflow_data" jsonb NOT NULL,
	"stages" jsonb NOT NULL,
	"transitions" jsonb NOT NULL,
	"business_rules" jsonb,
	"is_active" boolean DEFAULT true,
	"version" text DEFAULT '1.0',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_definition_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"current_stage" text NOT NULL,
	"status" text DEFAULT 'active',
	"stage_history" jsonb DEFAULT '[]',
	"variables" jsonb,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
