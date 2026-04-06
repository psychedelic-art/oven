-- Phase 4-5 New Tables Migration
-- Run this manually: psql $DATABASE_URL -f drizzle/new-tables-only.sql
-- Or via: cd apps/dashboard && npx tsx -e "require('dotenv/config'); const {db}=require('./src/lib/db'); db.execute(require('fs').readFileSync('drizzle/new-tables-only.sql','utf8'))"

-- module-chat tables (8)
CREATE TABLE IF NOT EXISTS "chat_sessions" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "agent_id" integer, "user_id" integer, "session_token" varchar(256), "channel" varchar(32) DEFAULT 'web' NOT NULL, "title" varchar(255), "context" jsonb, "status" varchar(32) DEFAULT 'active' NOT NULL, "is_pinned" boolean DEFAULT false NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "chat_messages" ("id" serial PRIMARY KEY NOT NULL, "session_id" integer NOT NULL, "role" varchar(32) NOT NULL, "content" jsonb NOT NULL, "metadata" jsonb, "created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "chat_actions" ("id" serial PRIMARY KEY NOT NULL, "message_id" integer NOT NULL, "session_id" integer NOT NULL, "tool_name" varchar(255) NOT NULL, "input" jsonb, "output" jsonb, "status" varchar(32) DEFAULT 'success' NOT NULL, "duration_ms" integer, "created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "chat_commands" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "name" varchar(128) NOT NULL, "slug" varchar(128) NOT NULL, "description" text NOT NULL, "category" varchar(64) DEFAULT 'general' NOT NULL, "handler" varchar(128) NOT NULL, "args" jsonb, "is_built_in" boolean DEFAULT false NOT NULL, "enabled" boolean DEFAULT true NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "cc_slug_tenant" UNIQUE("slug","tenant_id"));
CREATE TABLE IF NOT EXISTS "chat_skills" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "name" varchar(128) NOT NULL, "slug" varchar(128) NOT NULL, "description" text NOT NULL, "prompt_template" text NOT NULL, "source" varchar(32) DEFAULT 'custom' NOT NULL, "params" jsonb, "is_built_in" boolean DEFAULT false NOT NULL, "enabled" boolean DEFAULT true NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "csk_slug_tenant" UNIQUE("slug","tenant_id"));
CREATE TABLE IF NOT EXISTS "chat_hooks" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "name" varchar(128) NOT NULL, "event" varchar(64) NOT NULL, "handler" jsonb NOT NULL, "priority" integer DEFAULT 100 NOT NULL, "enabled" boolean DEFAULT true NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "chat_mcp_connections" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "name" varchar(128) NOT NULL, "transport" varchar(32) NOT NULL, "url" text NOT NULL, "credentials" jsonb, "status" varchar(32) DEFAULT 'disconnected' NOT NULL, "discovered_tools" jsonb, "last_connected_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "chat_feedback" ("id" serial PRIMARY KEY NOT NULL, "session_id" integer NOT NULL, "message_id" integer NOT NULL, "user_id" integer, "rating" varchar(16) NOT NULL, "comment" text, "created_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "cf_message_user" UNIQUE("message_id","user_id"));

