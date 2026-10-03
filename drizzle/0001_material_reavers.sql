ALTER TYPE "public"."importance" ADD VALUE 'medium' BEFORE 'flexible';--> statement-breakpoint
CREATE TABLE "task_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"duration_est_min" integer DEFAULT 15 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "focus_start" time DEFAULT '08:30' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "focus_end" time DEFAULT '11:30' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "elastic_cushion_min" integer DEFAULT 45 NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "morning_bias" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_start" time;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_end" time;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_elastic" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "task_milestones" ADD CONSTRAINT "task_milestones_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dependencies_pair_unique" ON "dependencies" USING btree ("blocks_task_id","depends_on_task_id");