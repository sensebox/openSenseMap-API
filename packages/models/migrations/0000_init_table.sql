DO $$ BEGIN
 CREATE TYPE "public"."model" AS ENUM('HOME_V2_LORA');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."exposure" AS ENUM('indoor', 'outdoor', 'mobile', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."status" AS ENUM('active', 'inactive', 'old');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"description" text,
	"link" text,
	"use_auth" boolean,
	"exposure" "exposure",
	"status" "status" DEFAULT 'inactive',
	"model" "model",
	"public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"user_id" text NOT NULL,
	"sensor_wiki_model" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "measurement" (
	"sensor_id" text NOT NULL,
	"time" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"value" double precision,
	CONSTRAINT "measurement_sensor_id_time_unique" UNIQUE("sensor_id","time")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password" (
	"hash" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_image" (
	"id" text PRIMARY KEY NOT NULL,
	"alt_text" text,
	"content_type" text NOT NULL,
	"blob" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"profile_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"public" boolean DEFAULT false,
	"user_id" text,
	CONSTRAINT "profile_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sensor" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"unit" text,
	"sensor_type" text,
	"status" "status" DEFAULT 'inactive',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"device_id" text NOT NULL,
	"sensor_wiki_type" text,
	"sensor_wiki_phenomenon" text,
	"sensor_wiki_unit" text,
	"lastMeasurement" json,
	"data" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user',
	"language" text DEFAULT 'en_US',
	"email_is_confirmed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password" ADD CONSTRAINT "password_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_image" ADD CONSTRAINT "profile_image_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