-- module-workflow-agents tables (9)
CREATE TABLE IF NOT EXISTS "agent_workflows" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "name" varchar(255) NOT NULL, "slug" varchar(128) NOT NULL, "description" text, "agent_id" integer, "definition" jsonb NOT NULL, "agent_config" jsonb, "memory_config" jsonb, "status" varchar(32) DEFAULT 'draft' NOT NULL, "version" integer DEFAULT 1 NOT NULL, "category" varchar(64), "tags" jsonb, "is_template" boolean DEFAULT false NOT NULL, "cloned_from" integer, "template_slug" varchar(128), "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "aw_slug_tenant" UNIQUE("slug","tenant_id"));
CREATE TABLE IF NOT EXISTS "agent_workflow_versions" ("id" serial PRIMARY KEY NOT NULL, "workflow_id" integer NOT NULL, "version" integer NOT NULL, "definition" jsonb NOT NULL, "agent_config" jsonb, "description" text, "created_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "awv_workflow_version" UNIQUE("workflow_id","version"));
CREATE TABLE IF NOT EXISTS "agent_workflow_executions" ("id" serial PRIMARY KEY NOT NULL, "workflow_id" integer NOT NULL, "tenant_id" integer, "status" varchar(32) DEFAULT 'pending' NOT NULL, "trigger_source" varchar(128), "trigger_payload" jsonb, "context" jsonb DEFAULT '{}'::jsonb NOT NULL, "current_state" varchar(128), "checkpoint" jsonb, "steps_executed" integer DEFAULT 0 NOT NULL, "started_at" timestamp DEFAULT now() NOT NULL, "completed_at" timestamp, "error" text);
CREATE TABLE IF NOT EXISTS "agent_workflow_node_executions" ("id" serial PRIMARY KEY NOT NULL, "execution_id" integer NOT NULL, "node_id" varchar(128) NOT NULL, "node_type" varchar(64) NOT NULL, "status" varchar(32) DEFAULT 'pending' NOT NULL, "input" jsonb, "output" jsonb, "error" text, "started_at" timestamp DEFAULT now() NOT NULL, "completed_at" timestamp, "duration_ms" integer);
CREATE TABLE IF NOT EXISTS "agent_memory" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "agent_id" integer, "key" varchar(255) NOT NULL, "content" text NOT NULL, "metadata" jsonb, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "mcp_server_definitions" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "workflow_id" integer, "name" varchar(255) NOT NULL, "slug" varchar(128) NOT NULL, "description" text, "tool_definitions" jsonb, "enabled" boolean DEFAULT true NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "msd_slug_tenant" UNIQUE("slug","tenant_id"));
CREATE TABLE IF NOT EXISTS "agent_guardrail_bindings" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "guardrail_id" integer NOT NULL, "scope_type" varchar(32) NOT NULL, "scope_id" integer NOT NULL, "node_slug" varchar(128), "enabled" boolean DEFAULT true NOT NULL, "priority" integer DEFAULT 0 NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "agent_eval_definitions" ("id" serial PRIMARY KEY NOT NULL, "tenant_id" integer, "workflow_id" integer, "name" varchar(255) NOT NULL, "eval_type" varchar(32) NOT NULL, "config" jsonb NOT NULL, "enabled" boolean DEFAULT true NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "agent_eval_runs" ("id" serial PRIMARY KEY NOT NULL, "eval_definition_id" integer NOT NULL, "execution_id" integer NOT NULL, "score" integer, "passed" boolean NOT NULL, "details" jsonb, "created_at" timestamp DEFAULT now() NOT NULL);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS "cs_tenant_id_idx" ON "chat_sessions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "cs_agent_id_idx" ON "chat_sessions" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "cs_user_id_idx" ON "chat_sessions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "cs_session_token_idx" ON "chat_sessions" USING btree ("session_token");
CREATE INDEX IF NOT EXISTS "cs_status_idx" ON "chat_sessions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "cm_session_id_idx" ON "chat_messages" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "cm_role_idx" ON "chat_messages" USING btree ("role");
CREATE INDEX IF NOT EXISTS "cm_created_at_idx" ON "chat_messages" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "ca_message_id_idx" ON "chat_actions" USING btree ("message_id");
CREATE INDEX IF NOT EXISTS "ca_session_id_idx" ON "chat_actions" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "cc_tenant_id_idx" ON "chat_commands" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "cf_session_id_idx" ON "chat_feedback" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "cf_message_id_idx" ON "chat_feedback" USING btree ("message_id");
CREATE INDEX IF NOT EXISTS "ch_tenant_id_idx" ON "chat_hooks" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ch_event_idx" ON "chat_hooks" USING btree ("event");
CREATE INDEX IF NOT EXISTS "ch_priority_idx" ON "chat_hooks" USING btree ("priority");
CREATE INDEX IF NOT EXISTS "cmc_tenant_id_idx" ON "chat_mcp_connections" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "cmc_status_idx" ON "chat_mcp_connections" USING btree ("status");
CREATE INDEX IF NOT EXISTS "csk_tenant_id_idx" ON "chat_skills" USING btree ("tenant_id");

-- Indexes for workflow-agents tables
CREATE INDEX IF NOT EXISTS "aw_tenant_id_idx" ON "agent_workflows" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "aw_agent_id_idx" ON "agent_workflows" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "aw_status_idx" ON "agent_workflows" USING btree ("status");
CREATE INDEX IF NOT EXISTS "aw_category_idx" ON "agent_workflows" USING btree ("category");
CREATE INDEX IF NOT EXISTS "aw_is_template_idx" ON "agent_workflows" USING btree ("is_template");
CREATE INDEX IF NOT EXISTS "awv_workflow_id_idx" ON "agent_workflow_versions" USING btree ("workflow_id");
CREATE INDEX IF NOT EXISTS "awe_workflow_id_idx" ON "agent_workflow_executions" USING btree ("workflow_id");
CREATE INDEX IF NOT EXISTS "awe_tenant_id_idx" ON "agent_workflow_executions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "awe_status_idx" ON "agent_workflow_executions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "awne_execution_id_idx" ON "agent_workflow_node_executions" USING btree ("execution_id");
CREATE INDEX IF NOT EXISTS "awne_node_id_idx" ON "agent_workflow_node_executions" USING btree ("node_id");
CREATE INDEX IF NOT EXISTS "am_tenant_id_idx" ON "agent_memory" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "am_agent_id_idx" ON "agent_memory" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "am_key_idx" ON "agent_memory" USING btree ("key");
CREATE INDEX IF NOT EXISTS "msd_tenant_id_idx" ON "mcp_server_definitions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "msd_workflow_id_idx" ON "mcp_server_definitions" USING btree ("workflow_id");
CREATE INDEX IF NOT EXISTS "agb_tenant_id_idx" ON "agent_guardrail_bindings" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "agb_guardrail_id_idx" ON "agent_guardrail_bindings" USING btree ("guardrail_id");
CREATE INDEX IF NOT EXISTS "agb_scope_idx" ON "agent_guardrail_bindings" USING btree ("scope_type","scope_id");
CREATE INDEX IF NOT EXISTS "aed_tenant_id_idx" ON "agent_eval_definitions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "aed_workflow_id_idx" ON "agent_eval_definitions" USING btree ("workflow_id");
CREATE INDEX IF NOT EXISTS "aer_eval_def_id_idx" ON "agent_eval_runs" USING btree ("eval_definition_id");
CREATE INDEX IF NOT EXISTS "aer_execution_id_idx" ON "agent_eval_runs" USING btree ("execution_id");
