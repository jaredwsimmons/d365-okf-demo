CREATE TABLE "ai_components" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unique_name" text,
	"display_name" text,
	"component_type" text,
	"parent_bot" text,
	"entity" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_actions" (
	"unique_name" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"button_label" text,
	"app_module" text,
	"context_entity" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"unique_name" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"app_type" text,
	"solution" text,
	"status" text,
	"entity_count" integer,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "azure_components" (
	"name" text PRIMARY KEY NOT NULL,
	"type" text,
	"trigger" text,
	"direction" text,
	"description" text,
	"related_entity" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canvas_app_sources" (
	"name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"description" text,
	"solution" text,
	"form_factor" text,
	"entity_count" integer,
	"connector_count" integer,
	"entities" jsonb,
	"connectors" jsonb
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"component_count" integer,
	"components_by_type" jsonb,
	"components" jsonb
);
--> statement-breakpoint
CREATE TABLE "capability_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"component_id" text NOT NULL,
	"action" text NOT NULL,
	"capability_id" text,
	"sub_capability_name" text,
	"tertiary_sub_capability_name" text,
	"reason" text,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"solution" text,
	"is_default" boolean,
	"is_tablet_enabled" boolean,
	"entity_count" integer,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"logical_name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"description" text,
	"solution" text,
	"primary_field" text,
	"field_count" integer,
	"category" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_columns" (
	"entity_name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"description" text,
	"total_columns" integer,
	"custom_columns" integer,
	"oob_columns" integer,
	"settings" jsonb,
	"solutions" jsonb,
	"columns" jsonb
);
--> statement-breakpoint
CREATE TABLE "entity_maps" (
	"id" text PRIMARY KEY NOT NULL,
	"source_entity" text NOT NULL,
	"target_entity" text NOT NULL,
	"field_count" integer,
	"field_mappings" jsonb,
	"solutions" jsonb
);
--> statement-breakpoint
CREATE TABLE "env_vars" (
	"schema_name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"description" text,
	"data_type" text,
	"is_secret" boolean,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "environment_drift" (
	"id" text PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"solution" text NOT NULL,
	"severity" text,
	"finding" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "flow_complexity" (
	"name" text PRIMARY KEY NOT NULL,
	"solution" text,
	"trigger_type" text,
	"trigger_entity" text,
	"total_actions" integer,
	"max_depth" integer,
	"complexity_score" integer,
	"complexity" text,
	"has_error_handling" boolean,
	"metrics" jsonb,
	"http_urls" jsonb,
	"connectors" jsonb,
	"governance_flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "flow_entity_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_name" text NOT NULL,
	"flow_solution" text,
	"entity_name" text NOT NULL,
	"operations" jsonb,
	"columns_referenced" jsonb
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"solution" text,
	"trigger_type" text,
	"trigger_entity" text,
	"category" text,
	"connectors" jsonb,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_details" (
	"form_id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"form_type" text,
	"solution" text,
	"tab_count" integer,
	"total_fields" integer,
	"js_handler_count" integer,
	"subgrid_count" integer,
	"tabs" jsonb,
	"js_handlers" jsonb
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"form_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity" text NOT NULL,
	"entity_display_name" text,
	"form_type" text,
	"solution" text,
	"is_active" boolean,
	"version" text,
	"tab_count" integer,
	"section_count" integer,
	"control_count" integer,
	"subgrid_count" integer,
	"has_canvas_app" boolean,
	"has_bpf" boolean,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "governance_findings" (
	"rule_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"severity" text NOT NULL,
	"category" text,
	"count" integer,
	"message" text,
	"recommendation" text,
	"status" text,
	"scope" text,
	"component_type" text,
	"items" jsonb,
	"item_details" jsonb,
	"audit_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "mobile_offline" (
	"name" text PRIMARY KEY NOT NULL,
	"solution" text,
	"entity_count" integer,
	"entities" jsonb,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "option_sets" (
	"schema_name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"option_set_type" text,
	"is_global" boolean,
	"solution" text,
	"option_count" integer,
	"options" jsonb,
	"entities" jsonb,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orphaned_components" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"schema_name" text NOT NULL,
	"reason" text,
	"severity" text,
	"solution" text
);
--> statement-breakpoint
CREATE TABLE "overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"data_key" text NOT NULL,
	"item_id" text NOT NULL,
	"tags" jsonb,
	"fields" jsonb,
	"modified_at" timestamp DEFAULT now(),
	"modified_by" text
);
--> statement-breakpoint
CREATE TABLE "pcf_controls" (
	"name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plugin_configs" (
	"step_id" text PRIMARY KEY NOT NULL,
	"step_name" text NOT NULL,
	"plugin_type" text,
	"entity" text,
	"solution" text,
	"rule_count" integer,
	"is_rules_engine" boolean,
	"rules" jsonb
);
--> statement-breakpoint
CREATE TABLE "plugin_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"class_name" text,
	"short_class_name" text,
	"assembly" text,
	"entity" text,
	"message" text,
	"stage" text,
	"mode" text,
	"rank" integer,
	"filtering_attribute_count" integer,
	"is_customizable" boolean,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"full_type_name" text,
	"assembly" text,
	"namespace" text,
	"entity" text,
	"primary_entity" text,
	"message" text,
	"stage" text,
	"status" text,
	"solution" text,
	"business_logic" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_catalog" (
	"code" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"level" integer NOT NULL,
	"parent_code" text,
	"sequence_id" text,
	"description" text,
	"catalog_status" text,
	"application_family" text,
	"products" text,
	"microsoft_id" text,
	"apqc" jsonb,
	"microsoft_references" jsonb,
	"raw_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "refresh_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp NOT NULL,
	"duration" text,
	"mode" text,
	"source" text,
	"components" jsonb,
	"results" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rel_app_dashboard" (
	"app_unique_name" text NOT NULL,
	"dashboard_id" text NOT NULL,
	"dashboard_name" text,
	CONSTRAINT "rel_app_dashboard_app_unique_name_dashboard_id_pk" PRIMARY KEY("app_unique_name","dashboard_id")
);
--> statement-breakpoint
CREATE TABLE "rel_app_entity" (
	"app_unique_name" text NOT NULL,
	"entity_name" text NOT NULL,
	CONSTRAINT "rel_app_entity_app_unique_name_entity_name_pk" PRIMARY KEY("app_unique_name","entity_name")
);
--> statement-breakpoint
CREATE TABLE "rel_app_site_map" (
	"app_unique_name" text NOT NULL,
	"site_map_name" text NOT NULL,
	CONSTRAINT "rel_app_site_map_app_unique_name_site_map_name_pk" PRIMARY KEY("app_unique_name","site_map_name")
);
--> statement-breakpoint
CREATE TABLE "rel_app_web_resource" (
	"app_unique_name" text NOT NULL,
	"web_resource_name" text NOT NULL,
	CONSTRAINT "rel_app_web_resource_app_unique_name_web_resource_name_pk" PRIMARY KEY("app_unique_name","web_resource_name")
);
--> statement-breakpoint
CREATE TABLE "rel_entity_entity" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"from_entity" text NOT NULL,
	"to_entity" text NOT NULL,
	"lookup_field" text,
	"cascade_delete" text,
	"description" text,
	"solution" text
);
--> statement-breakpoint
CREATE TABLE "rel_entity_form" (
	"entity_name" text NOT NULL,
	"form_id" text NOT NULL,
	CONSTRAINT "rel_entity_form_entity_name_form_id_pk" PRIMARY KEY("entity_name","form_id")
);
--> statement-breakpoint
CREATE TABLE "rel_entity_option_set" (
	"entity_name" text NOT NULL,
	"option_set_schema" text NOT NULL,
	CONSTRAINT "rel_entity_option_set_entity_name_option_set_schema_pk" PRIMARY KEY("entity_name","option_set_schema")
);
--> statement-breakpoint
CREATE TABLE "rel_entity_plugin_step" (
	"entity_name" text NOT NULL,
	"plugin_step_id" text NOT NULL,
	CONSTRAINT "rel_entity_plugin_step_entity_name_plugin_step_id_pk" PRIMARY KEY("entity_name","plugin_step_id")
);
--> statement-breakpoint
CREATE TABLE "rel_entity_view" (
	"entity_name" text NOT NULL,
	"view_id" text NOT NULL,
	CONSTRAINT "rel_entity_view_entity_name_view_id_pk" PRIMARY KEY("entity_name","view_id")
);
--> statement-breakpoint
CREATE TABLE "rel_entity_workflow" (
	"entity_name" text NOT NULL,
	"workflow_name" text NOT NULL,
	CONSTRAINT "rel_entity_workflow_entity_name_workflow_name_pk" PRIMARY KEY("entity_name","workflow_name")
);
--> statement-breakpoint
CREATE TABLE "rel_form_js_library" (
	"form_id" text NOT NULL,
	"library_name" text NOT NULL,
	CONSTRAINT "rel_form_js_library_form_id_library_name_pk" PRIMARY KEY("form_id","library_name")
);
--> statement-breakpoint
CREATE TABLE "rel_workflow_env_var" (
	"workflow_name" text NOT NULL,
	"env_var_schema" text NOT NULL,
	CONSTRAINT "rel_workflow_env_var_workflow_name_env_var_schema_pk" PRIMARY KEY("workflow_name","env_var_schema")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"name" text PRIMARY KEY NOT NULL,
	"id" text,
	"file_name" text,
	"entity" text,
	"report_type" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ribbon_customizations" (
	"id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"type" text NOT NULL,
	"ribbon_id" text NOT NULL,
	"location" text,
	"solution" text,
	"js_actions" jsonb
);
--> statement-breakpoint
CREATE TABLE "security_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"solution" text,
	"category" text,
	"is_customizable" boolean,
	"total_privileges" integer,
	"entity_access_count" integer,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_maps" (
	"name" text PRIMARY KEY NOT NULL,
	"solution" text,
	"area_count" integer,
	"total_groups" integer,
	"total_sub_areas" integer,
	"total_entities" integer,
	"areas" jsonb,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "solution_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"from_solution" text NOT NULL,
	"to_solution" text NOT NULL,
	"component_count" integer
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"unique_name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"version" text,
	"is_managed" boolean,
	"publisher" text,
	"publisher_prefix" text,
	"description" text,
	"dependency_count" integer,
	"missing_dependency_count" integer,
	"depends_on" jsonb
);
--> statement-breakpoint
CREATE TABLE "sub_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"capability_id" text NOT NULL,
	"name" text NOT NULL,
	"bpc_l3" text,
	"functional_area" text,
	"component_count" integer,
	"components_by_type" jsonb,
	"entities" jsonb,
	"top_keywords" jsonb,
	"components" jsonb
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"template_type_name" text,
	"solution" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tertiary_sub_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"capability_id" text NOT NULL,
	"sub_capability_name" text NOT NULL,
	"name" text NOT NULL,
	"component_count" integer,
	"components_by_type" jsonb,
	"entities" jsonb,
	"top_keywords" jsonb,
	"components" jsonb
);
--> statement-breakpoint
CREATE TABLE "view_details" (
	"view_id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"name" text,
	"solution" text,
	"query_type" text,
	"is_default" boolean,
	"is_quick_find" boolean,
	"column_count" integer,
	"filter_count" integer,
	"linked_entity_count" integer,
	"columns" jsonb,
	"filters" jsonb,
	"linked_entities" jsonb,
	"sort_fields" jsonb
);
--> statement-breakpoint
CREATE TABLE "views" (
	"view_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity" text NOT NULL,
	"entity_display_name" text,
	"query_type" text,
	"solution" text,
	"column_count" integer,
	"filter_count" integer,
	"is_default" boolean,
	"is_quick_find" boolean,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_resource_code_analysis" (
	"name" text PRIMARY KEY NOT NULL,
	"solution" text,
	"line_count" integer,
	"is_rules_engine" boolean,
	"is_custom" boolean,
	"function_count" integer,
	"functions" jsonb,
	"api_call_count" integer,
	"api_calls" jsonb,
	"deprecated_count" integer,
	"deprecated" jsonb,
	"field_ref_count" integer,
	"field_refs" jsonb,
	"governance_flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "web_resources" (
	"name" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"description" text,
	"web_resource_type" text,
	"type" text,
	"solution" text,
	"related_entity" text,
	"prefix" text,
	"is_managed" boolean,
	"inferred_purpose" text,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity" text,
	"primary_entity" text,
	"category" text,
	"type" text,
	"solution" text,
	"state" text,
	"mode" text,
	"format" text,
	"description" text,
	"on_create" boolean,
	"on_update" boolean,
	"on_delete" boolean,
	"tags" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_apps_solution" ON "apps" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_apps_type" ON "apps" USING btree ("app_type");--> statement-breakpoint
CREATE INDEX "idx_entities_solution" ON "entities" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_entities_category" ON "entities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_entity_columns_name" ON "entity_columns" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_entity_maps_source" ON "entity_maps" USING btree ("source_entity");--> statement-breakpoint
CREATE INDEX "idx_entity_maps_target" ON "entity_maps" USING btree ("target_entity");--> statement-breakpoint
CREATE INDEX "idx_env_vars_solution" ON "env_vars" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_drift_env" ON "environment_drift" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_drift_severity" ON "environment_drift" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_flow_complexity_solution" ON "flow_complexity" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_flow_complexity_score" ON "flow_complexity" USING btree ("complexity");--> statement-breakpoint
CREATE INDEX "idx_fei_flow" ON "flow_entity_interactions" USING btree ("flow_name");--> statement-breakpoint
CREATE INDEX "idx_fei_entity" ON "flow_entity_interactions" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_flows_solution" ON "flows" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_flows_trigger_entity" ON "flows" USING btree ("trigger_entity");--> statement-breakpoint
CREATE INDEX "idx_form_details_entity" ON "form_details" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_forms_entity" ON "forms" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_forms_solution" ON "forms" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_forms_type" ON "forms" USING btree ("form_type");--> statement-breakpoint
CREATE INDEX "idx_gov_severity" ON "governance_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_gov_category" ON "governance_findings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_option_sets_solution" ON "option_sets" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_overrides_data_key" ON "overrides" USING btree ("data_key");--> statement-breakpoint
CREATE INDEX "idx_overrides_lookup" ON "overrides" USING btree ("data_key","item_id");--> statement-breakpoint
CREATE INDEX "idx_plugin_configs_entity" ON "plugin_configs" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_plugin_steps_solution" ON "plugin_steps" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_plugin_steps_entity" ON "plugin_steps" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_plugin_steps_message" ON "plugin_steps" USING btree ("message");--> statement-breakpoint
CREATE INDEX "idx_plugins_solution" ON "plugins" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_plugins_entity" ON "plugins" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_plugins_assembly" ON "plugins" USING btree ("assembly");--> statement-breakpoint
CREATE INDEX "idx_process_catalog_level" ON "process_catalog" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_process_catalog_parent" ON "process_catalog" USING btree ("parent_code");--> statement-breakpoint
CREATE INDEX "idx_rel_app_dashboard_app" ON "rel_app_dashboard" USING btree ("app_unique_name");--> statement-breakpoint
CREATE INDEX "idx_rel_app_entity_app" ON "rel_app_entity" USING btree ("app_unique_name");--> statement-breakpoint
CREATE INDEX "idx_rel_app_entity_entity" ON "rel_app_entity" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_app_wr_app" ON "rel_app_web_resource" USING btree ("app_unique_name");--> statement-breakpoint
CREATE INDEX "idx_rel_ee_from" ON "rel_entity_entity" USING btree ("from_entity");--> statement-breakpoint
CREATE INDEX "idx_rel_ee_to" ON "rel_entity_entity" USING btree ("to_entity");--> statement-breakpoint
CREATE INDEX "idx_rel_entity_form_entity" ON "rel_entity_form" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_entity_os_entity" ON "rel_entity_option_set" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_entity_ps_entity" ON "rel_entity_plugin_step" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_entity_view_entity" ON "rel_entity_view" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_entity_wf_entity" ON "rel_entity_workflow" USING btree ("entity_name");--> statement-breakpoint
CREATE INDEX "idx_rel_form_js_form" ON "rel_form_js_library" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_rel_wf_ev_workflow" ON "rel_workflow_env_var" USING btree ("workflow_name");--> statement-breakpoint
CREATE INDEX "idx_rel_wf_ev_envvar" ON "rel_workflow_env_var" USING btree ("env_var_schema");--> statement-breakpoint
CREATE INDEX "idx_reports_solution" ON "reports" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_ribbon_entity" ON "ribbon_customizations" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_security_roles_solution" ON "security_roles" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_security_roles_category" ON "security_roles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_sol_dep_from" ON "solution_dependencies" USING btree ("from_solution");--> statement-breakpoint
CREATE INDEX "idx_sol_dep_to" ON "solution_dependencies" USING btree ("to_solution");--> statement-breakpoint
CREATE INDEX "idx_sub_cap_parent" ON "sub_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_tert_cap_parent" ON "tertiary_sub_capabilities" USING btree ("capability_id","sub_capability_name");--> statement-breakpoint
CREATE INDEX "idx_view_details_entity" ON "view_details" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_views_entity" ON "views" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_views_solution" ON "views" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_webresources_solution" ON "web_resources" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_webresources_entity" ON "web_resources" USING btree ("related_entity");--> statement-breakpoint
CREATE INDEX "idx_webresources_type" ON "web_resources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_workflows_solution" ON "workflows" USING btree ("solution");--> statement-breakpoint
CREATE INDEX "idx_workflows_entity" ON "workflows" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_workflows_type" ON "workflows" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_workflows_state" ON "workflows" USING btree ("state");