CREATE INDEX "domains_order_idx" ON "domains" USING btree ("sort_order","created_at");--> statement-breakpoint
CREATE INDEX "tasks_date_created_idx" ON "tasks" USING btree ("date","created_at");--> statement-breakpoint
CREATE INDEX "tasks_status_created_idx" ON "tasks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_domain_id_idx" ON "tasks" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "tasks_escalation_idx" ON "tasks" USING btree ("rollforward_count") WHERE "rollforward_count" >= 3 and "status" <> 'done';