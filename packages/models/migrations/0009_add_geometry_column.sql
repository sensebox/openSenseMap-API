ALTER TABLE "device" ADD COLUMN "location" geometry(point) NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spatial_index" ON "device" USING gist ("location");