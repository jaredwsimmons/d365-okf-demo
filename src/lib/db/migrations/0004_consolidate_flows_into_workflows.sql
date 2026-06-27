ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "trigger_type" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "trigger_entity" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "connectors" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workflows_trigger_entity" ON "workflows" USING btree ("trigger_entity");--> statement-breakpoint
DROP TABLE IF EXISTS "flows";
