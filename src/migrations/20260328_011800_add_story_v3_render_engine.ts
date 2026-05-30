import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_posts_render_engine" ADD VALUE IF NOT EXISTS 'story-v3';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      RAISE NOTICE 'enum_posts_render_engine value story-v3 is retained on down migration';
    END $$;
  `)
}
