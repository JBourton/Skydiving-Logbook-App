CREATE TYPE "public"."equipment_kind" AS ENUM('container', 'main_canopy', 'reserve_canopy', 'aad', 'altimeter', 'helmet', 'audible', 'jumpsuit', 'goggles', 'other');--> statement-breakpoint
CREATE TYPE "public"."photo_kind" AS ENUM('logbook_page', 'jump_action', 'gear', 'other');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('progression', 'discipline', 'event_type', 'role', 'custom');--> statement-breakpoint
CREATE TABLE "drop_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"iata_code" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "equipment_kind" NOT NULL,
	"make" text,
	"model" text,
	"serial_number" text,
	"size_ft2" integer,
	"purchase_date" timestamp with time zone,
	"purchase_price_pence" integer,
	"retired_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jump_equipment" (
	"jump_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jump_equipment_jump_id_equipment_id_pk" PRIMARY KEY("jump_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "jump_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jump_id" uuid NOT NULL,
	"partner_user_id" uuid,
	"partner_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jump_partners_identity_check" CHECK ("jump_partners"."partner_user_id" IS NOT NULL OR "jump_partners"."partner_name" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "jump_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jump_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"kind" "photo_kind" NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jump_photos_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
CREATE TABLE "jump_tags" (
	"jump_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jump_tags_jump_id_tag_id_pk" PRIMARY KEY("jump_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "jumps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"jump_number" integer NOT NULL,
	"date" date NOT NULL,
	"drop_zone_id" uuid,
	"aircraft" text,
	"exit_altitude_ft" integer,
	"deploy_altitude_ft" integer,
	"delay_seconds" integer,
	"canopy_size_ft2" integer,
	"description" text,
	"authoriser" text,
	"ocr_source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "jumps_user_number_unique" UNIQUE("user_id","jump_number")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "tag_category" DEFAULT 'custom' NOT NULL,
	"canonical_key" text,
	"colour" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"entra_object_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_entra_object_id_unique" UNIQUE("entra_object_id")
);
--> statement-breakpoint
ALTER TABLE "drop_zones" ADD CONSTRAINT "drop_zones_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_equipment" ADD CONSTRAINT "jump_equipment_jump_id_jumps_id_fk" FOREIGN KEY ("jump_id") REFERENCES "public"."jumps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_equipment" ADD CONSTRAINT "jump_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_partners" ADD CONSTRAINT "jump_partners_jump_id_jumps_id_fk" FOREIGN KEY ("jump_id") REFERENCES "public"."jumps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_partners" ADD CONSTRAINT "jump_partners_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_photos" ADD CONSTRAINT "jump_photos_jump_id_jumps_id_fk" FOREIGN KEY ("jump_id") REFERENCES "public"."jumps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_photos" ADD CONSTRAINT "jump_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_tags" ADD CONSTRAINT "jump_tags_jump_id_jumps_id_fk" FOREIGN KEY ("jump_id") REFERENCES "public"."jumps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_tags" ADD CONSTRAINT "jump_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jumps" ADD CONSTRAINT "jumps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jumps" ADD CONSTRAINT "jumps_drop_zone_id_drop_zones_id_fk" FOREIGN KEY ("drop_zone_id") REFERENCES "public"."drop_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jumps_user_date_idx" ON "jumps" USING btree ("user_id","date");