import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_posts_render_engine" ADD VALUE IF NOT EXISTS 'story-v3';
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "story_document" jsonb;
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_story_pipeline_v3" boolean DEFAULT true;
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_legacy_read_adapter" boolean DEFAULT true;
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_insight_miner" boolean DEFAULT true;
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_critic" boolean DEFAULT true;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "story_document";
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_story_pipeline_v3";
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_legacy_read_adapter";
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_insight_miner";
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_critic";
  `)
}
