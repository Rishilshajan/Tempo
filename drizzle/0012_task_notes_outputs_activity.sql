CREATE TABLE "task_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"task_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"output_type" text DEFAULT 'other' NOT NULL,
	"reference_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_outputs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_notes" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD CONSTRAINT "task_outputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD CONSTRAINT "task_outputs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_activity_task_created_idx" ON "task_activity" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_outputs_task_created_idx" ON "task_outputs" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE POLICY "task_activity_owner" ON "task_activity" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "task_outputs_owner" ON "task_outputs" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);