ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "twenty_base_url" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "twenty_api_key" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "twenty_webhook_secret" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_host" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_secure" boolean;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_user" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_password" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN IF NOT EXISTS "smtp_from" text;
