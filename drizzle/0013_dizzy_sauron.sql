CREATE TABLE "portal_saved_view" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"portal_view_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_field" text,
	"sort_direction" text DEFAULT 'asc' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_saved_view" ADD CONSTRAINT "portal_saved_view_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_saved_view" ADD CONSTRAINT "portal_saved_view_portal_view_id_portal_view_id_fk" FOREIGN KEY ("portal_view_id") REFERENCES "public"."portal_view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_saved_view_user_portal_name_unique" ON "portal_saved_view" USING btree ("user_id","portal_view_id","name");--> statement-breakpoint
CREATE INDEX "portal_saved_view_user_portal_idx" ON "portal_saved_view" USING btree ("user_id","portal_view_id","updated_at");