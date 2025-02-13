ALTER TABLE "user" ADD COLUMN "unconfirmed_email" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_unconfirmed_email_unique" UNIQUE("unconfirmed_email");