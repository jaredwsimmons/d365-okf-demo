-- process_diagrams was added to the schema but never made it into a migration
-- (was only ever applied via `db:push` in dev). Adding it here for prod parity.
CREATE TABLE IF NOT EXISTS "process_diagrams" (
	"code" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"modified_at" timestamp DEFAULT now(),
	"modified_by" text
);
--> statement-breakpoint
CREATE TABLE "bpc_diagrams" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_bpc_diagrams_code" ON "bpc_diagrams" USING btree ("code");
