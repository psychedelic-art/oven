CREATE TABLE "event_wirings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_module" varchar(64) NOT NULL,
	"source_event" varchar(128) NOT NULL,
	"target_module" varchar(64) NOT NULL,
	"target_action" varchar(128) NOT NULL,
	"transform" jsonb,
	"condition" jsonb,
	"label" varchar(128),
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" integer NOT NULL,
	"chunk_x" integer NOT NULL,
	"chunk_y" integer NOT NULL,
	"layer_data" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"world_config_id" integer,
	"mode" varchar(20) DEFAULT 'discovery' NOT NULL,
	"seed" integer,
	"bounds" jsonb,
	"bounds_min_x" integer,
	"bounds_min_y" integer,
	"bounds_max_x" integer,
	"bounds_max_y" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tile_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tile_id" smallint NOT NULL,
	"name" varchar(64) NOT NULL,
	"color_hex" varchar(9) NOT NULL,
	"flags" smallint DEFAULT 0 NOT NULL,
	"category" varchar(32) DEFAULT 'terrain' NOT NULL,
	"sprite_path" varchar(256),
	"tileset_id" integer,
	"sprite_x" integer,
	"sprite_y" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tile_definitions_tile_id_unique" UNIQUE("tile_id")
);
--> statement-breakpoint
CREATE TABLE "tilesets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"image_path" varchar(512),
	"tile_width" integer DEFAULT 16 NOT NULL,
	"tile_height" integer DEFAULT 16 NOT NULL,
	"columns" integer,
	"rows" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tilesets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "world_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"chunk_size" integer DEFAULT 32 NOT NULL,
	"load_radius" integer DEFAULT 2 NOT NULL,
	"max_loads_per_frame" integer DEFAULT 2 NOT NULL,
	"tilemap_pool_size" integer DEFAULT 30 NOT NULL,
	"terrain_noise_scale" real DEFAULT 0.05 NOT NULL,
	"terrain_noise_offset" real DEFAULT 1000 NOT NULL,
	"decoration_noise_scale" real DEFAULT 0.15 NOT NULL,
	"decoration_noise_threshold" real DEFAULT 0.78 NOT NULL,
	"biome_thresholds" jsonb DEFAULT '{"water":0.3,"dirt":0.45,"grass":0.75}'::jsonb NOT NULL,
	"player_move_speed" real DEFAULT 5 NOT NULL,
	"player_color" jsonb DEFAULT '{"r":1,"g":0.8,"b":0.2,"a":1}'::jsonb NOT NULL,
	"camera_ortho_size" real DEFAULT 8 NOT NULL,
	"camera_smooth_speed" real DEFAULT 10 NOT NULL,
	"camera_bg_color" jsonb DEFAULT '{"r":0.051,"g":0.106,"b":0.165}'::jsonb NOT NULL,
	"direction_bias" real DEFAULT -0.5 NOT NULL,
	"map_mode" varchar(20) DEFAULT 'discovery' NOT NULL,
	"seed" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "world_configs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"total_play_time_seconds" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "player_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"map_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"start_tile_x" integer,
	"start_tile_y" integer,
	"end_tile_x" integer,
	"end_tile_y" integer,
	"tiles_traveled" integer DEFAULT 0 NOT NULL,
	"chunks_loaded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_map_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"map_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"spawn_tile_x" integer DEFAULT 0 NOT NULL,
	"spawn_tile_y" integer DEFAULT 0 NOT NULL,
	"current_tile_x" integer,
	"current_tile_y" integer,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "player_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"map_id" integer NOT NULL,
	"tile_x" integer NOT NULL,
	"tile_y" integer NOT NULL,
	"chunk_x" integer NOT NULL,
	"chunk_y" integer NOT NULL,
	"world_x" real NOT NULL,
	"world_y" real NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_visited_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"map_id" integer NOT NULL,
	"chunk_x" integer NOT NULL,
	"chunk_y" integer NOT NULL,
	"first_visited_at" timestamp DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"module_name" varchar(64) NOT NULL,
	"scope" varchar(32) DEFAULT 'module' NOT NULL,
	"scope_id" varchar(128),
	"key" varchar(128) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"node_id" varchar(128) NOT NULL,
	"node_type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"trigger_event" varchar(128),
	"trigger_payload" jsonb,
	"context" jsonb,
	"snapshot_json" jsonb,
	"current_state" varchar(128) DEFAULT 'initial' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wv_unique" UNIQUE("workflow_id","version")
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"trigger_event" varchar(128),
	"trigger_condition" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "api_endpoint_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" varchar(64) NOT NULL,
	"route" varchar(256) NOT NULL,
	"method" varchar(16) NOT NULL,
	"permission_id" integer,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_endpoint_permissions_unique" UNIQUE("module","route","method")
);
--> statement-breakpoint
CREATE TABLE "hierarchy_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(64) DEFAULT 'group' NOT NULL,
	"parent_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hierarchy_nodes_name_parent_unique" UNIQUE("name","parent_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource" varchar(128) NOT NULL,
	"action" varchar(64) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "permissions_resource_action_unique" UNIQUE("resource","action")
);
--> statement-breakpoint
CREATE TABLE "rls_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"target_table" varchar(128) NOT NULL,
	"command" varchar(16) DEFAULT 'ALL' NOT NULL,
	"definition" jsonb NOT NULL,
	"compiled_sql" text,
	"role_id" integer,
	"hierarchy_node_id" integer,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rls_policies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rls_policy_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"compiled_sql" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rls_pv_unique" UNIQUE("policy_id","version")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"hierarchy_node_id" integer,
	"is_system" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tm_tenant_user" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_billing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"price" integer,
	"currency" varchar(10) DEFAULT 'COP',
	"billing_cycle" varchar(32) DEFAULT 'monthly',
	"features" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_billing_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_plan_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quota" integer NOT NULL,
	"period" varchar(32) DEFAULT 'monthly' NOT NULL,
	"price_per_unit" integer,
	"currency" varchar(10) DEFAULT 'COP',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_pq_unique" UNIQUE("plan_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "sub_provider_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"cost_per_unit" integer,
	"currency" varchar(10) DEFAULT 'USD',
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config_schema" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_ps_unique" UNIQUE("provider_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "sub_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"website" varchar(500),
	"logo" varchar(500),
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"icon" varchar(64),
	"order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"unit" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_quota_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quota" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_qo_unique" UNIQUE("subscription_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "sub_tenant_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"trial_ends_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"subscription_id" integer,
	"service_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"unit" varchar(64) NOT NULL,
	"billing_cycle" varchar(32),
	"upstream_cost_cents" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"tenant_id" integer,
	"user_id" integer,
	"permissions" jsonb,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"avatar" varchar(500),
	"default_tenant_id" integer,
	"status" varchar(50) DEFAULT 'active',
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "form_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"definition" jsonb,
	"default_props" jsonb,
	"data_contract" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fc_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "form_data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"form_id" integer,
	"type" varchar(50) NOT NULL,
	"config" jsonb,
	"output_schema" jsonb,
	"caching_policy" varchar(50) DEFAULT 'none',
	"ttl_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"form_version" integer,
	"data" jsonb,
	"submitted_by" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb,
	"data_layer_config" jsonb,
	"business_layer_config" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fv_unique" UNIQUE("form_id","version")
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"definition" jsonb,
	"data_layer_config" jsonb,
	"business_layer_config" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forms_tenant_slug_unique" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "flow_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_item_id" integer NOT NULL,
	"stage_id" integer,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" varchar(50) DEFAULT 'comment' NOT NULL,
	"parent_id" integer,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"flow_id" integer NOT NULL,
	"current_stage_id" integer,
	"content_type" varchar(100) NOT NULL,
	"content_id" integer,
	"content_snapshot" jsonb,
	"metadata" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"assigned_to" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_item_id" integer NOT NULL,
	"stage_id" integer,
	"reviewer_id" integer NOT NULL,
	"decision" varchar(50) NOT NULL,
	"summary" text,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"flow_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"stage_type" varchar(50) NOT NULL,
	"allowed_roles" jsonb,
	"allowed_actions" jsonb,
	"component_config" jsonb,
	"entry_conditions" jsonb,
	"exit_conditions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_item_id" integer NOT NULL,
	"from_stage_id" integer,
	"to_stage_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" integer,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"definition" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ui_flow_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"ui_flow_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"page_slug" varchar(128) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"visitor_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ui_flow_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ui_flow_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"slug" varchar(128) NOT NULL,
	"title" varchar(255) NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"form_id" integer,
	"config" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ui_fp_flow_page" UNIQUE("ui_flow_id","slug")
);
--> statement-breakpoint
CREATE TABLE "ui_flow_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ui_flow_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"theme_config" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ui_fv_unique" UNIQUE("ui_flow_id","version")
);
--> statement-breakpoint
CREATE TABLE "ui_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"theme_config" jsonb,
	"domain_config" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ui_flows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_budget_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_id" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"message" text,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(32) NOT NULL,
	"scope_id" varchar(128),
	"period_type" varchar(32) NOT NULL,
	"token_limit" integer NOT NULL,
	"cost_limit_cents" integer NOT NULL,
	"current_tokens" integer DEFAULT 0 NOT NULL,
	"current_cost_cents" integer DEFAULT 0 NOT NULL,
	"alert_threshold_pct" integer DEFAULT 80 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"rule_type" varchar(32) NOT NULL,
	"pattern" text NOT NULL,
	"scope" varchar(32) NOT NULL,
	"action" varchar(32) NOT NULL,
	"message" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"alias" varchar(128) NOT NULL,
	"provider_id" integer NOT NULL,
	"model_id" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"default_settings" jsonb,
	"parameters_schema" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_aliases_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "ai_playground_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"type" varchar(32) NOT NULL,
	"model" varchar(128),
	"input" jsonb NOT NULL,
	"output" jsonb,
	"status" varchar(32) DEFAULT 'completed' NOT NULL,
	"token_usage" jsonb,
	"cost_cents" integer DEFAULT 0,
	"latency_ms" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"api_key_encrypted" text,
	"base_url" varchar(500),
	"default_model" varchar(128),
	"rate_limit_rpm" integer DEFAULT 60 NOT NULL,
	"rate_limit_tpm" integer DEFAULT 100000 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"category" varchar(64),
	"description" text,
	"input_schema" jsonb,
	"output_schema" jsonb,
	"handler" varchar(255),
	"is_system" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"provider_id" integer,
	"model_id" varchar(128),
	"tool_name" varchar(128),
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" real DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"status" varchar(32),
	"request_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_vector_stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"adapter" varchar(32) NOT NULL,
	"connection_config" jsonb,
	"embedding_provider_id" integer,
	"embedding_model" varchar(128),
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"distance_metric" varchar(32) DEFAULT 'cosine' NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_vs_tenant_slug" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"filename" varchar(512) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"public_url" text NOT NULL,
	"storage_key" varchar(1024) NOT NULL,
	"folder" varchar(255),
	"width" integer,
	"height" integer,
	"source_module" varchar(128),
	"source_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"knowledge_base_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kbc_tenant_kb_slug" UNIQUE("tenant_id","knowledge_base_id","slug")
);
--> statement-breakpoint
CREATE TABLE "kb_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"knowledge_base_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"keywords" jsonb,
	"tags" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"language" varchar(10) DEFAULT 'es' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_entry_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"version" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"keywords" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kbev_entry_version" UNIQUE("entry_id","version")
);
--> statement-breakpoint
CREATE TABLE "kb_knowledge_bases" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kbkb_tenant_slug" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "agent_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"message_id" integer,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"llm_config" jsonb,
	"tools_used" jsonb,
	"token_usage" jsonb,
	"latency_ms" integer,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" varchar(32) NOT NULL,
	"content" jsonb NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_node_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"category" varchar(64) NOT NULL,
	"description" text,
	"inputs" jsonb,
	"outputs" jsonb,
	"config" jsonb,
	"code" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_node_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"agent_id" integer NOT NULL,
	"user_id" integer,
	"title" varchar(255),
	"context" jsonb,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"is_playground" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "av_agent_version" UNIQUE("agent_id","version")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"llm_config" jsonb,
	"system_prompt" text,
	"exposed_params" jsonb,
	"tool_bindings" jsonb,
	"input_config" jsonb,
	"input_schema" jsonb,
	"workflow_agent_id" integer,
	"metadata" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"tool_name" varchar(255) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"status" varchar(32) DEFAULT 'success' NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"handler" varchar(128) NOT NULL,
	"args" jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cc_slug_tenant" UNIQUE("slug","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "chat_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer,
	"rating" varchar(16) NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cf_message_user" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_hooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"event" varchar(64) NOT NULL,
	"handler" jsonb NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_mcp_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"transport" varchar(32) NOT NULL,
	"url" text NOT NULL,
	"credentials" jsonb,
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"discovered_tools" jsonb,
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" varchar(32) NOT NULL,
	"content" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"agent_id" integer,
	"user_id" integer,
	"session_token" varchar(256),
	"channel" varchar(32) DEFAULT 'web' NOT NULL,
	"title" varchar(255),
	"context" jsonb,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"prompt_template" text NOT NULL,
	"source" varchar(32) DEFAULT 'custom' NOT NULL,
	"params" jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "csk_slug_tenant" UNIQUE("slug","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "agent_eval_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"workflow_id" integer,
	"name" varchar(255) NOT NULL,
	"eval_type" varchar(32) NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_eval_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"eval_definition_id" integer NOT NULL,
	"execution_id" integer NOT NULL,
	"score" integer,
	"passed" boolean NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_guardrail_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"guardrail_id" integer NOT NULL,
	"scope_type" varchar(32) NOT NULL,
	"scope_id" integer NOT NULL,
	"node_slug" varchar(128),
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"agent_id" integer,
	"key" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"tenant_id" integer,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"trigger_source" varchar(128),
	"trigger_payload" jsonb,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_state" varchar(128),
	"checkpoint" jsonb,
	"steps_executed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_node_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"node_id" varchar(128) NOT NULL,
	"node_type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"agent_config" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "awv_workflow_version" UNIQUE("workflow_id","version")
);
--> statement-breakpoint
CREATE TABLE "agent_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"agent_id" integer,
	"definition" jsonb NOT NULL,
	"agent_config" jsonb,
	"memory_config" jsonb,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"category" varchar(64),
	"tags" jsonb,
	"is_template" boolean DEFAULT false NOT NULL,
	"cloned_from" integer,
	"template_slug" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aw_slug_tenant" UNIQUE("slug","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_server_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"workflow_id" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"tool_definitions" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "msd_slug_tenant" UNIQUE("slug","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "map_chunks" ADD CONSTRAINT "map_chunks_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_world_config_id_world_configs_id_fk" FOREIGN KEY ("world_config_id") REFERENCES "public"."world_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tile_definitions" ADD CONSTRAINT "tile_definitions_tileset_id_tilesets_id_fk" FOREIGN KEY ("tileset_id") REFERENCES "public"."tilesets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_wirings_source_idx" ON "event_wirings" USING btree ("source_module","source_event");--> statement-breakpoint
CREATE INDEX "event_wirings_target_idx" ON "event_wirings" USING btree ("target_module","target_action");--> statement-breakpoint
CREATE UNIQUE INDEX "map_chunks_unique" ON "map_chunks" USING btree ("map_id","chunk_x","chunk_y");--> statement-breakpoint
CREATE INDEX "pma_player_active" ON "player_map_assignments" USING btree ("player_id","is_active");--> statement-breakpoint
CREATE INDEX "pp_player_time" ON "player_positions" USING btree ("player_id","recorded_at");--> statement-breakpoint
CREATE INDEX "pp_session" ON "player_positions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pvc_unique" ON "player_visited_chunks" USING btree ("player_id","map_id","chunk_x","chunk_y");--> statement-breakpoint
CREATE INDEX "module_configs_tenant_idx" ON "module_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "module_configs_module_idx" ON "module_configs" USING btree ("module_name");--> statement-breakpoint
CREATE INDEX "module_configs_lookup_idx" ON "module_configs" USING btree ("module_name","key");--> statement-breakpoint
CREATE INDEX "module_configs_tenant_module_idx" ON "module_configs" USING btree ("tenant_id","module_name");--> statement-breakpoint
CREATE INDEX "node_executions_execution_id_idx" ON "node_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "node_executions_node_id_idx" ON "node_executions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wv_workflow_id_idx" ON "workflow_versions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflows_trigger_event_idx" ON "workflows" USING btree ("trigger_event");--> statement-breakpoint
CREATE INDEX "workflows_slug_idx" ON "workflows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "api_ep_module_idx" ON "api_endpoint_permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "api_ep_permission_id_idx" ON "api_endpoint_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "hierarchy_nodes_parent_id_idx" ON "hierarchy_nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "rls_policies_slug_idx" ON "rls_policies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "rls_policies_target_table_idx" ON "rls_policies" USING btree ("target_table");--> statement-breakpoint
CREATE INDEX "rls_policies_role_id_idx" ON "rls_policies" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "rls_policies_status_idx" ON "rls_policies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rls_pv_policy_id_idx" ON "rls_policy_versions" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "roles_slug_idx" ON "roles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "roles_hierarchy_node_id_idx" ON "roles" USING btree ("hierarchy_node_id");--> statement-breakpoint
CREATE INDEX "tm_tenant_id_idx" ON "tenant_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tm_user_id_idx" ON "tenant_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_enabled_idx" ON "tenants" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "sub_pq_plan_idx" ON "sub_plan_quotas" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "sub_pq_service_idx" ON "sub_plan_quotas" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "sub_ps_provider_idx" ON "sub_provider_services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sub_ps_service_idx" ON "sub_provider_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "sub_services_category_idx" ON "sub_services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sub_services_slug_idx" ON "sub_services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sub_qo_sub_idx" ON "sub_quota_overrides" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "sub_ts_tenant_idx" ON "sub_tenant_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sub_ts_plan_idx" ON "sub_tenant_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "sub_ts_status_idx" ON "sub_tenant_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sur_tenant_id_idx" ON "sub_usage_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sur_service_id_idx" ON "sub_usage_records" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "sur_billing_cycle_idx" ON "sub_usage_records" USING btree ("billing_cycle");--> statement-breakpoint
CREATE INDEX "sur_created_at_idx" ON "sub_usage_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_enabled_idx" ON "api_keys" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_token_idx" ON "auth_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_default_tenant_id_idx" ON "users" USING btree ("default_tenant_id");--> statement-breakpoint
CREATE INDEX "fc_tenant_id_idx" ON "form_components" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fc_slug_idx" ON "form_components" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "fc_category_idx" ON "form_components" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fds_tenant_id_idx" ON "form_data_sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fds_form_id_idx" ON "form_data_sources" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "fds_slug_idx" ON "form_data_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "fsub_tenant_id_idx" ON "form_submissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fsub_form_id_idx" ON "form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "fsub_submitted_by_idx" ON "form_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "fv_form_id_idx" ON "form_versions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "forms_tenant_id_idx" ON "forms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "forms_slug_idx" ON "forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "forms_created_by_idx" ON "forms" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "fc2_flow_item_id_idx" ON "flow_comments" USING btree ("flow_item_id");--> statement-breakpoint
CREATE INDEX "fc2_stage_id_idx" ON "flow_comments" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "fc2_author_id_idx" ON "flow_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "fi_tenant_id_idx" ON "flow_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fi_flow_id_idx" ON "flow_items" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "fi_current_stage_idx" ON "flow_items" USING btree ("current_stage_id");--> statement-breakpoint
CREATE INDEX "fi_status_idx" ON "flow_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fi_content_idx" ON "flow_items" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "fr_flow_item_id_idx" ON "flow_reviews" USING btree ("flow_item_id");--> statement-breakpoint
CREATE INDEX "fr_reviewer_id_idx" ON "flow_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "fs_tenant_id_idx" ON "flow_stages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fs_flow_id_idx" ON "flow_stages" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "fs_slug_idx" ON "flow_stages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ft_flow_item_id_idx" ON "flow_transitions" USING btree ("flow_item_id");--> statement-breakpoint
CREATE INDEX "ft_from_stage_idx" ON "flow_transitions" USING btree ("from_stage_id");--> statement-breakpoint
CREATE INDEX "ft_to_stage_idx" ON "flow_transitions" USING btree ("to_stage_id");--> statement-breakpoint
CREATE INDEX "fver_flow_id_idx" ON "flow_versions" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flows_tenant_id_idx" ON "flows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "flows_slug_idx" ON "flows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "flows_enabled_idx" ON "flows" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "ui_fa_flow_id_idx" ON "ui_flow_analytics" USING btree ("ui_flow_id");--> statement-breakpoint
CREATE INDEX "ui_fa_tenant_id_idx" ON "ui_flow_analytics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ui_fa_created_at_idx" ON "ui_flow_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ui_fp_flow_id_idx" ON "ui_flow_pages" USING btree ("ui_flow_id");--> statement-breakpoint
CREATE INDEX "ui_fp_tenant_id_idx" ON "ui_flow_pages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ui_fp_slug_idx" ON "ui_flow_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ui_fv_flow_id_idx" ON "ui_flow_versions" USING btree ("ui_flow_id");--> statement-breakpoint
CREATE INDEX "ui_flows_tenant_id_idx" ON "ui_flows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ui_flows_slug_idx" ON "ui_flows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ui_flows_status_idx" ON "ui_flows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_alerts_budget_idx" ON "ai_budget_alerts" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "ai_budgets_scope_idx" ON "ai_budgets" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "ai_guardrails_tenant_idx" ON "ai_guardrails" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_guardrails_type_idx" ON "ai_guardrails" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "ai_aliases_alias_idx" ON "ai_model_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "ai_aliases_provider_idx" ON "ai_model_aliases" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ai_pe_tenant_idx" ON "ai_playground_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_pe_type_idx" ON "ai_playground_executions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_pe_created_idx" ON "ai_playground_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_providers_tenant_idx" ON "ai_providers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_providers_slug_idx" ON "ai_providers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ai_providers_type_idx" ON "ai_providers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_usage_tenant_idx" ON "ai_usage_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_usage_provider_idx" ON "ai_usage_logs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_vs_tenant_idx" ON "ai_vector_stores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_vs_slug_idx" ON "ai_vector_stores" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "files_tenant_idx" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "files_folder_idx" ON "files" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "files_source_idx" ON "files" USING btree ("source_module","source_id");--> statement-breakpoint
CREATE INDEX "files_mime_idx" ON "files" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "files_created_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kbc_tenant_id_idx" ON "kb_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kbc_kb_id_idx" ON "kb_categories" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "kbc_enabled_idx" ON "kb_categories" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "kbc_order_idx" ON "kb_categories" USING btree ("order");--> statement-breakpoint
CREATE INDEX "kbe_tenant_id_idx" ON "kb_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kbe_kb_id_idx" ON "kb_entries" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "kbe_category_id_idx" ON "kb_entries" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "kbe_enabled_idx" ON "kb_entries" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "kbe_language_idx" ON "kb_entries" USING btree ("language");--> statement-breakpoint
CREATE INDEX "kbe_priority_idx" ON "kb_entries" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "kbev_entry_id_idx" ON "kb_entry_versions" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "kbkb_tenant_id_idx" ON "kb_knowledge_bases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ae_agent_id_idx" ON "agent_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "ae_session_id_idx" ON "agent_executions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ae_status_idx" ON "agent_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "am_session_id_idx" ON "agent_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "am_role_idx" ON "agent_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "and_slug_idx" ON "agent_node_definitions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "and_category_idx" ON "agent_node_definitions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "and_is_system_idx" ON "agent_node_definitions" USING btree ("is_system");--> statement-breakpoint
CREATE INDEX "as_tenant_id_idx" ON "agent_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "as_agent_id_idx" ON "agent_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "as_user_id_idx" ON "agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "as_status_idx" ON "agent_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "av_agent_id_idx" ON "agent_versions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agents_tenant_id_idx" ON "agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agents_enabled_idx" ON "agents" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "ca_message_id_idx" ON "chat_actions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ca_session_id_idx" ON "chat_actions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cc_tenant_id_idx" ON "chat_commands" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cf_session_id_idx" ON "chat_feedback" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cf_message_id_idx" ON "chat_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ch_tenant_id_idx" ON "chat_hooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ch_event_idx" ON "chat_hooks" USING btree ("event");--> statement-breakpoint
CREATE INDEX "ch_priority_idx" ON "chat_hooks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "cmc_tenant_id_idx" ON "chat_mcp_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cmc_status_idx" ON "chat_mcp_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cm_session_id_idx" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cm_role_idx" ON "chat_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "cm_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cs_tenant_id_idx" ON "chat_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cs_agent_id_idx" ON "chat_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "cs_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cs_session_token_idx" ON "chat_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "cs_status_idx" ON "chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "csk_tenant_id_idx" ON "chat_skills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "aed_tenant_id_idx" ON "agent_eval_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "aed_workflow_id_idx" ON "agent_eval_definitions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "aer_eval_def_id_idx" ON "agent_eval_runs" USING btree ("eval_definition_id");--> statement-breakpoint
CREATE INDEX "aer_execution_id_idx" ON "agent_eval_runs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "agb_tenant_id_idx" ON "agent_guardrail_bindings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agb_guardrail_id_idx" ON "agent_guardrail_bindings" USING btree ("guardrail_id");--> statement-breakpoint
CREATE INDEX "agb_scope_idx" ON "agent_guardrail_bindings" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "am_tenant_id_idx" ON "agent_memory" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "am_agent_id_idx" ON "agent_memory" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "am_key_idx" ON "agent_memory" USING btree ("key");--> statement-breakpoint
CREATE INDEX "awe_workflow_id_idx" ON "agent_workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "awe_tenant_id_idx" ON "agent_workflow_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "awe_status_idx" ON "agent_workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "awne_execution_id_idx" ON "agent_workflow_node_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "awne_node_id_idx" ON "agent_workflow_node_executions" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "awv_workflow_id_idx" ON "agent_workflow_versions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "aw_tenant_id_idx" ON "agent_workflows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "aw_agent_id_idx" ON "agent_workflows" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "aw_status_idx" ON "agent_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aw_category_idx" ON "agent_workflows" USING btree ("category");--> statement-breakpoint
CREATE INDEX "aw_is_template_idx" ON "agent_workflows" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "msd_tenant_id_idx" ON "mcp_server_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "msd_workflow_id_idx" ON "mcp_server_definitions" USING btree ("workflow_id");