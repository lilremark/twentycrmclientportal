ALTER TABLE "portal_view" ADD COLUMN "scope_mode" text DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_view" ADD COLUMN "allowed_record_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "portal_view_object_unique";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "portal_view_id" uuid;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_portal_view_id_portal_view_id_fk" FOREIGN KEY ("portal_view_id") REFERENCES "public"."portal_view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "portal_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"portal_view_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access" ADD CONSTRAINT "portal_access_portal_view_id_portal_view_id_fk" FOREIGN KEY ("portal_view_id") REFERENCES "public"."portal_view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_access_user_view_unique" ON "portal_access" USING btree ("user_id","portal_view_id");--> statement-breakpoint
CREATE INDEX "portal_access_view_idx" ON "portal_access" USING btree ("portal_view_id");
