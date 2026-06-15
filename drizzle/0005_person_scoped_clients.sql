DROP INDEX IF EXISTS "client_account_company_unique";--> statement-breakpoint
ALTER TABLE "client_account" RENAME COLUMN "twenty_company_id" TO "twenty_person_id";--> statement-breakpoint
CREATE UNIQUE INDEX "client_account_person_unique" ON "client_account" USING btree ("twenty_person_id");--> statement-breakpoint
UPDATE "portal_view"
SET "scope_mode" = 'all',
    "scope_field_name" = '',
    "updated_at" = now()
WHERE "scope_mode" = 'company';
