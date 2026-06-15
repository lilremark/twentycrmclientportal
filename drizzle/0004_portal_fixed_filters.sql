ALTER TABLE "portal_view" ADD COLUMN "fixed_filters" jsonb DEFAULT '[]'::jsonb NOT NULL;
