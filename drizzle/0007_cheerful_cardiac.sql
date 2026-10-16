ALTER TABLE "task_milestones" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "task_milestones" ADD COLUMN "date" date;--> statement-breakpoint
ALTER TABLE "task_milestones" ADD COLUMN "scheduled_time" time;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;