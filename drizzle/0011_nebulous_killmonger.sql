ALTER TABLE "application_setting" ADD COLUMN "google_oauth_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "google_oauth_client_id" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "google_oauth_client_secret" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "google_oauth_hosted_domain" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_name" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_client_id" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_client_secret" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_discovery_url" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_authorization_url" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_token_url" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_user_info_url" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_issuer" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_scopes" text;--> statement-breakpoint
ALTER TABLE "application_setting" ADD COLUMN "custom_oauth_pkce" boolean DEFAULT true NOT NULL;