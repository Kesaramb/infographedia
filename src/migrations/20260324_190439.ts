import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'enum_posts_render_engine'
    ) THEN
      CREATE TYPE "public"."enum_posts_render_engine" AS ENUM('dna-legacy', 'antv');
    END IF;
  END
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'enum_ai_agent_config_allowed_ant_v_template_categories'
    ) THEN
      CREATE TYPE "public"."enum_ai_agent_config_allowed_ant_v_template_categories" AS ENUM('list', 'sequence', 'compare', 'chart', 'hierarchy', 'relation');
    END IF;
  END
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'enum_ai_agent_config_allowed_ant_v_themes'
    ) THEN
      CREATE TYPE "public"."enum_ai_agent_config_allowed_ant_v_themes" AS ENUM('glass-dark', 'minimalist', 'editorial', 'ocean-depth', 'warm-earth', 'glass-light', 'neon-cyberpunk');
    END IF;
  END
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typnamespace = 'public'::regnamespace
        AND typname = 'enum_ai_agent_config_default_new_post_engine'
    ) THEN
      CREATE TYPE "public"."enum_ai_agent_config_default_new_post_engine" AS ENUM('dna-legacy', 'antv');
    END IF;
  END
  $$;

  CREATE TABLE IF NOT EXISTS "ai_agent_config_allowed_ant_v_template_categories" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ai_agent_config_allowed_ant_v_template_categories",
  	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "ai_agent_config_allowed_ant_v_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ai_agent_config_allowed_ant_v_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );

  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "render_engine" "enum_posts_render_engine" DEFAULT 'dna-legacy' NOT NULL;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "format_version" numeric DEFAULT 1 NOT NULL;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "document_v2" jsonb;
  ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_ant_v_generator" boolean DEFAULT false;
  ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_ant_v_preview" boolean DEFAULT false;
  ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "default_new_post_engine" "enum_ai_agent_config_default_new_post_engine" DEFAULT 'dna-legacy';

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ai_agent_config_allowed_ant_v_template_categories_parent_fk'
    ) THEN
      ALTER TABLE "ai_agent_config_allowed_ant_v_template_categories"
        ADD CONSTRAINT "ai_agent_config_allowed_ant_v_template_categories_parent_fk"
        FOREIGN KEY ("parent_id")
        REFERENCES "public"."ai_agent_config"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
  END
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ai_agent_config_allowed_ant_v_themes_parent_fk'
    ) THEN
      ALTER TABLE "ai_agent_config_allowed_ant_v_themes"
        ADD CONSTRAINT "ai_agent_config_allowed_ant_v_themes_parent_fk"
        FOREIGN KEY ("parent_id")
        REFERENCES "public"."ai_agent_config"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
  END
  $$;

  CREATE INDEX IF NOT EXISTS "ai_agent_config_allowed_ant_v_template_categories_order_idx" ON "ai_agent_config_allowed_ant_v_template_categories" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "ai_agent_config_allowed_ant_v_template_categories_parent_idx" ON "ai_agent_config_allowed_ant_v_template_categories" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "ai_agent_config_allowed_ant_v_themes_order_idx" ON "ai_agent_config_allowed_ant_v_themes" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "ai_agent_config_allowed_ant_v_themes_parent_idx" ON "ai_agent_config_allowed_ant_v_themes" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "ai_agent_config_allowed_ant_v_template_categories" CASCADE;
  DROP TABLE IF EXISTS "ai_agent_config_allowed_ant_v_themes" CASCADE;
  ALTER TABLE "posts" DROP COLUMN IF EXISTS "render_engine";
  ALTER TABLE "posts" DROP COLUMN IF EXISTS "format_version";
  ALTER TABLE "posts" DROP COLUMN IF EXISTS "document_v2";
  ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_ant_v_generator";
  ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_ant_v_preview";
  ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "default_new_post_engine";
  DROP TYPE IF EXISTS "public"."enum_posts_render_engine";
  DROP TYPE IF EXISTS "public"."enum_ai_agent_config_allowed_ant_v_template_categories";
  DROP TYPE IF EXISTS "public"."enum_ai_agent_config_allowed_ant_v_themes";
  DROP TYPE IF EXISTS "public"."enum_ai_agent_config_default_new_post_engine";`)
}
