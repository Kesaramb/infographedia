import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_usage" AS ENUM('evidence', 'context');
  CREATE TYPE "public"."enum_ai_agent_config_allowed_layout_families" AS ENUM('editorial-cover', 'spotlight-rail', 'evidence-board', 'briefing-sheet');
  CREATE TABLE "ai_agent_config_allowed_layout_families" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ai_agent_config_allowed_layout_families",
  	"id" serial PRIMARY KEY NOT NULL
  );

  ALTER TABLE "media" ADD COLUMN "source_url" varchar;
  ALTER TABLE "media" ADD COLUMN "source_name" varchar;
  ALTER TABLE "media" ADD COLUMN "accessed_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "usage" "enum_media_usage";
  ALTER TABLE "media" ADD COLUMN "relevance" varchar;
  ALTER TABLE "media" ADD COLUMN "license" varchar;
  ALTER TABLE "ai_agent_config" ADD COLUMN "enable_diversity_planner" boolean DEFAULT true;
  ALTER TABLE "ai_agent_config" ADD COLUMN "enable_grounded_media" boolean DEFAULT true;
  ALTER TABLE "ai_agent_config_allowed_layout_families" ADD CONSTRAINT "ai_agent_config_allowed_layout_families_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ai_agent_config"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ai_agent_config_allowed_layout_families_order_idx" ON "ai_agent_config_allowed_layout_families" USING btree ("order");
  CREATE INDEX "ai_agent_config_allowed_layout_families_parent_idx" ON "ai_agent_config_allowed_layout_families" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ai_agent_config_allowed_layout_families" CASCADE;
  ALTER TABLE "media" DROP COLUMN "source_url";
  ALTER TABLE "media" DROP COLUMN "source_name";
  ALTER TABLE "media" DROP COLUMN "accessed_at";
  ALTER TABLE "media" DROP COLUMN "usage";
  ALTER TABLE "media" DROP COLUMN "relevance";
  ALTER TABLE "media" DROP COLUMN "license";
  ALTER TABLE "ai_agent_config" DROP COLUMN "enable_diversity_planner";
  ALTER TABLE "ai_agent_config" DROP COLUMN "enable_grounded_media";
  DROP TYPE "public"."enum_media_usage";
  DROP TYPE "public"."enum_ai_agent_config_allowed_layout_families";`)
}
