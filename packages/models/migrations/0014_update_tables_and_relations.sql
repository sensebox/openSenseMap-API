CREATE TABLE IF NOT EXISTS "location" (
	"id" serial PRIMARY KEY NOT NULL,
	"location" geometry(point) NOT NULL,
	CONSTRAINT "location_location_unique" UNIQUE("location")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_to_location" (
	"device_id" text NOT NULL,
	"location_id" integer NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_to_location_device_id_location_id_time_pk" PRIMARY KEY("device_id","location_id","time"),
	CONSTRAINT "device_to_location_device_id_location_id_time_unique" UNIQUE("device_id","location_id","time")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"device_id" text NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "spatial_index";--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "expires_at" date;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "location_index" ON "location" USING gist ("location");--> statement-breakpoint
ALTER TABLE "device" DROP COLUMN IF EXISTS "location";