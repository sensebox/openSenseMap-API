CREATE TABLE IF NOT EXISTS "access_token" (
	"device_id" text NOT NULL,
	"token" text
);
--> statement-breakpoint
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_user_id_unique";--> statement-breakpoint
ALTER TABLE "password" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "password" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "access_token" ADD CONSTRAINT "access_token_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
