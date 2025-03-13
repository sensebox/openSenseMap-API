DO $$ BEGIN
 ALTER TABLE "sensor" ADD CONSTRAINT "sensor_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
