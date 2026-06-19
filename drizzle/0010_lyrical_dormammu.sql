ALTER TABLE "application_setting"
  ADD COLUMN IF NOT EXISTS "invitation_email_subject" text;

ALTER TABLE "application_setting"
  ADD COLUMN IF NOT EXISTS "invitation_email_html" text;
