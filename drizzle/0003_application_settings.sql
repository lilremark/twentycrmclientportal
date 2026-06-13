CREATE TABLE "application_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_name" text NOT NULL,
	"brand_logo_url" text,
	"primary_color" text NOT NULL,
	"portal_title" text NOT NULL,
	"portal_description" text NOT NULL,
	"support_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
