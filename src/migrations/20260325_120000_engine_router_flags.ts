import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_engine_router" boolean DEFAULT true;
    ALTER TABLE "ai_agent_config" ADD COLUMN IF NOT EXISTS "enable_multi_panel_ant_v" boolean DEFAULT true;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_engine_router";
    ALTER TABLE "ai_agent_config" DROP COLUMN IF EXISTS "enable_multi_panel_ant_v";
  `)
}
