CREATE TABLE "workflow_definitions" (
	"guid" text PRIMARY KEY NOT NULL,
	"solution" text,
	"action_count" integer,
	"trigger_count" integer,
	"definition" jsonb
);
--> statement-breakpoint
CREATE INDEX "idx_workflow_definitions_solution" ON "workflow_definitions" USING btree ("solution");
