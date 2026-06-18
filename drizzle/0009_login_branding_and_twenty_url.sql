ALTER TABLE "application_setting"
  ADD COLUMN IF NOT EXISTS "login_background_url" text;

ALTER TABLE "application_setting"
  ADD COLUMN IF NOT EXISTS "twenty_auto_format_url" boolean DEFAULT true NOT NULL;
