CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"neighborhood_unit_id" uuid NOT NULL,
	"block_type" text DEFAULT 'residential',
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "change_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"change_version" text NOT NULL,
	"change_sequence" text NOT NULL,
	"operation_type" text NOT NULL,
	"changed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"changed_by_id" uuid,
	"change_source" text DEFAULT 'web_app',
	"field_changes" jsonb,
	"record_snapshot" jsonb,
	"record_hash" text,
	"device_id" text,
	"session_id" uuid,
	"client_change_id" text,
	"governorate_id" uuid,
	"district_id" uuid,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"synced_at" timestamp,
	"sync_attempts" integer DEFAULT 0,
	"change_metadata" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "deletion_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"deleted_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_by_id" uuid,
	"deletion_reason" text,
	"deletion_type" text DEFAULT 'soft' NOT NULL,
	"original_data" jsonb,
	"record_hash" text,
	"sync_version" text DEFAULT '1' NOT NULL,
	"device_id" text,
	"session_id" uuid,
	"governorate_id" uuid,
	"district_id" uuid,
	"propagation_status" text DEFAULT 'pending' NOT NULL,
	"propagated_at" timestamp,
	"propagation_attempts" integer DEFAULT 0,
	"max_propagation_attempts" integer DEFAULT 3,
	"expires_at" timestamp,
	"deletion_metadata" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "device_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" text NOT NULL,
	"device_type" text DEFAULT 'mobile',
	"platform" text NOT NULL,
	"app_version" text NOT NULL,
	"last_sync" timestamp,
	"is_active" boolean DEFAULT true,
	"properties" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "device_registrations_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"governorate_id" uuid NOT NULL,
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "error_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_id" text NOT NULL,
	"error_hash" text NOT NULL,
	"error_type" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"error_code" text,
	"component" text,
	"user_id" uuid,
	"session_id" text,
	"device_id" text,
	"user_agent" text,
	"request_id" text,
	"endpoint" text,
	"method" text,
	"request_payload" jsonb,
	"response_status" integer,
	"environment" text DEFAULT 'production' NOT NULL,
	"version" text,
	"build_number" text,
	"browser_name" text,
	"browser_version" text,
	"os_name" text,
	"os_version" text,
	"device_type" text,
	"memory_usage" numeric(10, 2),
	"cpu_usage" numeric(5, 2),
	"network_latency" integer,
	"load_time" integer,
	"governorate_id" uuid,
	"district_id" uuid,
	"ip_location" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to_id" uuid,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"occurrence_count" integer DEFAULT 1,
	"first_occurrence" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_occurrence" timestamp DEFAULT CURRENT_TIMESTAMP,
	"affected_users" integer DEFAULT 1,
	"business_impact" text,
	"tags" text[],
	"custom_attributes" jsonb,
	"related_error_ids" text[],
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "geographic_role_template_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"permission_type" text DEFAULT 'additional' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "geographic_role_template_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "geographic_role_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" text NOT NULL,
	"template_name_en" text,
	"description" text,
	"geographic_level" text NOT NULL,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"template_type" text NOT NULL,
	"auto_assign" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT true,
	"max_active_users" integer,
	"current_active_users" integer DEFAULT 0,
	"valid_from" timestamp DEFAULT CURRENT_TIMESTAMP,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "harat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"neighborhood_id" uuid NOT NULL,
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "lbac_access_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"target_governorate_id" uuid,
	"target_district_id" uuid,
	"target_sub_district_id" uuid,
	"target_neighborhood_id" uuid,
	"access_granted" boolean NOT NULL,
	"denial_reason" text,
	"request_method" text,
	"request_path" text,
	"user_agent" text,
	"ip_address" text,
	"session_id" text,
	"processing_time_ms" integer,
	"cache_hit" boolean,
	"delegation_used" boolean DEFAULT false,
	"delegation_id" uuid,
	"additional_context" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "mobile_device_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" text NOT NULL,
	"device_model" text,
	"os_version" text,
	"app_version" text,
	"device_type" text DEFAULT 'mobile' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"refresh_token_hash" text,
	"refresh_token_expires_at" timestamp,
	"token_version" integer DEFAULT 1,
	"registration_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_seen_at" timestamp,
	"last_sync_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "mobile_device_registrations_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "mobile_field_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"surveyor_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"start_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"movement_path" jsonb,
	"start_location" jsonb,
	"end_location" jsonb,
	"total_distance" numeric(10, 3),
	"coverage_area" numeric(12, 3),
	"visit_purpose" text NOT NULL,
	"visit_status" text DEFAULT 'active' NOT NULL,
	"quality_score" numeric(5, 2),
	"notes" text,
	"weather_conditions" text,
	"is_synced" boolean DEFAULT false,
	"synced_at" timestamp,
	"sync_version" integer DEFAULT 1,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "mobile_field_visits_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "mobile_survey_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"related_point_id" uuid,
	"related_geometry_id" uuid,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" text,
	"storage_url" text,
	"capture_location" jsonb,
	"capture_direction" numeric(6, 2),
	"image_width" integer,
	"image_height" integer,
	"exif_data" jsonb,
	"attachment_type" text NOT NULL,
	"description" text,
	"tags" jsonb,
	"captured_at" timestamp NOT NULL,
	"is_uploaded" boolean DEFAULT false,
	"uploaded_at" timestamp,
	"is_synced" boolean DEFAULT false,
	"synced_at" timestamp,
	"upload_retry_count" integer DEFAULT 0,
	"is_validated" boolean DEFAULT false,
	"validation_results" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "mobile_survey_geometries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"geometry_number" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"geometry_type" text NOT NULL,
	"coordinates" jsonb NOT NULL,
	"properties" jsonb,
	"crs" text DEFAULT 'EPSG:4326',
	"feature_type" text NOT NULL,
	"feature_code" text,
	"description" text,
	"area" numeric(12, 3),
	"perimeter" numeric(10, 3),
	"length" numeric(10, 3),
	"centroid" jsonb,
	"is_complete" boolean DEFAULT false,
	"is_closed" boolean DEFAULT false,
	"quality_score" numeric(5, 2),
	"validation_flags" jsonb,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"completed_at" timestamp,
	"is_synced" boolean DEFAULT false,
	"synced_at" timestamp,
	"sync_version" integer DEFAULT 1,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "mobile_survey_geometries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "mobile_survey_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"point_number" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"elevation" numeric(8, 3),
	"horizontal_accuracy" numeric(6, 2),
	"vertical_accuracy" numeric(6, 2),
	"gps_source" text DEFAULT 'device',
	"point_type" text NOT NULL,
	"feature_code" text,
	"description" text,
	"captured_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_verified" boolean DEFAULT false,
	"needs_review" boolean DEFAULT false,
	"quality_flags" jsonb,
	"is_synced" boolean DEFAULT false,
	"synced_at" timestamp,
	"sync_version" integer DEFAULT 1,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "mobile_survey_points_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "mobile_survey_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"field_visit_id" uuid,
	"surveyor_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"session_number" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"survey_type" text NOT NULL,
	"start_time" timestamp DEFAULT CURRENT_TIMESTAMP,
	"end_time" timestamp,
	"paused_duration" integer DEFAULT 0,
	"start_location" jsonb,
	"end_location" jsonb,
	"weather_conditions" text,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"points_count" integer DEFAULT 0,
	"geometries_count" integer DEFAULT 0,
	"attachments_count" integer DEFAULT 0,
	"quality_score" numeric(5, 2),
	"last_synced_at" timestamp,
	"sync_version" integer DEFAULT 1,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"notes" text,
	"client_metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "mobile_survey_sessions_session_number_unique" UNIQUE("session_number"),
	CONSTRAINT "mobile_survey_sessions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "mobile_sync_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"last_sync_timestamp" timestamp NOT NULL,
	"last_sync_cursor" text NOT NULL,
	"sync_direction" text NOT NULL,
	"records_count" integer DEFAULT 0,
	"conflicts_count" integer DEFAULT 0,
	"errors_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"last_successful_sync" timestamp,
	"next_scheduled_sync" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "neighborhood_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"neighborhood_id" uuid,
	"sector_id" uuid,
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"sub_district_id" uuid NOT NULL,
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "offline_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"operation_data" jsonb NOT NULL,
	"timestamp" timestamp NOT NULL,
	"sync_status" text DEFAULT 'pending',
	"conflict_resolution" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" text NOT NULL,
	"metric_type" text NOT NULL,
	"metric_category" text NOT NULL,
	"value" numeric(15, 6) NOT NULL,
	"unit" text NOT NULL,
	"tags" jsonb,
	"user_id" uuid,
	"session_id" text,
	"device_id" text,
	"user_agent" text,
	"request_id" text,
	"endpoint" text,
	"method" text,
	"status_code" integer,
	"governorate_id" uuid,
	"district_id" uuid,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processing_started" timestamp,
	"processing_completed" timestamp,
	"metadata" jsonb,
	"error_details" jsonb,
	"aggregation_period" text,
	"aggregation_timestamp" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "permission_geographic_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_id" uuid NOT NULL,
	"constraint_level" text NOT NULL,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"block_id" uuid,
	"plot_id" uuid,
	"constraint_type" text DEFAULT 'inclusive' NOT NULL,
	"priority" integer DEFAULT 100,
	"conditions" jsonb,
	"is_active" boolean DEFAULT true,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"scope" text DEFAULT 'own',
	"is_system_permission" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"block_id" uuid NOT NULL,
	"plot_number" text NOT NULL,
	"area" numeric(12, 2),
	"plot_type" text DEFAULT 'residential',
	"ownership_type" text DEFAULT 'private',
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"granted_by" uuid,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description" text,
	"level" integer DEFAULT 1 NOT NULL,
	"is_system_role" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"sub_district_id" uuid NOT NULL,
	"sector_type" text DEFAULT 'planning',
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "slo_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slo_name" text NOT NULL,
	"slo_type" text NOT NULL,
	"service" text NOT NULL,
	"measurement_period" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"target_value" numeric(10, 4) NOT NULL,
	"actual_value" numeric(10, 4) NOT NULL,
	"target_unit" text NOT NULL,
	"is_compliant" boolean NOT NULL,
	"compliance_percentage" numeric(5, 2),
	"violation_count" integer DEFAULT 0,
	"violation_duration" integer,
	"error_budget" numeric(10, 4),
	"error_budget_consumed" numeric(10, 4),
	"error_budget_remaining" numeric(10, 4),
	"performance_tier" text,
	"trend_direction" text,
	"total_requests" integer,
	"successful_requests" integer,
	"failed_requests" integer,
	"average_response_time" numeric(10, 3),
	"p50_response_time" numeric(10, 3),
	"p95_response_time" numeric(10, 3),
	"p99_response_time" numeric(10, 3),
	"governorate_id" uuid,
	"district_id" uuid,
	"alert_threshold" numeric(10, 4),
	"critical_threshold" numeric(10, 4),
	"alerts_triggered" integer DEFAULT 0,
	"reporting_period" text,
	"next_measurement" timestamp,
	"tags" text[],
	"metadata" jsonb,
	"archived_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "street_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"street_id" uuid NOT NULL,
	"segment_number" integer NOT NULL,
	"start_point" jsonb,
	"end_point" jsonb,
	"length" numeric(10, 2),
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "streets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"street_type" text DEFAULT 'local',
	"width" numeric(8, 2),
	"length" numeric(12, 2),
	"surface_type" text DEFAULT 'asphalt',
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sub_districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"district_id" uuid NOT NULL,
	"geometry" jsonb,
	"properties" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_session_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"field_name" text,
	"server_value" jsonb,
	"client_value" jsonb,
	"conflict_type" text NOT NULL,
	"resolution_strategy" text,
	"resolved_value" jsonb,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sync_operations_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_type" text NOT NULL,
	"operation_id" text NOT NULL,
	"batch_id" text,
	"table_name" text,
	"record_count" integer DEFAULT 0,
	"data_size" integer,
	"duration" integer,
	"retry_count" integer DEFAULT 0,
	"priority" text,
	"status" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"user_id" uuid,
	"device_id" text NOT NULL,
	"session_id" uuid,
	"connection_type" text,
	"network_latency" integer,
	"bandwidth" numeric(10, 2),
	"sync_strategy" text,
	"conflict_resolution_strategy" text,
	"conflicts_detected" integer DEFAULT 0,
	"conflicts_resolved" integer DEFAULT 0,
	"governorate_id" uuid,
	"district_id" uuid,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp,
	"queued_at" timestamp,
	"processing_started_at" timestamp,
	"expected_duration" integer,
	"performance_rating" text,
	"operation_metadata" jsonb,
	"client_version" text,
	"server_version" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sync_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" text NOT NULL,
	"status" text DEFAULT 'in_progress',
	"start_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"end_time" timestamp,
	"total_operations" integer DEFAULT 0,
	"successful_operations" integer DEFAULT 0,
	"failed_operations" integer DEFAULT 0,
	"conflict_operations" integer DEFAULT 0,
	"last_sync_timestamp" timestamp,
	"error_log" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "temporary_permission_delegation_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegation_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "temporary_permission_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"delegation_type" text NOT NULL,
	"delegate_all_permissions" boolean DEFAULT false,
	"start_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"end_date" timestamp NOT NULL,
	"max_usage_count" integer,
	"current_usage_count" integer DEFAULT 0,
	"reason" text NOT NULL,
	"authorized_by_id" uuid,
	"approval_required" boolean DEFAULT true,
	"approved_by_id" uuid,
	"approval_date" timestamp,
	"status" text DEFAULT 'pending',
	"is_active" boolean DEFAULT false,
	"revoked_by_id" uuid,
	"revoked_date" timestamp,
	"revoke_reason" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_geographic_assignment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_assignment_id" uuid,
	"user_id" uuid NOT NULL,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"change_type" text NOT NULL,
	"change_reason" text,
	"previous_values" jsonb,
	"new_values" jsonb,
	"changed_by_id" uuid NOT NULL,
	"change_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"effective_date" timestamp,
	"approval_required" boolean DEFAULT false,
	"approved_by_id" uuid,
	"approval_date" timestamp,
	"notes" text,
	"system_generated" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "user_geographic_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"governorate_id" uuid,
	"district_id" uuid,
	"sub_district_id" uuid,
	"neighborhood_id" uuid,
	"assignment_type" text DEFAULT 'permanent' NOT NULL,
	"start_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"end_date" timestamp,
	"assigned_by_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"assigned_by" uuid,
	"valid_from" timestamp DEFAULT CURRENT_TIMESTAMP,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_neighborhood_unit_id_neighborhood_units_id_fk" FOREIGN KEY ("neighborhood_unit_id") REFERENCES "public"."neighborhood_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_tracking" ADD CONSTRAINT "change_tracking_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_tracking" ADD CONSTRAINT "change_tracking_session_id_sync_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sync_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_tracking" ADD CONSTRAINT "change_tracking_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_tracking" ADD CONSTRAINT "change_tracking_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_session_id_sync_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sync_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_tracking" ADD CONSTRAINT "error_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_tracking" ADD CONSTRAINT "error_tracking_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_tracking" ADD CONSTRAINT "error_tracking_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_tracking" ADD CONSTRAINT "error_tracking_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_template_permissions" ADD CONSTRAINT "geographic_role_template_permissions_template_id_geographic_role_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."geographic_role_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_template_permissions" ADD CONSTRAINT "geographic_role_template_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_template_roles" ADD CONSTRAINT "geographic_role_template_roles_template_id_geographic_role_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."geographic_role_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_template_roles" ADD CONSTRAINT "geographic_role_template_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_templates" ADD CONSTRAINT "geographic_role_templates_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_templates" ADD CONSTRAINT "geographic_role_templates_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_templates" ADD CONSTRAINT "geographic_role_templates_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_templates" ADD CONSTRAINT "geographic_role_templates_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geographic_role_templates" ADD CONSTRAINT "geographic_role_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harat" ADD CONSTRAINT "harat_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_target_governorate_id_governorates_id_fk" FOREIGN KEY ("target_governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_target_district_id_districts_id_fk" FOREIGN KEY ("target_district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_target_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("target_sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_target_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("target_neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lbac_access_audit_log" ADD CONSTRAINT "lbac_access_audit_log_delegation_id_temporary_permission_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."temporary_permission_delegations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_device_registrations" ADD CONSTRAINT "mobile_device_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_field_visits" ADD CONSTRAINT "mobile_field_visits_session_id_mobile_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mobile_survey_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_field_visits" ADD CONSTRAINT "mobile_field_visits_surveyor_id_users_id_fk" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_field_visits" ADD CONSTRAINT "mobile_field_visits_device_id_mobile_device_registrations_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."mobile_device_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_attachments" ADD CONSTRAINT "mobile_survey_attachments_session_id_mobile_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mobile_survey_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_attachments" ADD CONSTRAINT "mobile_survey_attachments_related_point_id_mobile_survey_points_id_fk" FOREIGN KEY ("related_point_id") REFERENCES "public"."mobile_survey_points"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_attachments" ADD CONSTRAINT "mobile_survey_attachments_related_geometry_id_mobile_survey_geometries_id_fk" FOREIGN KEY ("related_geometry_id") REFERENCES "public"."mobile_survey_geometries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_geometries" ADD CONSTRAINT "mobile_survey_geometries_session_id_mobile_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mobile_survey_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_points" ADD CONSTRAINT "mobile_survey_points_session_id_mobile_survey_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mobile_survey_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_field_visit_id_field_visits_id_fk" FOREIGN KEY ("field_visit_id") REFERENCES "public"."field_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_surveyor_id_users_id_fk" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_device_id_mobile_device_registrations_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."mobile_device_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_survey_sessions" ADD CONSTRAINT "mobile_survey_sessions_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_sync_cursors" ADD CONSTRAINT "mobile_sync_cursors_device_id_mobile_device_registrations_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."mobile_device_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neighborhood_units" ADD CONSTRAINT "neighborhood_units_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neighborhood_units" ADD CONSTRAINT "neighborhood_units_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_operations" ADD CONSTRAINT "offline_operations_device_id_device_registrations_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_operations" ADD CONSTRAINT "offline_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_geographic_constraints" ADD CONSTRAINT "permission_geographic_constraints_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slo_measurements" ADD CONSTRAINT "slo_measurements_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slo_measurements" ADD CONSTRAINT "slo_measurements_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "street_segments" ADD CONSTRAINT "street_segments_street_id_streets_id_fk" FOREIGN KEY ("street_id") REFERENCES "public"."streets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_districts" ADD CONSTRAINT "sub_districts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_sync_session_id_sync_sessions_id_fk" FOREIGN KEY ("sync_session_id") REFERENCES "public"."sync_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations_metrics" ADD CONSTRAINT "sync_operations_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations_metrics" ADD CONSTRAINT "sync_operations_metrics_session_id_sync_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sync_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations_metrics" ADD CONSTRAINT "sync_operations_metrics_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations_metrics" ADD CONSTRAINT "sync_operations_metrics_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_sessions" ADD CONSTRAINT "sync_sessions_device_id_device_registrations_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_sessions" ADD CONSTRAINT "sync_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegation_permissions" ADD CONSTRAINT "temporary_permission_delegation_permissions_delegation_id_temporary_permission_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."temporary_permission_delegations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegation_permissions" ADD CONSTRAINT "temporary_permission_delegation_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_authorized_by_id_users_id_fk" FOREIGN KEY ("authorized_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_permission_delegations" ADD CONSTRAINT "temporary_permission_delegations_revoked_by_id_users_id_fk" FOREIGN KEY ("revoked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_original_assignment_id_user_geographic_assignments_id_fk" FOREIGN KEY ("original_assignment_id") REFERENCES "public"."user_geographic_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignment_history" ADD CONSTRAINT "user_geographic_assignment_history_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_sub_district_id_sub_districts_id_fk" FOREIGN KEY ("sub_district_id") REFERENCES "public"."sub_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_geographic_assignments" ADD CONSTRAINT "user_geographic_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mobile_devices_updated_at" ON "mobile_device_registrations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_mobile_devices_active" ON "mobile_device_registrations" USING btree ("user_id","status","is_active") WHERE NOT "mobile_device_registrations"."is_deleted";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_active_device_per_user" ON "mobile_device_registrations" USING btree ("user_id") WHERE "mobile_device_registrations"."is_active" = true AND "mobile_device_registrations"."status" = 'active' AND "mobile_device_registrations"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "idx_field_visits_session" ON "mobile_field_visits" USING btree ("session_id") WHERE NOT "mobile_field_visits"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_field_visits_surveyor" ON "mobile_field_visits" USING btree ("surveyor_id","visit_status") WHERE NOT "mobile_field_visits"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_field_visits_updated_at" ON "mobile_field_visits" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_field_visits_sync_status" ON "mobile_field_visits" USING btree ("is_synced","updated_at") WHERE NOT "mobile_field_visits"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_geometries_session" ON "mobile_survey_geometries" USING btree ("session_id","geometry_number") WHERE NOT "mobile_survey_geometries"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_geometries_updated_at" ON "mobile_survey_geometries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_geometries_sync_status" ON "mobile_survey_geometries" USING btree ("is_synced","updated_at") WHERE NOT "mobile_survey_geometries"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_geometries_feature_type" ON "mobile_survey_geometries" USING btree ("feature_type") WHERE NOT "mobile_survey_geometries"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_points_session" ON "mobile_survey_points" USING btree ("session_id","point_number") WHERE NOT "mobile_survey_points"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_points_updated_at" ON "mobile_survey_points" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_points_sync_status" ON "mobile_survey_points" USING btree ("is_synced","updated_at") WHERE NOT "mobile_survey_points"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_points_geospatial" ON "mobile_survey_points" USING btree ("latitude","longitude") WHERE NOT "mobile_survey_points"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_sessions_application" ON "mobile_survey_sessions" USING btree ("application_id") WHERE NOT "mobile_survey_sessions"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_sessions_surveyor" ON "mobile_survey_sessions" USING btree ("surveyor_id","status") WHERE NOT "mobile_survey_sessions"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_sessions_updated_at" ON "mobile_survey_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_sync_status" ON "mobile_survey_sessions" USING btree ("last_synced_at","updated_at") WHERE NOT "mobile_survey_sessions"."is_deleted";--> statement-breakpoint
CREATE INDEX "idx_sessions_geographic" ON "mobile_survey_sessions" USING btree ("governorate_id","district_id","sub_district_id","neighborhood_id") WHERE NOT "mobile_survey_sessions"."is_deleted";