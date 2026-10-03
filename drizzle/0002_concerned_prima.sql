ALTER TABLE "domains" ADD COLUMN "glyph" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "allow_elastic" boolean DEFAULT true NOT NULL;