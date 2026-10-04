ALTER TABLE "domains" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ordered_domains AS (
	SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" DESC, "id") - 1 AS "sort_order"
	FROM "domains"
)
UPDATE "domains"
SET "sort_order" = ordered_domains."sort_order"
FROM ordered_domains
WHERE "domains"."id" = ordered_domains."id";