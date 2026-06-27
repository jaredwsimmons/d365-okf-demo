DROP TABLE "environment_drift" CASCADE;--> statement-breakpoint
CREATE TABLE "environment_snapshots" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"generated_at" timestamp,
	"loaded_at" timestamp DEFAULT now()
);
